export const qs = (selector, scope = document) => scope.querySelector(selector)

export const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector))

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export const uid = (prefix = 'id') =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export function debounce(fn, wait = 200) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), wait)
  }
}
