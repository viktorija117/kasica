// Fetches a Serbian fiscal receipt from the tax office's verification site for the app.
// Browsers cannot read suf.purs.gov.rs directly (it sends no CORS headers), so this function
// does it: it takes the link from the receipt's QR code, loads the verification page, asks the
// site for the receipt items and returns both unread. The app reads them in src/lib/receipt.ts.
//
// POST { url: "https://suf.purs.gov.rs/v/?vl=..." }
//   200 { html, specifications }   specifications is null when the items request failed
// POST { warm: true }
//   200 { ok: true }   sent when the scanner opens, so the function is already running when
//                      the QR code is read; only the token claims are checked
//   400 { error: "invalid_receipt_url" }
//   401 { error: "not_authenticated" }
//   404 { error: "receipt_not_found" }
//   502 { error: "receipt_site_unavailable" }
const HOST = 'suf.purs.gov.rs'
const TIMEOUT_MS = 10_000
const MAX_PAGE_BYTES = 2_000_000

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Expose-Headers': 'Server-Timing',
}

// The site answers browsers only, so the requests look like one.
const browserHeaders = {
  'User-Agent':
    'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36',
  'Accept-Language': 'sr-RS,sr;q=0.9',
}

function json(body: unknown, status = 200, timings: string[] = []): Response {
  const headers: Record<string, string> = { ...corsHeaders, 'Content-Type': 'application/json' }
  if (timings.length > 0) headers['Server-Timing'] = timings.join(', ')
  return new Response(JSON.stringify(body), { status, headers })
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

/**
 * Whether the token claims to be a signed-in user's and has not expired. The gateway has already
 * verified its signature (verify_jwt = true in supabase/config.toml), so this rejects the public
 * anon key at once, before anything is sent to the tax office site. It is not the full check:
 * `isSignedIn` still asks Supabase Auth before the receipt is handed out.
 */
function claimsSignedIn(request: Request): boolean {
  const token = request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
  const payload = token?.split('.')[1]
  if (!payload) return false
  try {
    const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as {
      role?: unknown
      exp?: unknown
    }
    return claims.role === 'authenticated' && typeof claims.exp === 'number' && claims.exp * 1000 > Date.now()
  } catch {
    return false
  }
}

/**
 * Asks Supabase Auth whether the caller's token belongs to a signed-in user. A plain request
 * instead of supabase-js keeps the function's cold start short.
 */
async function isSignedIn(request: Request): Promise<boolean> {
  const authorization = request.headers.get('Authorization')
  if (!authorization) return false
  try {
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/user`, {
      headers: { Authorization: authorization, apikey: Deno.env.get('SUPABASE_ANON_KEY')! },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    await response.body?.cancel()
    return response.ok
  } catch {
    return false
  }
}

/** How long each step took, for the browser's network panel (`Server-Timing`). */
function timed<T>(timings: string[], name: string, work: Promise<T>): Promise<T> {
  const start = performance.now()
  return work.finally(() => timings.push(`${name};dur=${Math.round(performance.now() - start)}`))
}

/** `name=value` pairs of the page's cookies; the items request needs the same session. */
function cookiesOf(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .join('; ')
}

class NotFound extends Error {}

async function fetchReceipt(url: string, timings: string[]): Promise<{ html: string; specifications: unknown }> {
  const page = await timed(timings, 'page', fetch(url, {
    headers: { ...browserHeaders, Accept: 'text/html,application/xhtml+xml' },
    redirect: 'manual',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }))
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
    const items = await timed(timings, 'items', fetch(`https://${HOST}/specifications`, {
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
    }))
    if (items.ok) specifications = await items.json()
  } catch {
    // The app falls back to the items printed on the receipt.
  }
  return { html, specifications }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  if (!claimsSignedIn(request)) return json({ error: 'not_authenticated' }, 401)

  const body = await request.json().catch(() => null)
  if (body?.warm === true) return json({ ok: true })

  const url = receiptUrl(body?.url)
  if (!url) return json({ error: 'invalid_receipt_url' }, 400)

  // The full sign-in check and the slow tax office site run at the same time; the receipt is
  // only handed out once the check has passed.
  const timings: string[] = []
  const signedIn = timed(timings, 'auth', isSignedIn(request))
  const receipt = fetchReceipt(url, timings).then(
    (value) => ({ value }),
    (error: unknown) => ({ error }),
  )
  if (!(await signedIn)) return json({ error: 'not_authenticated' }, 401, timings)

  const result = await receipt
  return 'value' in result ? json(result.value, 200, timings) : failure(result.error, timings)
})

function failure(error: unknown, timings: string[]): Response {
  if (error instanceof NotFound) return json({ error: 'receipt_not_found' }, 404, timings)
  console.error('fiscal-receipt', error)
  return json({ error: 'receipt_site_unavailable' }, 502, timings)
}
