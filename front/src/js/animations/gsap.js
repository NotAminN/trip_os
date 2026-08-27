import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { loadState } from '../utils/storage.js'

gsap.registerPlugin(ScrollTrigger)
gsap.defaults({ ease: 'power3.out', duration: 0.65 })

const motionQuery =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)')

let motionOverride = null

export const prefersReducedMotion = () =>
  motionOverride !== null ? motionOverride : Boolean(motionQuery && motionQuery.matches)

export function setMotionPreference(reduced) {
  motionOverride = reduced === null ? null : Boolean(reduced)
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('no-motion', prefersReducedMotion())
  }
}

export function applySavedMotionPreference() {
  const saved = loadState('motion-reduced', null)
  if (saved !== null) {
    setMotionPreference(saved)
    return saved
  }
  return prefersReducedMotion()
}

export function initGsap() {
  ScrollTrigger.config({ ignoreMobileResize: true })
  return gsap
}

const REVEAL_FROM = {
  'fade-in': { autoAlpha: 0 },
  'fade-up': { autoAlpha: 0, y: 28 },
  'fade-down': { autoAlpha: 0, y: -28 },
  'slide-start': { autoAlpha: 0, x: 40 },
  'slide-end': { autoAlpha: 0, x: -40 },
  'scale-in': { autoAlpha: 0, scale: 0.92 },
}

export function revealAll(root = document) {
  const targets = root.querySelectorAll('[data-animate]')
  if (!targets.length) return

  if (prefersReducedMotion()) {
    gsap.set(targets, { clearProps: 'transform', autoAlpha: 1 })
    return
  }

  targets.forEach((el) => {
    const kind = REVEAL_FROM[el.dataset.animate] ? el.dataset.animate : 'fade-up'
    const duration = parseFloat(el.dataset.duration || '0.8')
    const delay = parseFloat(el.dataset.delay || '0')
    const scrollTrigger = el.hasAttribute('data-no-scroll')
      ? undefined
      : { trigger: el, start: 'top 88%', once: true }

    gsap.fromTo(el, REVEAL_FROM[kind], {
      autoAlpha: 1,
      x: 0,
      y: 0,
      scale: 1,
      duration,
      delay,
      scrollTrigger,
    })
  })
}

export function fadeIn(target, vars = {}) {
  return gsap.fromTo(target, { autoAlpha: 0 }, { autoAlpha: 1, ...vars })
}

export function slideIn(target, { from = 'end', distance = 40, ...vars } = {}) {
  const x = from === 'start' ? distance : -distance
  return gsap.fromTo(target, { autoAlpha: 0, x }, { autoAlpha: 1, x: 0, ...vars })
}

export function scaleIn(target, vars = {}) {
  return gsap.fromTo(target, { autoAlpha: 0, scale: 0.92 }, { autoAlpha: 1, scale: 1, ...vars })
}

export function staggerReveal(targets, { kind = 'fade-up', amount = 0.08, ...vars } = {}) {
  const list = Array.from(targets)
  if (!list.length) return undefined
  if (prefersReducedMotion()) return gsap.set(list, { autoAlpha: 1 })
  return gsap.fromTo(list, { ...REVEAL_FROM[kind] }, {
    autoAlpha: 1,
    x: 0,
    y: 0,
    scale: 1,
    stagger: amount,
    ...vars,
  })
}

export { gsap, ScrollTrigger }
