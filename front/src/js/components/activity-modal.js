import { createModal } from './modal.js'
import { createDropdown } from './dropdown.js'
import { CATEGORIES } from '../data/categories.js'
import { toEnglishDigits, toPersianDigits } from '../utils/formatters.js'
import { formatMoney } from '../utils/money.js'

const DURATIONS = ['۳۰ دقیقه', '۱ ساعت', '۱٫۵ ساعت', '۲ ساعت', '۳ ساعت', 'تمام‌روز']

export function openActivityModal({
  dayLabel,
  activity = null,
  onSave,
} = {}) {
  const isEdit = Boolean(activity)

  const state = {
    title: activity?.title || '',
    category: activity?.category || 'attraction',
    time: activity?.time || '10:00',
    duration: activity?.duration || DURATIONS[1],
    cost: activity?.cost ? String(activity.cost) : '',
    place: activity?.place || '',
    notes: activity?.notes || '',
  }

  let categoryDropdown = null

  const modal = createModal({
    title: isEdit ? 'ویرایش فعالیت' : 'افزودن فعالیت',
    description: isEdit ? `${activity.title} — ${dayLabel}` : `فعالیت تازه برای ${dayLabel}`,
    size: 'md',
    actions: [
      {
        label: isEdit ? 'ذخیرهٔ تغییرات' : 'افزودن به برنامه',
        onClick: (api) => {
          if (!validate()) return
          api.requestClose()
          onSave?.({ ...state })
        },
      },
      { label: 'انصراف', variant: 'btn-ghost', onClick: (api) => api.requestClose() },
    ],
  })

  modal.body.innerHTML = `
    <div class="grid gap-4 sm:grid-cols-2">
      <div class="field sm:col-span-2">
        <label class="field-label" for="am-title">عنوان فعالیت</label>
        <input id="am-title" class="input" type="text" value="${state.title}" placeholder="مثلاً بازدید از کاخ دولما‌باغچه" autocomplete="off" />
        <p class="field-error hidden" data-am-error="title"></p>
      </div>

      <div class="field">
        <span class="field-label">دسته‌بندی</span>
        <div data-am-category></div>
      </div>

      <div class="field">
        <label class="field-label" for="am-time">ساعت</label>
        <input id="am-time" class="input" type="time" value="${state.time}" />
        <p class="field-error hidden" data-am-error="time"></p>
      </div>

      <div class="field">
        <label class="field-label" for="am-duration">مدت اقامت</label>
        <select id="am-duration" class="input">
          ${DURATIONS.map(
            (d) => `<option value="${d}" ${d === state.duration ? 'selected' : ''}>${d}</option>`,
          ).join('')}
        </select>
      </div>

      <div class="field">
        <label class="field-label" for="am-cost">هزینه (تومان)</label>
        <input id="am-cost" class="input" type="text" inputmode="numeric" value="${state.cost ? toPersianDigits(Number(state.cost).toLocaleString('en-US')) : ''}" placeholder="مثلاً ۵۰۰٬۰۰۰" autocomplete="off" />
        <p class="field-hint" data-am-cost-hint>${Number(state.cost) ? `معادل: ${formatMoney(Number(state.cost))}` : 'اگر رایگان است، خالی بگذار.'}</p>
      </div>

      <div class="field sm:col-span-2">
        <label class="field-label" for="am-place">مکان / آدرس</label>
        <input id="am-place" class="input" type="text" value="${state.place}" placeholder="مثلاً میدان تقسیم" autocomplete="off" />
      </div>

      <div class="field sm:col-span-2">
        <label class="field-label" for="am-notes">یادداشت</label>
        <textarea id="am-notes" class="input min-h-20 resize-y" placeholder="هر نکته‌ای که لازم داری…">${state.notes}</textarea>
      </div>
    </div>
  `

  const body = modal.body

  categoryDropdown = createDropdown({
    placeholder: 'انتخاب دسته',
    ariaLabel: 'دسته‌بندی فعالیت',
    selectedValue: state.category,
    items: CATEGORIES.map((c) => ({ value: c.key, label: c.label })),
    onSelect: (value) => (state.category = value),
  })
  body.querySelector('[data-am-category]').appendChild(categoryDropdown.el)

  const titleInput = body.querySelector('#am-title')
  const timeInput = body.querySelector('#am-time')
  const durationSelect = body.querySelector('#am-duration')
  const costInput = body.querySelector('#am-cost')
  const placeInput = body.querySelector('#am-place')
  const notesInput = body.querySelector('#am-notes')
  const costHint = body.querySelector('[data-am-cost-hint]')

  titleInput.addEventListener('input', () => (state.title = titleInput.value))
  timeInput.addEventListener('change', () => (state.time = timeInput.value))
  durationSelect.addEventListener('change', () => (state.duration = durationSelect.value))
  placeInput.addEventListener('input', () => (state.place = placeInput.value))
  notesInput.addEventListener('input', () => (state.notes = notesInput.value))
  costInput.addEventListener('input', () => {
    state.cost = String(toEnglishDigits(costInput.value).replace(/[^\d]/g, ''))
    const amount = Number(state.cost)
    costHint.textContent = amount ? `معادل: ${formatMoney(amount)}` : 'اگر رایگان است، خالی بگذار.'
  })

  function validate() {
    let ok = true
    const errTitle = body.querySelector('[data-am-error="title"]')
    const errTime = body.querySelector('[data-am-error="time"]')
    errTitle.classList.add('hidden')
    errTime.classList.add('hidden')

    if (state.title.trim().length < 2) {
      errTitle.textContent = 'عنوان باید حداقل دو حرف باشد.'
      errTitle.classList.remove('hidden')
      ok = false
    }
    if (!state.time) {
      errTime.textContent = 'ساعت فعالیت را مشخص کن.'
      errTime.classList.remove('hidden')
      ok = false
    }
    return ok
  }

  setTimeout(() => titleInput.focus(), 60)
  void toPersianDigits
  return modal
}
