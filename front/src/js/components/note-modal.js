import { createModal } from './modal.js'
import { createDropdown } from './dropdown.js'
import { createToggle } from './toggle.js'
import { NOTE_SCOPES, NOTE_TONES } from '../data/notes-data.js'

export function openNoteModal({
  note = null,
  dayOptions = [],
  placeOptions = [],
  defaultScope = 'general',
  onSave,
} = {}) {
  const isEdit = Boolean(note)

  const state = {
    title: note?.title || '',
    body: note?.text ?? note?.content ?? note?.body ?? '',
    scope: note?.scope || defaultScope,
    dayId: note?.dayId || null,
    placeId: note?.placeId || null,
    pinned: note?.pinned || false,
    tone: note?.tone || 'sky',
  }

  let dayDropdown = null
  let placeDropdown = null
  let pinToggle = null

  const modal = createModal({
    title: isEdit ? 'ویرایش یادداشت' : 'یادداشت تازه',
    description: isEdit ? 'متن یا دسته‌بندی یادداشت را به‌روز کن.' : 'هر نکته‌ای که نباید فراموش شود.',
    size: 'sm',
    actions: [
      {
        label: isEdit ? 'ذخیره' : 'افزودن یادداشت',
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
    <div class="grid gap-4">
      <div class="field">
        <label class="field-label" for="nt-title">عنوان (اختیاری)</label>
        <input id="nt-title" class="input" type="text" value="${state.title}" placeholder="مثلاً ترفند خرید بازار" autocomplete="off" />
      </div>

      <div class="field">
        <label class="field-label" for="nt-body">یادداشت</label>
        <textarea id="nt-body" class="input min-h-28 resize-y" placeholder="بنویس…">${state.body}</textarea>
        <p class="field-error hidden" data-nt-error></p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="field">
          <span class="field-label">دسته</span>
          <div data-nt-scope></div>
        </div>
        <div class="field" data-nt-day-wrap hidden>
          <span class="field-label">روز سفر</span>
          <div data-nt-day></div>
        </div>
        <div class="field" data-nt-place-wrap hidden>
          <span class="field-label">مکان</span>
          <div data-nt-place></div>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-tint p-3">
        <div data-nt-pin></div>
        <div class="flex items-center gap-2" data-nt-tones aria-label="رنگ یادداشت"></div>
      </div>
    </div>
  `

  const body = modal.body

  body.querySelector('[data-nt-scope]').appendChild(
    createDropdown({
      placeholder: 'انتخاب دسته',
      ariaLabel: 'دستهٔ یادداشت',
      selectedValue: state.scope,
      items: NOTE_SCOPES.map((s) => ({ value: s.key, label: s.label })),
      onSelect: (value) => {
        state.scope = value
        syncScopeFields()
      },
    }).el,
  )

  if (dayOptions.length) {
    dayDropdown = createDropdown({
      placeholder: 'بدون روز مشخص',
      ariaLabel: 'روز سفر',
      selectedValue: state.dayId || 'none',
      items: [{ value: 'none', label: 'بدون روز مشخص' }, ...dayOptions],
      onSelect: (value) => (state.dayId = value === 'none' ? null : value),
    })
    body.querySelector('[data-nt-day]').appendChild(dayDropdown.el)
  }

  if (placeOptions.length) {
    placeDropdown = createDropdown({
      placeholder: 'بدون مکان',
      ariaLabel: 'مکان مرتبط',
      selectedValue: state.placeId || 'none',
      items: [{ value: 'none', label: 'بدون مکان' }, ...placeOptions],
      onSelect: (value) => (state.placeId = value === 'none' ? null : value),
    })
    body.querySelector('[data-nt-place]').appendChild(placeDropdown.el)
  }

  pinToggle = createToggle({
    label: 'سنجاق در بالای فهرست',
    checked: state.pinned,
    onChange: (checked) => (state.pinned = checked),
  })
  body.querySelector('[data-nt-pin]').appendChild(pinToggle.el)

  const tonesMount = body.querySelector('[data-nt-tones]')
  NOTE_TONES.forEach((tone) => {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'size-7 rounded-full border-2 transition-transform hover:scale-110'
    btn.style.background = tone.bg
    btn.style.borderColor = state.tone === tone.key ? tone.bar : 'transparent'
    btn.style.boxShadow = state.tone === tone.key ? `0 0 0 2px ${tone.bar}` : ''
    btn.setAttribute('aria-label', `رنگ ${tone.key}`)
    btn.addEventListener('click', () => {
      state.tone = tone.key
      tonesMount.querySelectorAll('button').forEach((b, i) => {
        const t = NOTE_TONES[i]
        b.style.borderColor = state.tone === t.key ? t.bar : 'transparent'
        b.style.boxShadow = state.tone === t.key ? `0 0 0 2px ${t.bar}` : ''
      })
    })
    tonesMount.appendChild(btn)
  })

  const titleInput = body.querySelector('#nt-title')
  const textInput = body.querySelector('#nt-body')
  titleInput.addEventListener('input', () => (state.title = titleInput.value))
  textInput.addEventListener('input', () => (state.body = textInput.value))

  function syncScopeFields() {
    body.querySelector('[data-nt-day-wrap]').hidden = state.scope !== 'day' || !dayDropdown
    body.querySelector('[data-nt-place-wrap]').hidden = state.scope !== 'place' || !placeDropdown
  }

  function validate() {
    const err = body.querySelector('[data-nt-error]')
    err.classList.add('hidden')
    if (state.body.trim().length < 3) {
      err.textContent = 'متن یادداشت باید حداقل سه حرف باشد.'
      err.classList.remove('hidden')
      return false
    }
    return true
  }

  syncScopeFields()
  setTimeout(() => (state.body ? textInput.focus() : titleInput.focus()), 60)
  modal.open()
  return modal
}
