import { createModal } from './modal.js'
import { createDatePicker, JALALI_MONTHS } from './date-picker.js'
import { toast } from './toast.js'
import { icon } from '../shell/icons.js'
import { tripService } from '../services/trips.js'
import { setState } from '../state/app-state.js'
import { navigate } from '../router.js'
import { diffDays } from '../utils/dates.js'
import { formatMoney } from '../utils/money.js'
import { toPersianDigits, toEnglishDigits } from '../utils/formatters.js'

const STEP_TITLES = ['نام سفر', 'مقصد', 'تاریخ‌ها', 'مسافران', 'بودجه']

const COVERS = [
  ['#DCEEFF', '#4D8FD8', 'city'],
  ['#EFF6FF', '#245B91', 'mountain'],
  ['#E6F4EC', '#3F9673', 'sea'],
  ['#FBF2E2', '#C08A35', 'mountain'],
]

function jalaliLabel(value) {
  if (!value) return ''
  return `${toPersianDigits(value.jd)} ${JALALI_MONTHS[value.jm - 1]} ${toPersianDigits(value.jy)}`
}

export function openCreateTripWizard({ onCreated } = {}) {
  const state = {
    step: 1,
    name: '',
    destination: '',
    start: null,
    end: null,
    travelers: 2,
    budget: '',
  }

  const modal = createModal({
    title: 'ساخت سفر جدید',
    description: 'پنج قدم کوتاه تا اولین روزِ سفرت.',
    size: 'md',
  })

  function stepsIndicator() {
    return `
      <div class="wizard-steps" aria-hidden="true">
        ${STEP_TITLES.map((t, i) => {
          const n = i + 1
          return `<span class="w-dot ${n < state.step ? 'is-done' : ''} ${n === state.step ? 'is-current' : ''}" title="${t}"></span>`
        }).join('')}
      </div>
      <p class="mt-2 text-[11px] text-faint">قدم ${toPersianDigits(state.step)} از ۵ — ${STEP_TITLES[state.step - 1]}</p>
    `
  }

  function errorBox(id) {
    return `<p class="field-error hidden" data-error="${id}"></p>`
  }

  function showError(body, id, message) {
    const el = body.querySelector(`[data-error="${id}"]`)
    if (!el) return false
    el.textContent = message
    el.classList.remove('hidden')
    return false
  }

  function clearErrors(body) {
    body.querySelectorAll('[data-error]').forEach((el) => el.classList.add('hidden'))
  }

  function renderStep() {
    const body = modal.body
    let fieldHTML = ''

    if (state.step === 1) {
      fieldHTML = `
        <div class="field">
          <label class="field-label" for="wz-name">نام سفر</label>
          <input id="wz-name" class="input" type="text" value="${state.name}" placeholder="مثلاً تابستان در استانبول" autocomplete="off" />
          <p class="field-hint">یک نام خاطره‌انگیز انتخاب کن؛ هر چیزی که دوست داری.</p>
          ${errorBox('name')}
        </div>
      `
    } else if (state.step === 2) {
      fieldHTML = `
        <div class="field">
          <label class="field-label" for="wz-dest">مقصد</label>
          <input id="wz-dest" class="input" type="text" value="${state.destination}" placeholder="مثلاً استانبول، ترکیه" autocomplete="off" />
          ${errorBox('destination')}
        </div>
      `
    } else if (state.step === 3) {
      fieldHTML = `
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="field">
            <span class="field-label">تاریخ شروع</span>
            <div data-wz-start></div>
            ${errorBox('start')}
          </div>
          <div class="field">
            <span class="field-label">تاریخ پایان</span>
            <div data-wz-end></div>
            ${errorBox('end')}
          </div>
        </div>
      `
    } else if (state.step === 4) {
      fieldHTML = `
        <div class="field">
          <span class="field-label">تعداد مسافران</span>
          <div class="stepper mt-1">
            <button type="button" class="icon-btn border border-line" data-wz-minus aria-label="کاهش">${'-'}</button>
            <b class="min-w-10 text-center text-xl font-extrabold text-deep" data-wz-count>${toPersianDigits(state.travelers)}</b>
            <button type="button" class="icon-btn border border-line" data-wz-plus aria-label="افزایش">${'+'}</button>
            <span class="ms-2 text-xs text-slate">نفر</span>
          </div>
        </div>
      `
    } else {
      const preview = Number(toEnglishDigits(state.budget)) || 0
      fieldHTML = `
        <div class="field">
          <label class="field-label" for="wz-budget">بودجهٔ تقریبی (تومان)</label>
          <input id="wz-budget" class="input" type="text" inputmode="numeric" value="${state.budget}" placeholder="مثلاً ۱۵۰٬۰۰۰٬۰۰۰" autocomplete="off" />
          <p class="field-hint">${preview ? `معادل تقریبی: ${formatMoney(preview)}` : 'می‌توانی بعداً دقیقش کنی.'}</p>
          ${errorBox('budget')}
        </div>
      `
    }

    body.innerHTML = `
      ${stepsIndicator()}
      <div class="mt-6 min-h-44">${fieldHTML}</div>
      <div class="mt-7 flex items-center justify-between gap-3 border-t border-line pt-4">
        <button type="button" class="btn btn-ghost" data-wz-prev ${state.step === 1 ? 'disabled style="opacity:.4;cursor:default"' : ''}>قبلی</button>
        <button type="button" class="btn btn-primary" data-wz-next>
          ${state.step === 5 ? `${icon('checkCircle', 16)}ساخت سفر` : 'مرحلهٔ بعد'}
        </button>
      </div>
    `

    bindStep(body)
  }

  function bindStep(body) {
    const nameInput = body.querySelector('#wz-name')
    nameInput?.addEventListener('input', () => (state.name = nameInput.value))
    nameInput?.focus()

    const destInput = body.querySelector('#wz-dest')
    destInput?.addEventListener('input', () => (state.destination = destInput.value))
    destInput?.focus()

    if (state.step === 3) {
      const startMount = body.querySelector('[data-wz-start]')
      const endMount = body.querySelector('[data-wz-end]')
      const startDp = createDatePicker({
        placeholder: 'انتخاب تاریخ شروع',
        value: state.start,
        onChange: (v) => (state.start = v),
      })
      const endDp = createDatePicker({
        placeholder: 'انتخاب تاریخ پایان',
        value: state.end,
        onChange: (v) => (state.end = v),
      })
      startMount.appendChild(startDp.el)
      endMount.appendChild(endDp.el)
    }

    if (state.step === 4) {
      const countEl = body.querySelector('[data-wz-count]')
      body.querySelector('[data-wz-minus]')?.addEventListener('click', () => {
        state.travelers = Math.max(1, state.travelers - 1)
        countEl.textContent = toPersianDigits(state.travelers)
      })
      body.querySelector('[data-wz-plus]')?.addEventListener('click', () => {
        state.travelers = Math.min(20, state.travelers + 1)
        countEl.textContent = toPersianDigits(state.travelers)
      })
    }

    if (state.step === 5) {
      const budgetInput = body.querySelector('#wz-budget')
      budgetInput?.addEventListener('input', () => {
        state.budget = budgetInput.value
        const preview = Number(toEnglishDigits(state.budget)) || 0
        const hint = body.querySelector('.field-hint')
        hint.textContent = preview
          ? `معادل تقریبی: ${formatMoney(preview)}`
          : 'می‌توانی بعداً دقیقش کنی.'
      })
      budgetInput?.focus()
    }

    body.querySelector('[data-wz-prev]')?.addEventListener('click', () => {
      if (state.step > 1) {
        state.step -= 1
        renderStep()
      }
    })

    body.querySelector('[data-wz-next]')?.addEventListener('click', () => {
      if (!validate()) return
      if (state.step < 5) {
        state.step += 1
        renderStep()
      } else {
        submit()
      }
    })
  }

  function validate() {
    const body = modal.body
    clearErrors(body)

    if (state.step === 1 && state.name.trim().length < 2) {
      return showError(body, 'name', 'نام سفر باید حداقل دو حرف باشد.')
    }
    if (state.step === 2 && state.destination.trim().length < 2) {
      return showError(body, 'destination', 'مقصد را وارد کن.')
    }
    if (state.step === 3) {
      if (!state.start) return showError(body, 'start', 'تاریخ شروع را انتخاب کن.')
      if (!state.end) return showError(body, 'end', 'تاریخ پایان را انتخاب کن.')
      const startDate = new Date(state.start.jy, state.start.jm - 1, state.start.jd)
      const endDate = new Date(state.end.jy, state.end.jm - 1, state.end.jd)
      if (endDate < startDate) {
        return showError(body, 'end', 'تاریخ پایان نمی‌تواند قبل از شروع باشد.')
      }
    }
    if (state.step === 5) {
      const amount = Number(toEnglishDigits(state.budget))
      if (!amount || amount < 100000) {
        return showError(body, 'budget', 'یک مبلغ معقول به تومان وارد کن.')
      }
    }
    return true
  }

  async function submit() {
    const [coverFrom, coverTo, coverScene] = COVERS[Math.floor(Math.random() * COVERS.length)]
    const startDate = new Date(state.start.jy, state.start.jm - 1, state.start.jd)
    const endDate = new Date(state.end.jy, state.end.jm - 1, state.end.jd)
    const nights = Math.max(0, diffDays(startDate, endDate))

    try {
      const trip = await tripService.create({
        title: state.name.trim(),
        destination: state.destination.trim(),
        startDate,
        endDate,
        travelers: state.travelers,
        coverFrom,
        coverTo,
        coverScene,
        budget: { total: Number(toEnglishDigits(state.budget)) },
      })

      setState({ currentTripId: trip.id })
      modal.requestClose()
      toast.success(`سفر «${trip.title}» ساخته شد.`)
      navigate('dashboard')
      onCreated?.(trip)
    } catch (error) {
      console.error(error)
      toast.error?.(error?.message || 'ساخت سفر ناموفق بود.')
    }
  }

  renderStep()
  modal.open()
  return modal
}
