import { registerSW } from 'virtual:pwa-register'

/** How often an open app asks the server for a new version. */
const CHECK_EVERY_MS = 30 * 60 * 1000

/**
 * Registers the service worker. When a new version is deployed it is downloaded in the
 * background and the app reloads itself onto it, so a phone never stays on an old build.
 * An installed app is often only resumed, never reopened, so it also checks on every resume.
 */
export function registerPwa() {
  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const check = () => {
        if (navigator.onLine) registration.update().catch(() => {})
      }
      setInterval(check, CHECK_EVERY_MS)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
    },
  })
}
