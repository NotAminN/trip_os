import { gsap, prefersReducedMotion } from '../animations/gsap.js'
import { toPersianDigits } from '../utils/formatters.js'

/**
 * segments: [{ value, color, label }]
 */
export function createDonutChart({
  segments = [],
  centerTitle = '',
  centerSub = '',
  size = 160,
} = {}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1
  const stroke = Math.max(12, size * 0.115)
  const r = 50 - stroke / 4.6

  const el = document.createElement('div')
  el.className = 'relative inline-grid shrink-0 place-items-center'
  el.style.width = `${size}px`
  el.style.height = `${size}px`

  const circles = segments
    .map((seg, i) => {
      let offset = 0
      for (let j = 0; j < i; j += 1) offset += (segments[j].value / total) * 100
      return `<circle cx="50" cy="50" r="${r}" fill="none" stroke="${seg.color}" stroke-width="${stroke / 1.55}" pathLength="100" data-seg-index="${i}" stroke-dashoffset="${-offset}" aria-label="${seg.label}"/>`
    })
    .join('')

  el.innerHTML = `
    <svg viewBox="0 0 100 100" class="absolute inset-0 -rotate-90" role="img" aria-label="نمودار دایره‌ای">
      <circle cx="50" cy="50" r="${r}" fill="none" stroke="#EFF6FF" stroke-width="${stroke / 1.55}"/>
      <g>${circles}</g>
    </svg>
    <div class="relative text-center leading-tight">
      <b class="block text-lg font-extrabold text-deep">${centerTitle}</b>
      <span class="block text-[11px] text-slate">${centerSub}</span>
    </div>
  `

  const segEls = Array.from(el.querySelectorAll('[data-seg-index]'))
  segEls.forEach((c) => c.setAttribute('stroke-dasharray', '0 100'))

  function finish() {
    segEls.forEach((c, i) => {
      const pct = (segments[i].value / total) * 100
      c.setAttribute('stroke-dasharray', `${pct} ${100 - pct}`)
    })
  }

  function animateIn({ delay = 0 } = {}) {
    if (prefersReducedMotion()) {
      finish()
      return
    }
    segEls.forEach((c, i) => {
      const pct = (segments[i].value / total) * 100
      gsap.to(c, {
        attr: { 'stroke-dasharray': `${pct} ${100 - pct}` },
        duration: 0.9,
        delay: delay + i * 0.1,
        ease: 'power2.out',
      })
    })
  }

  void toPersianDigits
  return { el, animateIn, finish }
}
