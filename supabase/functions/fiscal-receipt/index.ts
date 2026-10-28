// Fetches a Serbian fiscal receipt from the tax office's verification site for the app.
// Browsers cannot read suf.purs.gov.rs directly (it sends no CORS headers), so this function
// does it: it takes the link from the receipt's QR code, loads the verification page, asks the
// site for the receipt items and returns both unread. The app reads them in src/lib/receipt.ts.
//
// POST { url: "https://suf.purs.gov.rs/v/?vl=..." }
//   200 { html, specifications }   specifications is null when the items request failed
//   400 { error: "invalid_receipt_url" }
//   401 { error: "not_authenticated" }
//   404 { error: "receipt_not_found" }
//   502 { error: "receipt_site_unavailable" }
import { createClient } from 'npm:@supabase/supabase-js@2.118.0'

const HOST = 'suf.purs.gov.rs'
const TIMEOUT_MS = 10_000
const MAX_PAGE_BYTES = 2_000_000

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// The site answers browsers only, so the requests look like one.
const browserHeaders = {
  'User-Agent':
    'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36',
  'Accept-Language': 'sr-RS,sr;q=0.9',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/** Only https://suf.purs.gov.rs/v/?vl=… links; the URL is rebuilt so nothing else gets through. */
function receiptUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2000) return null
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' || url.hostname !== HOST || !/^\/v\/?$/.test(url.pathname)) return null
  const vl = url.search.match(/[?&]vl=([^&#]+)/)?.[1]
  if (!vl || !/^[A-Za-z0-9%+/=_-]+$/.test(vl)) return null
  return `https://${HOST}/v/?vl=${vl}`
}

async function isSignedIn(request: Request): Promise<boolean> {
  const authorization = request.headers.get('Authorization')
  if (!authorization) return false
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  })
  const { data, error } = await supabase.auth.getUser()
  return !error && data.user !== null
}

/** `name=value` pairs of the page's cookies; the items request needs the same session. */
function cookiesOf(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .join('; ')
}

class NotFound extends Error {}

async function fetchReceipt(url: string): Promise<{ html: string; specifications: unknown }> {
  const page = await fetch(url, {
    headers: { ...browserHeaders, Accept: 'text/html,application/xhtml+xml' },
    redirect: 'manual',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (page.status >= 500) throw new Error(`page ${page.status}`)
  if (page.status !== 200) throw new NotFound()
  const html = await page.text()
  if (html.length > MAX_PAGE_BYTES) throw new Error('page too large')

  const invoiceNumber = html.match(/viewModel\.InvoiceNumber\('([^']+)'\)/)?.[1]
  const token = html.match(/viewModel\.Token\('([^']+)'\)/)?.[1]
  if (!invoiceNumber) throw new NotFound()
  if (!token) return { html, specifications: null }

  let specifications: unknown = null
  try {
    const items = await fetch(`https://${HOST}/specifications`, {
      method: 'POST',
      headers: {
        ...browserHeaders,
        Accept: 'application/json, */*',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        Origin: `https://${HOST}`,
        Referer: url,
        Cookie: cookiesOf(page),
      },
      body: new URLSearchParams({ invoiceNumber, token }),
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (items.ok) specifications = await items.json()
  } catch {
    // The app falls back to the items printed on the receipt.
  }
  return { html, specifications }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  if (!(await isSignedIn(request))) return json({ error: 'not_authenticated' }, 401)

  const body = await request.json().catch(() => null)
  const url = receiptUrl(body?.url)
  if (!url) return json({ error: 'invalid_receipt_url' }, 400)

  try {
    return json(await fetchReceipt(url))
  } catch (error) {
    if (error instanceof NotFound) return json({ error: 'receipt_not_found' }, 404)
    console.error('fiscal-receipt', error)
    return json({ error: 'receipt_site_unavailable' }, 502)
  }
})
