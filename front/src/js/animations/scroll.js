import Lenis from 'lenis'
import { gsap, ScrollTrigger, prefersReducedMotion } from './gsap.js'

let lenis = null

export function initSmoothScroll() {
  if (lenis || prefersReducedMotion()) return lenis

  lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - 2 ** (-10 * t)),
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 1.4,
  })

  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)

  return lenis
}

export function getLenis() {
  return lenis
}

export function scrollToSection(target, offset = 0) {
  if (lenis) {
    lenis.scrollTo(target, { offset, duration: 1 })
    return
  }
  const el = typeof target === 'string' ? document.querySelector(target) : target
  if (el && typeof el.scrollIntoView === 'function') {
    el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
  }
}
