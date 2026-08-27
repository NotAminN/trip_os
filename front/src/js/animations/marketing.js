import { gsap, ScrollTrigger, prefersReducedMotion } from './gsap.js'
import { qs, qsa } from '../utils/helpers.js'
import { toPersianDigits } from '../utils/formatters.js'
import { createDonutChart } from '../components/donut.js'

function initBudgetDonut() {
  const mount = qs('[data-donut-chart]')
  if (!mount || mount.dataset.donutInit) return
  mount.dataset.donutInit = 'true'

  const scope = mount.closest('[data-bento-budget]') || document
  const counters = qsa('[data-count]', scope)

  const chart = createDonutChart({
    segments: [
      { value: 45, color: '#245B91', label: 'اقامت' },
      { value: 20, color: '#C08A35', label: 'غذا' },
      { value: 15, color: '#4D8FD8', label: 'حمل‌ونقل' },
      { value: 12, color: '#3F9673', label: 'تفریح' },
      { value: 8, color: '#90A3B4', label: 'سایر' },
    ],
    centerTitle: '۲۵M',
    centerSub: 'تومان',
    size: 128,
  })
  mount.appendChild(chart.el)

  const runCounters = () => {
    counters.forEach((el) => {
      const proxy = { v: 0 }
      gsap.to(proxy, {
        v: Number(el.dataset.count),
        duration: 1,
        ease: 'power2.out',
        onUpdate: () => {
          el.textContent = toPersianDigits(Math.round(proxy.v))
        },
      })
    })
  }

  const finishCounters = () => {
    counters.forEach((el) => {
      el.textContent = toPersianDigits(el.dataset.count)
    })
  }

  if (prefersReducedMotion()) {
    chart.finish()
    finishCounters()
    return
  }

  ScrollTrigger.create({
    trigger: mount,
    start: 'top 85%',
    once: true,
    onEnter: () => {
      chart.animateIn({ delay: 0.1 })
      runCounters()
    },
  })
}

function initMapJourney() {
  const section = qs('[data-map-journey]')
  if (!section || section.dataset.journeyInit) return
  section.dataset.journeyInit = 'true'

  const path = qs('.journey-path', section)
  const dot = qs('.journey-dot', section)
  const stops = qsa('[data-stop]', section)
  const steps = qsa('[data-step]', section)
  if (!path) return

  const len = path.getTotalLength()
  const fracs = [0.04, 0.38, 0.68, 0.98]

  function render(progress) {
    path.style.strokeDashoffset = String(len * (1 - progress))
    const pt = path.getPointAtLength(len * progress)
    if (dot) dot.setAttribute('transform', `translate(${pt.x} ${pt.y})`)
    stops.forEach((stop, i) => stop.classList.toggle('is-on', progress >= fracs[i] - 0.03))
    steps.forEach((step, i) => step.classList.toggle('is-active', progress >= fracs[i] - 0.06))
  }

  if (prefersReducedMotion()) {
    render(1)
    return
  }

  gsap.set(path, { strokeDasharray: len, strokeDashoffset: len })
  render(0)

  ScrollTrigger.create({
    trigger: section,
    start: 'top 72%',
    end: 'bottom 58%',
    scrub: 0.6,
    onUpdate: (self) => render(self.progress),
  })
}

const JOURNEY_META = [
  { day: 'چهارشنبه ۲۴ شهریور', temp: '۲۱°', cond: 'آفتابی', cost: '€۶۵' },
  { day: 'پنج‌شنبه ۲۵ شهریور', temp: '۲۳°', cond: 'آفتابی', cost: '€۹۲' },
  { day: 'جمعه ۲۶ شهریور', temp: '۲۲°', cond: 'کمی ابری', cost: '€۷۸' },
  { day: 'شنبه ۲۷ شهریور', temp: '۱۹°', cond: 'بارانی سبک', cost: '€۷۰' },
  { day: 'یک‌شنبه ۲۸ شهریور', temp: '۲۴°', cond: 'آفتابی', cost: '€۸۸' },
]

function initJourneyTimeline() {
  const wrap = qs('[data-journey]')
  if (!wrap || wrap.dataset.journeyTlInit) return
  wrap.dataset.journeyTlInit = 'true'

  const track = qs('[data-journey-track]', wrap)
  const cards = qsa('[data-journey-card]', wrap)
  const metaDay = qs('[data-meta-day]', wrap)
  const metaTemp = qs('[data-meta-temp]', wrap)
  const metaCond = qs('[data-meta-cond]', wrap)
  const metaCost = qs('[data-meta-cost]', wrap)
  if (!track || !cards.length) return

  let activeIndex = -1

  function setMeta(index) {
    if (index === activeIndex) return
    activeIndex = index
    const meta = JOURNEY_META[index]
    cards.forEach((card, i) => card.classList.toggle('is-active', i === index))

    const apply = () => {
      metaDay.textContent = meta.day
      metaTemp.textContent = meta.temp
      metaCond.textContent = meta.cond
      metaCost.textContent = meta.cost
    }

    if (prefersReducedMotion()) {
      apply()
      return
    }
    gsap.fromTo(
      [metaDay, metaTemp, metaCond, metaCost],
      { autoAlpha: 0, y: -8 },
      { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power2.out', stagger: 0.02, onStart: apply },
    )
  }

  setMeta(0)

  if (prefersReducedMotion()) return

  const mm = gsap.matchMedia()
  mm.add('(min-width: 1024px)', () => {
    const distance = () => Math.max(0, track.scrollWidth - wrap.clientWidth)

    const tween = gsap.to(track, {
      x: () => distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: wrap,
        start: 'top top',
        end: () => `+=${distance() * 1.15 + 200}`,
        pin: true,
        scrub: 0.5,
        invalidateOnRefresh: true,
        anticipatePin: 1,
        onUpdate: (self) =>
          setMeta(Math.round(self.progress * (JOURNEY_META.length - 1))),
      },
    })

    return () => {
      activeIndex = -1
      tween.scrollTrigger?.kill()
      tween.kill()
      gsap.set(track, { clearProps: 'x' })
    }
  })
}

export function initMarketing() {
  initBudgetDonut()
  initMapJourney()
  initJourneyTimeline()
}

export { ScrollTrigger }
