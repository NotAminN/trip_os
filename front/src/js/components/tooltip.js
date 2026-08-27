import { uid } from '../utils/helpers.js'

let tipEl = null
let currentTarget = null
let showTimer = null

function ensureTip() {
  if (tipEl && document.body.contains(tipEl)) return
  tipEl = document.createElement('div')
  tipEl.className = 'tooltip-tip'
  tipEl.setAttribute('role', 'tooltip')
  tipEl.id = uid('tooltip')
  document.body.appendChild(tipEl)
}

function position(target) {
  const rect = target.getBoundingClientRect()
  const tipRect = tipEl.getBoundingClientRect()
  const margin = 8

  let left = rect.left + rect.width / 2 - tipRect.width / 2
  left = Math.min(Math.max(left, margin), window.innerWidth - tipRect.width - margin)

  let top = rect.top - tipRect.height - 10
  tipEl.classList.remove('is-below')

  if (top < margin) {
    top = rect.bottom + 10
    tipEl.classList.add('is-below')
  }

  tipEl.style.left = `${left}px`
  tipEl.style.top = `${top}px`
}

function show(target) {
  const text = target.getAttribute('data-tooltip')
  if (!text) return
  ensureTip()
  currentTarget = target
  tipEl.textContent = text
  target.setAttribute('aria-describedby', tipEl.id)
  position(target)
  tipEl.classList.add('is-visible')
}

function hide() {
  clearTimeout(showTimer)
  if (currentTarget) currentTarget.removeAttribute('aria-describedby')
  currentTarget = null
  if (tipEl) tipEl.classList.remove('is-visible')
}

export function initTooltips(scope = document) {
  scope.addEventListener(
    'mouseenter',
    (event) => {
      const target = event.target.closest?.('[data-tooltip]')
      if (!target) return
      clearTimeout(showTimer)
      showTimer = setTimeout(() => show(target), 160)
    },
    true,
  )

  scope.addEventListener(
    'mouseleave',
    (event) => {
      if (event.target.closest?.('[data-tooltip]')) hide()
    },
    true,
  )

  scope.addEventListener('focusin', (event) => {
    const target = event.target.closest?.('[data-tooltip]')
    if (target) show(target)
  })

  scope.addEventListener('focusout', (event) => {
    if (event.target.closest?.('[data-tooltip]')) hide()
  })

  scope.addEventListener(
    'scroll',
    () => {
      if (currentTarget) hide()
    },
    { passive: true, capture: true },
  )

  scope.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && currentTarget) hide()
  })
}
