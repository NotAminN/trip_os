import { createModal } from './modal.js'
import { createDropdown } from './dropdown.js'
import { createMapPicker } from './map-picker.js'
import { CATEGORIES } from '../data/categories.js'

export function openPlaceModal({
  place = null,
  contextPlaces = [],
  onSave,
} = {}) {
  const isEdit = Boolean(place)

  const state = {
    name: place?.name || '',
    category: place?.category || 'attraction',
    address: place?.address || '',
    note: place?.note || '',
    coords: place ? { x: place.x, y: place.y } : null,
  }

  const modal = createModal({
    title: isEdit ? 'ویرایش مکان' : 'افزودن مکان',
    description: isEdit
      ? `${place.name} — با کلیک روی نقشه می‌توانی موقعیت را جابه‌جا کنی.`
      : 'مکان تازه را به سفر اضافه کن؛ بعداً روی نقشه و در مسیر دیده می‌شود.',
    size: 'md',
    actions: [
      {
        label: isEdit ? 'ذخیرهٔ تغییرات' : 'افزودن مکان',
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
        <label class="field-label" for="pm-name">نام مکان</label>
        <input id="pm-name" class="input" type="text" value="${state.name}" placeholder="مثلاً موزهٔ فرش" autocomplete="off" />
        <p class="field-error hidden" data-pm-error="name"></p>
      </div>

      <div class="field">
        <span class="field-label">دسته‌بندی</span>
        <div data-pm-category></div>
      </div>

      <div class="field">
        <label class="field-label" for="pm-address">آدرس</label>
        <input id="pm-address" class="input" type="text" value="${state.address}" placeholder="مثلاً خیابان استقلال" autocomplete="off" />
      </div>

      <div class="field sm:col-span-2">
        <span class="field-label">موقعیت روی نقشه</span>
        <div data-pm-picker></div>
        <p class="field-error hidden mt-1" data-pm-error="coords"></p>
      </div>

      <div class="field sm:col-span-2">
        <label class="field-label" for="pm-note">یادداشت</label>
        <textarea id="pm-note" class="input min-h-16 resize-y" placeholder="هر نکته‌ای دربارهٔ این مکان…">${state.note}</textarea>
      </div>
    </div>
  `

  const body = modal.body

  const categoryDropdown = createDropdown({
    placeholder: 'انتخاب دسته',
    ariaLabel: 'دسته‌بندی مکان',
    selectedValue: state.category,
    items: CATEGORIES.map((c) => ({ value: c.key, label: c.label })),
    onSelect: (value) => (state.category = value),
  })
  body.querySelector('[data-pm-category]').appendChild(categoryDropdown.el)

  const picker = createMapPicker({
    value: state.coords,
    contextPlaces,
    onChange: (x, y) => (state.coords = { x, y }),
  })
  body.querySelector('[data-pm-picker]').appendChild(picker.el)

  const nameInput = body.querySelector('#pm-name')
  const addressInput = body.querySelector('#pm-address')
  const noteInput = body.querySelector('#pm-note')

  nameInput.addEventListener('input', () => (state.name = nameInput.value))
  addressInput.addEventListener('input', () => (state.address = addressInput.value))
  noteInput.addEventListener('input', () => (state.note = noteInput.value))

  function validate() {
    let ok = true
    const errName = body.querySelector('[data-pm-error="name"]')
    const errCoords = body.querySelector('[data-pm-error="coords"]')
    errName.classList.add('hidden')
    errCoords.classList.add('hidden')

    if (state.name.trim().length < 2) {
      errName.textContent = 'نام مکان باید حداقل دو حرف باشد.'
      errName.classList.remove('hidden')
      ok = false
    }

    if (!state.coords) {
      errCoords.textContent = 'موقعیت مکان را روی نقشه مشخص کن.'
      errCoords.classList.remove('hidden')
      ok = false
    }

    return ok
  }

  setTimeout(() => nameInput.focus(), 60)
  modal.open()
  return modal
}
