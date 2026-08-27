const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export function getFocusableElements(root) {
  return Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute('aria-hidden') && el.offsetParent !== null,
  )
}

export function trapFocus(container, event) {
  const items = getFocusableElements(container)
  if (!items.length) return
  const first = items[0]
  const last = items[items.length - 1]

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

export function focusFirstIn(container) {
  const items = getFocusableElements(container)
  if (items.length) {
    items[0].focus()
    return true
  }
  if (container instanceof HTMLElement) {
    container.focus()
    return true
  }
  return false
}
