import { createModal } from './modal.js'
import { createDropdown } from './dropdown.js'
import { BUDGET_CATEGORIES, getBudgetCategory } from '../data/budget-data.js'
import { toEnglishDigits } from '../utils/formatters.js'
import { formatMoney } from '../utils/money.js'

export function openExpenseModal({
  expense = null,
  dayOptions = [],
  defaultDayId = null,
  onSave,
} = {}) {
  const isEdit = Boolean(expense)

  const state = {
    title: expense?.title || '',
    category: expense?.category || 'food',
    dayId: expense?.dayId ?? defaultDayId,
    amount: expense ? String(expense.amount) : '',
  }

  let dayDropdown = null

  const modal = createModal({
    title: isEdit ? 'ویرایش هزینه' : 'ثبت هزینه',
    description: isEdit
      ? `${expense.title} — مبلغ را به‌روزرسانی کن.`
      : 'هزینه را ثبت کن تا بودجه و نمودارها همین حالا به‌روز شوند.',
    size: 'sm',
    actions: [
      {
        label: isEdit ? 'ذخیره' : 'ثبت هزینه',
        onClick: (api) => {
          if (!validate()) return
          api.requestClose()
          onSave?.({ ...state, amount: Number(toEnglishDigits(state.amount)) || 0 })
        },
      },
      { label: 'انصراف', variant: 'btn-ghost', onClick: (api) => api.requestClose() },
    ],
  })

  modal.body.innerHTML = `
    <div class="grid gap-4">
      <div class="field">
        <label class="field-label" for="ex-title">عنوان هزینه</label>
        <input id="ex-title" class="input" type="text" value="${state.title}" placeholder="مثلاً بلیت کشتی پرنس‌جزایر" autocomplete="off" />
        <p class="field-error hidden" data-ex-error="title"></p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="field">
          <span class="field-label">دسته‌بندی</span>
          <div data-ex-category></div>
        </div>
        <div class="field">
          <span class="field-label">روز سفر</span>
          <div data-ex-day></div>
        </div>
      </div>

      <div class="field">
        <label class="field-label" for="ex-amount">مبلغ (تومان)</label>
        <input id="ex-amount" class="input" type="text" inputmode="numeric" value="${state.amount ? toPersianDigits(Number(state.amount).toLocaleString('en-US')) : ''}" placeholder="مثلاً ۴۵۰٬۰۰۰" autocomplete="off" />
        <p class="field-hint" data-ex-hint>${Number(state.amount) ? `معادل: ${formatMoney(Number(state.amount))}` : ''}</p>
        <p class="field-error hidden" data-ex-error="amount"></p>
      </div>
    </div>
  `

  const body = modal.body

  body.querySelector('[data-ex-category]').appendChild(
    createDropdown({
      placeholder: 'انتخاب دسته',
      ariaLabel: 'دسته‌بندی هزینه',
      selectedValue: state.category,
      items: BUDGET_CATEGORIES.map((c) => ({ value: c.key, label: c.label })),
      onSelect: (value) => {
        state.category = value
      },
    }).el,
  )

  dayDropdown = createDropdown({
    placeholder: 'بدون روز مشخص',
    ariaLabel: 'روز سفر',
    selectedValue: state.dayId || 'none',
    items: [{ value: 'none', label: 'بدون روز مشخص' }, ...dayOptions],
    onSelect: (value) => (state.dayId = value === 'none' ? null : value),
  })
  body.querySelector('[data-ex-day]').appendChild(dayDropdown.el)

  const titleInput = body.querySelector('#ex-title')
  const amountInput = body.querySelector('#ex-amount')
  const hint = body.querySelector('[data-ex-hint]')

  titleInput.addEventListener('input', () => (state.title = titleInput.value))
  amountInput.addEventListener('input', () => {
    state.amount = toEnglishDigits(amountInput.value).replace(/[^\d]/g, '')
    const v = Number(state.amount)
    hint.textContent = v ? `معادل: ${formatMoney(v)}` : ''
  })

  function validate() {
    let ok = true
    const errTitle = body.querySelector('[data-ex-error="title"]')
    const errAmount = body.querySelector('[data-ex-error="amount"]')
    errTitle.classList.add('hidden')
    errAmount.classList.add('hidden')

    if (state.title.trim().length < 2) {
      errTitle.textContent = 'عنوان هزینه را وارد کن.'
      errTitle.classList.remove('hidden')
      ok = false
    }
    if (!(Number(toEnglishDigits(state.amount)) > 0)) {
      errAmount.textContent = 'مبلغ باید بزرگ‌تر از صفر باشد.'
      errAmount.classList.remove('hidden')
      ok = false
    }
    return ok
  }

  setTimeout(() => titleInput.focus(), 60)
  void getBudgetCategory
  return modal
}
