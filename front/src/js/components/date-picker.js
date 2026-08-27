import { gsap, prefersReducedMotion } from '../animations/gsap.js'
import { toGregorian, jalaaliMonthLength, todayJalaali } from '../utils/jalali.js'
import { toPersianDigits } from '../utils/formatters.js'
import { uid } from '../utils/helpers.js'

const MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
]

const WEEKDAYS_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']

const ICON_CALENDAR =
  '<svg class="dp-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="16" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/></svg>'

const CHEVRON_RIGHT =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>'

const CHEVRON_LEFT =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>'

function weekdayColumn(jy, jm, jd = 1) {
  const g = toGregorian(jy, jm, jd)
  const date = new Date(g.gy, g.gm - 1, g.gd)
  return (date.getDay() + 1) % 7
}

export function createDatePicker({
  value = null,
  onChange,
  minYear = 1330,
  maxYear = 1470,
  placeholder = 'انتخاب تاریخ',
} = {}) {
  let selected = value ? { ...value } : null

  const today = todayJalaali()
  let view = selected ? { jy: selected.jy, jm: selected.jm } : { jy: today.jy, jm: today.jm }

  const rootId = uid('dp')

  const el = document.createElement('div')
  el.className = 'datepicker'
  el.innerHTML = `
    <button type="button" class="dp-field" aria-haspopup="dialog" aria-expanded="false" aria-controls="${rootId}">
      <span class="dp-value is-placeholder"></span>
      ${ICON_CALENDAR}
    </button>
    <div class="dp-pop" id="${rootId}" role="dialog" aria-label="تقویم انتخاب تاریخ شمسی">
      <div class="dp-head">
        <button type="button" class="icon-btn icon-btn-sm dp-nav" data-dp-prev aria-label="ماه قبل">${CHEVRON_RIGHT}</button>
        <span class="dp-title" data-dp-title></span>
        <button type="button" class="icon-btn icon-btn-sm dp-nav" data-dp-next aria-label="ماه بعد">${CHEVRON_LEFT}</button>
      </div>
      <div class="dp-week" aria-hidden="true">
        ${WEEKDAYS_SHORT.map((d) => `<span>${d}</span>`).join('')}
      </div>
      <div class="dp-grid" data-dp-grid role="grid" aria-label="روزهای ماه"></div>
      <div class="dp-foot">
        <button type="button" class="btn btn-ghost btn-sm" data-dp-today>رفتن به امروز</button>
      </div>
    </div>
  `

  const field = el.querySelector('.dp-field')
  const valueEl = field.querySelector('.dp-value')
  const pop = el.querySelector('.dp-pop')
  const titleEl = el.querySelector('[data-dp-title]')
  const grid = el.querySelector('[data-dp-grid]')
  const prevBtn = el.querySelector('[data-dp-prev]')
  const nextBtn = el.querySelector('[data-dp-next]')

  let isOpen = false

  function formatValue(j) {
    return `${toPersianDigits(j.jd)} ${MONTHS[j.jm - 1]} ${toPersianDigits(j.jy)}`
  }

  function renderField() {
    if (selected) {
      valueEl.textContent = formatValue(selected)
      valueEl.classList.remove('is-placeholder')
    } else {
      valueEl.textContent = placeholder
      valueEl.classList.add('is-placeholder')
    }
  }

  function shiftMonth(delta) {
    let jm = view.jm + delta
    let jy = view.jy
    if (jm > 12) {
      jm = 1
      jy += 1
    } else if (jm < 1) {
      jm = 12
      jy -= 1
    }
    if (jy < minYear || jy > maxYear) return
    view = { jy, jm }
    renderGrid()
  }

  function renderGrid() {
    titleEl.textContent = `${MONTHS[view.jm - 1]} ${toPersianDigits(view.jy)}`
    prevBtn.disabled = view.jy <= minYear && view.jm === 1
    nextBtn.disabled = view.jy >= maxYear && view.jm === 12

    grid.innerHTML = ''
    const leadEmpty = weekdayColumn(view.jy, view.jm)
    for (let i = 0; i < leadEmpty; i += 1) {
      grid.appendChild(document.createElement('span'))
    }

    const length = jalaaliMonthLength(view.jy, view.jm)
    for (let day = 1; day <= length; day += 1) {
      const cell = document.createElement('button')
      cell.type = 'button'
      cell.className = 'dp-day'
      cell.dataset.day = String(day)
      cell.textContent = toPersianDigits(day)
      cell.setAttribute(
        'aria-label',
        `${toPersianDigits(day)} ${MONTHS[view.jm - 1]} ${toPersianDigits(view.jy)}`,
      )

      if (
        today.jy === view.jy &&
        today.jm === view.jm &&
        today.jd === day
      ) {
        cell.classList.add('is-today')
      }

      if (
        selected &&
        selected.jy === view.jy &&
        selected.jm === view.jm &&
        selected.jd === day
      ) {
        cell.classList.add('is-selected')
        cell.setAttribute('aria-pressed', 'true')
      }

      grid.appendChild(cell)
    }
  }

  function select(day, { closeAfter = true } = {}) {
    selected = { jy: view.jy, jm: view.jm, jd: day }
    renderField()
    renderGrid()
    if (closeAfter) close()
    onChange?.({ ...selected })
  }

  async function open() {
    if (isOpen) return
    isOpen = true
    if (selected) view = { jy: selected.jy, jm: selected.jm }
    renderGrid()
    pop.classList.add('is-open')
    field.classList.add('is-open')
    field.setAttribute('aria-expanded', 'true')
    if (!prefersReducedMotion()) {
      gsap.fromTo(
        pop,
        { autoAlpha: 0, y: -8 },
        { autoAlpha: 1, y: 0, duration: 0.22, ease: 'power2.out' },
      )
    }
    document.addEventListener('pointerdown', onOutside)
    const current = grid.querySelector('.is-selected') || grid.querySelector('.dp-day')
    current?.focus({ preventScroll: true })
  }

  function close({ restoreFocus = true } = {}) {
    if (!isOpen) return
    isOpen = false
    pop.classList.remove('is-open')
    gsap.set(pop, { clearProps: 'all' })
    field.classList.remove('is-open')
    field.setAttribute('aria-expanded', 'false')
    document.removeEventListener('pointerdown', onOutside)
    if (restoreFocus) field.focus()
  }

  function onOutside(event) {
    if (!el.contains(event.target)) close({ restoreFocus: false })
  }

  field.addEventListener('click', () => (isOpen ? close() : open()))

  prevBtn.addEventListener('click', () => shiftMonth(-1))
  nextBtn.addEventListener('click', () => shiftMonth(1))

  el.querySelector('[data-dp-today]').addEventListener('click', () => {
    view = { jy: today.jy, jm: today.jm }
    select(today.jd)
  })

  grid.addEventListener('click', (event) => {
    const cell = event.target.closest('.dp-day')
    if (cell) select(Number(cell.dataset.day))
  })

  grid.addEventListener('keydown', (event) => {
    const cells = Array.from(grid.querySelectorAll('.dp-day'))
    const index = cells.indexOf(document.activeElement)
    if (index < 0) return

    let targetIndex = null
    switch (event.key) {
      case 'ArrowRight':
        targetIndex = index - 1
        break
      case 'ArrowLeft':
        targetIndex = index + 1
        break
      case 'ArrowUp':
        targetIndex = index - 7
        break
      case 'ArrowDown':
        targetIndex = index + 7
        break
      case 'Escape':
        event.preventDefault()
        close()
        return
      default:
        return
    }

    if (targetIndex === null || targetIndex < 0 || targetIndex >= cells.length) return
    event.preventDefault()
    cells[targetIndex].focus()
  })

  renderField()

  return {
    el,
    getValue: () => (selected ? { ...selected } : null),
    getISO: () => {
      if (!selected) return null
      const g = toGregorian(selected.jy, selected.jm, selected.jd)
      const mm = String(g.gm).padStart(2, '0')
      const dd = String(g.gd).padStart(2, '0')
      return `${g.gy}-${mm}-${dd}`
    },
    setValue(next) {
      selected = next ? { ...next } : null
      if (selected) view = { jy: selected.jy, jm: selected.jm }
      renderField()
      if (isOpen) renderGrid()
    },
    open,
    close: () => close({ restoreFocus: false }),
    destroy: () => {
      close({ restoreFocus: false })
      el.remove()
    },
  }
}

export { MONTHS as JALALI_MONTHS }
