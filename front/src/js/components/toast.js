import { gsap, prefersReducedMotion } from '../animations/gsap.js'
import { uid } from '../utils/helpers.js'

const ICONS = {
  success:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.4 2.4 4.6-5.3"/></svg>',
  info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r="1.2" fill="currentColor" stroke="none"/></svg>',
  warning:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4L2.8 19.5h18.4L12 4z"/><path d="M12 10v4.2"/><circle cx="12" cy="17" r="1.1" fill="currentColor" stroke="none"/></svg>',
  danger:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6"/></svg>',
}

const CLOSE_ICON =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'

let region = null

function ensureRegion() {
  if (region && document.body.contains(region)) return
  region = document.createElement('div')
  region.className = 'toast-region'
  region.setAttribute('role', 'status')
  region.setAttribute('aria-live', 'polite')
  document.body.appendChild(region)
}

export function showToast(message, { type = 'info', duration = 4200 } = {}) {
  ensureRegion()

  const item = document.createElement('div')
  item.className = `toast-item toast-${type}`
  item.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${ICONS[type] || ICONS.info}</span>
    <p class="toast-msg"></p>
    <button type="button" class="icon-btn icon-btn-sm toast-close" aria-label="بستن اعلان">${CLOSE_ICON}</button>
  `
  item.querySelector('.toast-msg').textContent = message
  region.appendChild(item)

  while (region.children.length > 4) {
    region.firstElementChild.remove()
  }

  let timer = null
  let dismissed = false

  const dismiss = () => {
    if (dismissed) return
    dismissed = true
    clearTimeout(timer)
    if (prefersReducedMotion()) {
      item.remove()
      return
    }
    gsap.to(item, {
      autoAlpha: 0,
      y: 10,
      duration: 0.22,
      ease: 'power2.in',
      onComplete: () => item.remove(),
    })
  }

  item.querySelector('.toast-close').addEventListener('click', dismiss)
  item.addEventListener('mouseenter', () => clearTimeout(timer))
  item.addEventListener('mouseleave', () => {
    clearTimeout(timer)
    timer = setTimeout(dismiss, 1800)
  })
  timer = setTimeout(dismiss, duration)

  if (!prefersReducedMotion()) {
    gsap.fromTo(item, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power3.out' })
  }

  return { dismiss }
}

export const toast = {
  success: (message, options) => showToast(message, { ...options, type: 'success' }),
  info: (message, options) => showToast(message, { ...options, type: 'info' }),
  warning: (message, options) => showToast(message, { ...options, type: 'warning' }),
  error: (message, options) => showToast(message, { ...options, type: 'danger' }),
}

export { uid }
