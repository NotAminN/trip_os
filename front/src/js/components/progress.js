import { gsap, prefersReducedMotion } from '../animations/gsap.js'
import { formatPercent } from '../utils/formatters.js'

export function animateProgressBar({ bar = null, fill = null, label = null, percent = 0, duration = 1.4, delay = 0 }) {
  if (!fill) return

  const apply = (value) => {
    const rounded = Math.round(value)
    fill.style.width = `${rounded}%`
    if (label) label.textContent = formatPercent(rounded)
    if (bar) bar.setAttribute('aria-valuenow', String(rounded))
  }

  if (prefersReducedMotion()) {
    apply(percent)
    return
  }

  const counter = { value: 0 }
  gsap.to(counter, {
    value: percent,
    duration,
    delay,
    ease: 'power2.out',
    onUpdate: () => apply(counter.value),
  })
}
