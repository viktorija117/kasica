import { useLayoutEffect, useRef } from 'react'

/**
 * Shrinks a one-line block element's text until it fits its own width. `fontSize` is the CSS
 * size to start from; the element must be `display: block` with `white-space: nowrap`.
 *
 * The real width is measured, so it also works when the phone draws text wider than expected
 * (another font, or the system "larger text" setting).
 */
export function useFitText<T extends HTMLElement>(fontSize: string) {
  const ref = useRef<T>(null)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element || typeof ResizeObserver === 'undefined') return

    const fit = () => {
      element.style.fontSize = fontSize
      const { clientWidth, scrollWidth } = element
      if (clientWidth > 0 && scrollWidth > clientWidth) {
        // A little extra margin so rounding never leaves the last pixel cut off.
        element.style.fontSize = `calc(${fontSize} * ${((clientWidth / scrollWidth) * 0.98).toFixed(3)})`
      }
    }

    fit()
    // Changing the font size never changes the element's width, so this cannot loop.
    const observer = new ResizeObserver(fit)
    observer.observe(element)
    return () => observer.disconnect()
  }, [fontSize])

  return ref
}
