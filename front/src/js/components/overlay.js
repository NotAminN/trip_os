import { gsap, prefersReducedMotion } from '../animations/gsap.js'
import { getLenis } from '../animations/scroll.js'
import { trapFocus, focusFirstIn } from '../utils/focus.js'

let lockCount = 0

function lockScroll() {
  lockCount += 1
  const lenis = getLenis()
  if (lenis) {
    lenis.stop()
  }
  document.documentElement.style.overflow = 'hidden'
}

function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount > 0) return
  const lenis = getLenis()
  if (lenis) lenis.start()
  document.documentElement.style.overflow = ''
}

export function createOverlayController({ wrap, panel, animateIn, animateOut, onClosed }) {
  const backdrop = wrap.querySelector('[data-overlay-backdrop]')
  let opener = null
  let isOpen = false
  let closing = false

  function onKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      api.requestClose()
      return
    }
    if (event.key === 'Tab') trapFocus(panel, event)
  }

  function onBackdropPointerdown(event) {
    if (!event.target.closest('[data-overlay-panel]')) api.requestClose()
  }

  const api = {
    get isOpen() {
      return isOpen
    },
    panel,

    async open(trigger = null) {
      if (isOpen || closing) return
      isOpen = true
      opener = trigger instanceof HTMLElement ? trigger : document.activeElement
      wrap.classList.add('is-open')
      lockScroll()
      document.addEventListener('keydown', onKeydown, true)
      backdrop.addEventListener('pointerdown', onBackdropPointerdown)

      if (prefersReducedMotion()) {
        gsap.set([backdrop, panel], { autoAlpha: 1 })
      } else {
        await animateIn(backdrop, panel)
        gsap.set(panel, { clearProps: 'transform' })
      }
      focusFirstIn(panel)
    },

    async requestClose() {
      if (!isOpen || closing) return
      closing = true
      document.removeEventListener('keydown', onKeydown, true)
      backdrop.removeEventListener('pointerdown', onBackdropPointerdown)

      if (!prefersReducedMotion()) {
        await animateOut(backdrop, panel)
      }

      wrap.classList.remove('is-open')
      gsap.set([backdrop, panel], { clearProps: 'all' })
      unlockScroll()
      isOpen = false
      closing = false

      if (opener && typeof opener.focus === 'function') opener.focus()
      opener = null
      if (typeof onClosed === 'function') onClosed()
    },

    destroy() {
      if (isOpen) {
        document.removeEventListener('keydown', onKeydown, true)
        backdrop.removeEventListener('pointerdown', onBackdropPointerdown)
        wrap.classList.remove('is-open')
        unlockScroll()
        isOpen = false
      }
      wrap.remove()
    },
  }

  return api
}

export function centerAnimations() {
  const animateIn = (backdrop, panel) =>
    new Promise((resolve) => {
      const tl = gsap.timeline({ onComplete: resolve })
      tl.fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.28 })
      tl.fromTo(
        panel,
        { autoAlpha: 0, y: 24, scale: 0.96 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.38, ease: 'power3.out' },
        '<0.05',
      )
    })

  const animateOut = (backdrop, panel) =>
    new Promise((resolve) => {
      const tl = gsap.timeline({ onComplete: resolve })
      tl.to(panel, { autoAlpha: 0, y: 14, scale: 0.97, duration: 0.22 })
      tl.to(backdrop, { autoAlpha: 0, duration: 0.26 }, '<0.04')
    })

  return { animateIn, animateOut }
}

export function slideAnimations(side) {
  const fromX = side === 'start' ? 90 : -90

  const animateIn = (backdrop, panel) =>
    new Promise((resolve) => {
      const tl = gsap.timeline({ onComplete: resolve })
      tl.fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.28 })
      tl.fromTo(
        panel,
        { autoAlpha: 0, x: fromX },
        { autoAlpha: 1, x: 0, duration: 0.42, ease: 'power3.out' },
        '<',
      )
    })

  const animateOut = (backdrop, panel) =>
    new Promise((resolve) => {
      const tl = gsap.timeline({ onComplete: resolve })
      tl.to(panel, { autoAlpha: 0, x: fromX * 0.6, duration: 0.26 })
      tl.to(backdrop, { autoAlpha: 0, duration: 0.26 }, '<0.05')
    })

  return { animateIn, animateOut }
}
