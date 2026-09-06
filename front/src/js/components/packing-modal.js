import { createModal } from './modal.js'
import { createDropdown } from './dropdown.js'
import { PACKING_CATEGORIES } from '../data/packing-data.js'
import { toEnglishDigits, toPersianDigits } from '../utils/formatters.js'

export function openPackingModal({
  item = null,
  defaultCategory = 'clothes',
  onSave,
} = {}) {
  const isEdit = Boolean(item)

  const state = {
    name: item?.name || '',
    category: item?.category || defaultCategory,
    quantity: item ? String(item.quantity) : '1',
  }

  const modal = createModal({
    title: isEdit ? 'ویرایش آیتم' : 'افزودن آیتم به چمدان',
    size: 'sm',
    actions: [
      {
        label: isEdit ? 'ذخیره' : 'افزودن',
        onClick: (api) => {
          if (!validate()) return
          api.requestClose()
          onSave?.({ ...state, quantity: Math.max(1, Number(toEnglishDigits(state.quantity)) || 1) })
        },
      },
      { label: 'انصراف', variant: 'btn-ghost', onClick: (api) => api.requestClose() },
    ],
  })

  modal.body.innerHTML = `
    <div class="grid gap-4">
      <div class="field">
        <label class="field-label" for="pk-name">نام آیتم</label>
        <input id="pk-name" class="input" type="text" value="${state.name}" placeholder="مثلاً آداپتور برق" autocomplete="off" />
        <p class="field-error hidden" data-pk-error="name"></p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="field">
          <span class="field-label">دسته‌بندی</span>
          <div data-pk-category></div>
        </div>
        <div class="field">
          <label class="field-label" for="pk-qty">تعداد</label>
          <input id="pk-qty" class="input" type="text" inputmode="numeric" value="${toPersianDigits(state.quantity)}" autocomplete="off" />
        </div>
      </div>
    </div>
  `

  const body = modal.body

  body.querySelector('[data-pk-category]').appendChild(
    createDropdown({
      placeholder: 'انتخاب دسته',
      ariaLabel: 'دسته‌بندی آیتم',
      selectedValue: state.category,
      items: PACKING_CATEGORIES.map((c) => ({ value: c.key, label: c.label })),
      onSelect: (value) => (state.category = value),
    }).el,
  )

  const nameInput = body.querySelector('#pk-name')
  const qtyInput = body.querySelector('#pk-qty')

  nameInput.addEventListener('input', () => (state.name = nameInput.value))
  qtyInput.addEventListener('input', () => {
    state.quantity = qtyInput.value
    qtyInput.value = toPersianDigits(qtyInput.value)
  })

  function validate() {
    const err = body.querySelector('[data-pk-error="name"]')
    err.classList.add('hidden')
    if (state.name.trim().length < 2) {
      err.textContent = 'نام آیتم باید حداقل دو حرف باشد.'
      err.classList.remove('hidden')
      return false
    }
    return true
  }

  setTimeout(() => nameInput.focus(), 60)
  modal.open()
  return modal
}
