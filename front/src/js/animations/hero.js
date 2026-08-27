import { gsap, prefersReducedMotion } from './gsap.js'
import { qs, qsa, clamp } from '../utils/helpers.js'

function setupMapZoom(scope) {
  const zoomable = qs('[data-map-zoomable]', scope)
  if (!zoomable) return

  let level = 1
  const apply = () => gsap.to(zoomable, { scale: level, duration: 0.35, ease: 'power2.out' })

  qsa('[data-map-zoom]', scope).forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.mapZoom
      if (action === 'in') level = clamp(level + 0.2, 0.7, 1.6)
      else if (action === 'out') level = clamp(level - 0.2, 0.7, 1.6)
      else level = 1
      apply()
    })
  })
}

function prepareRoute(path) {
  const length = path.getTotalLength()
  return { length }
}

export function initHero() {
  const scope = qs('[data-hero]')
  if (!scope || scope.dataset.heroInit) return
  scope.dataset.heroInit = 'true'

  setupMapZoom(scope)

  const headerInner = qs('[data-navbar] > div')
  const eyebrow = qs('[data-hero-el="eyebrow"]', scope)
  const line1 = qs('[data-hero-el="line1"]', scope)
  const line2 = qs('[data-hero-el="line2"]', scope)
  const support = qs('[data-hero-el="support"]', scope)
  const ctas = qs('[data-hero-el="ctas"]', scope)
  const stats = qs('[data-hero-el="stats"]', scope)
  const preview = qs('[data-hero-el="preview"]', scope)
  const routePath = qs('.hero-route-draw', scope)
  const pins = qsa('.map-pin', scope)
  const chips = qsa('[data-tl-chip]', scope)
  const bars = qsa('[data-bar]', scope)
  const floats = qsa('[data-hero-float]', scope)

  if (prefersReducedMotion()) {
    bars.forEach((bar) => {
      bar.style.width = `${bar.dataset.bar || 0}%`
    })
    return
  }

  let routeLength = 0
  if (routePath) {
    routeLength = prepareRoute(routePath).length
    gsap.set(routePath, { strokeDasharray: routeLength, strokeDashoffset: routeLength })
  }

  gsap.set(headerInner, { autoAlpha: 0, y: -14 })
  gsap.set([eyebrow, line1, line2, support, ctas, stats], { autoAlpha: 0, y: 26 })
  gsap.set(preview, { autoAlpha: 0, y: 56, scale: 0.965 })
  gsap.set(pins, { autoAlpha: 0, scale: 0.3, transformOrigin: '50% 50%' })
  gsap.set(chips, { autoAlpha: 0, x: 18 })
  gsap.set(floats, { autoAlpha: 0, y: 16 })

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.15 })

  tl.to(headerInner, { autoAlpha: 1, y: 0, duration: 0.55 })
    .to(eyebrow, { autoAlpha: 1, y: 0, duration: 0.5 }, '-=0.35')
    .to(line1, { autoAlpha: 1, y: 0, duration: 0.65 }, '-=0.28')
    .to(line2, { autoAlpha: 1, y: 0, duration: 0.65 }, '-=0.42')
    .to(support, { autoAlpha: 1, y: 0, duration: 0.55 }, '-=0.38')
    .to(ctas, { autoAlpha: 1, y: 0, duration: 0.5 }, '-=0.32')
    .to(stats, { autoAlpha: 1, y: 0, duration: 0.5 }, '-=0.32')
    .to(preview, { autoAlpha: 1, y: 0, scale: 1, duration: 0.75 }, '-=0.45')

  if (routePath) {
    tl.to(
      routePath,
      { strokeDashoffset: 0, duration: 1.15, ease: 'power2.inOut' },
      '-=0.3',
    )
  }

  tl.to(pins, {
    autoAlpha: 1,
    scale: 1,
    stagger: 0.09,
    duration: 0.45,
    ease: 'back.out(2)',
  }, '-=0.7')
    .to(chips, { autoAlpha: 1, x: 0, stagger: 0.035, duration: 0.4 }, '-=0.85')

  bars.forEach((bar, i) => {
    tl.to(bar, { width: `${bar.dataset.bar}%`, duration: 0.8 }, i === 0 ? '-=0.7' : '-=0.62')
  })

  if (floats.length) {
    tl.to(floats, { autoAlpha: 1, y: 0, stagger: 0.14, duration: 0.5 }, '<0.15')
  }
}
