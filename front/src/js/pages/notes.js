import { tripService } from '../services/trips.js'
import { notesService } from '../services/notes.js'
import { placeService } from '../services/places.js'
import { timelineService } from '../services/timeline.js'
import { openNoteModal } from '../components/note-modal.js'
import { createDropdown } from '../components/dropdown.js'
import { createModal } from '../components/modal.js'
import { toast } from '../components/toast.js'
import { NOTE_SCOPES, NOTE_TONES, getNoteScope } from '../data/notes-data.js'
import { icon } from '../shell/icons.js'
import { toPersianDigits } from '../utils/formatters.js'
import { debounce } from '../utils/helpers.js'

export const meta = { title: 'یادداشت‌ها' }

const ui = { query: '', scope: 'all', tripId: null }

export async function render(container) {
  const trip = tripService.getCurrent()
  if (!trip) return

  if (ui.tripId !== trip.id) {
    Object.assign(ui, { tripId: trip.id, query: '', scope: 'all' })
  }

  const notes = notesService.listByTrip(trip.id)
  const days = timelineService.getDays(trip)
  const places = placeService.listByTrip(trip.id)

  const dayOptions = days.map((d) => ({ value: d.id, label: d.title }))
  const placeOptions = places.map((p) => ({ value: p.id, label: p.name }))
  const dayLabel = (dayId) => days.find((d) => d.id === dayId)?.title || ''
  const placeLabel = (placeId) => places.find((p) => p.id === placeId)?.name || ''

  container.innerHTML = `
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-extrabold text-deep">یادداشت‌های سفر</h1>
        <p class="mt-1 text-sm text-slate">${trip.title} — ${toPersianDigits(notes.length)} یادداشت</p>
      </div>
      <button type="button" class="btn btn-primary" data-add-note>${icon('plus', 16)}یادداشت تازه</button>
    </header>

    ${
      notes.length === 0
        ? `<section class="card mt-8 p-10 text-center">
            <span class="mx-auto grid size-16 place-items-center rounded-2xl bg-tint text-sky">${icon('note', 28)}</span>
            <h2 class="mt-5 text-xl font-extrabold text-deep">هنوز یادداشتی ننوشته‌ای.</h2>
            <p class="mx-auto mt-2 max-w-sm text-sm leading-8 text-slate">
              نکته‌های کوچک سفر — از ساعت قایق تا کد تخفیف موزه — اینجا جمع می‌شوند.
            </p>
            <button type="button" class="btn btn-primary mx-auto mt-6" data-empty-add>${icon('plus', 16)}نوشتن اولین یادداشت</button>
          </section>`
        : `
      <div class="mt-5 flex flex-wrap items-center gap-2">
        <div class="relative min-w-56 flex-1 sm:max-w-xs">
          <span class="pointer-events-none absolute inset-y-0 start-3 grid place-items-center text-faint">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4.2-4.2"/></svg>
          </span>
          <input type="search" class="input ps-10" placeholder="جستجو در یادداشت‌ها…" data-note-search aria-label="جستجو در یادداشت‌ها" />
        </div>
        <span data-note-filter-scope></span>
      </div>

      <div class="mt-6 columns-1 gap-5 sm:columns-2 xl:columns-3 [&>*]:mb-5" data-notes-board></div>
      <p class="mt-6 hidden rounded-xl bg-tint p-5 text-center text-sm text-slate" data-no-match>یادداشتی مطابق جستجو پیدا نشد.</p>`
    }
  `

  const addHandler = (event) =>
    openNoteModal({
      dayOptions,
      placeOptions,
      onSave: (draft) => {
        notesService.create({ ...draft, tripId: trip.id })
        toast.success('یادداشت ذخیره شد.')
        render(container)
      },
    })

  container.querySelector('[data-add-note]')?.addEventListener('click', addHandler)
  container.querySelector('[data-empty-add]')?.addEventListener('click', addHandler)

  if (!notes.length) return

  const board = container.querySelector('[data-notes-board]')
  const noMatch = container.querySelector('[data-no-match]')

  function visibleNotes() {
    const q = ui.query.trim()
    return notes.filter((note) => {
      if (ui.scope !== 'all' && note.scope !== ui.scope) return false
      if (!q) return true
      const body = note.text ?? note.content ?? ''
      return (
        (note.title || '').includes(q) ||
        body.includes(q) ||
        getNoteScope(note.scope).label.includes(q) ||
        (dayLabel(note.dayId) || '').includes(q) ||
        (placeLabel(note.placeId) || '').includes(q)
      )
    })
  }

  function renderBoard() {
    if (!board) return
    const list = visibleNotes()
    noMatch?.classList.toggle('hidden', list.length > 0)
    board.innerHTML = ''

    list.forEach((note) => board.appendChild(noteCard(note)))
  }

  function noteCard(note) {
    const scope = getNoteScope(note.scope)
    const tone = NOTE_TONES.find((t) => t.key === note.tone) || NOTE_TONES[0]

    const card = document.createElement('article')
    card.className = 'card break-inside-avoid overflow-hidden'
    card.style.background = tone.bg
    card.style.borderColor = `${tone.bar}44`

    card.innerHTML = `
      <span class="block h-1 w-full" style="background:${tone.bar}"></span>
      <div class="p-4">
        <div class="flex items-start justify-between gap-2">
          <div class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span class="badge bg-white/80" style="color:${scope.color}">
              ${icon(scope.icon, 12)}${scope.label}
            </span>
            ${note.dayId ? `<span class="text-[11px] font-bold text-slate">${dayLabel(note.dayId)}</span>` : ''}
            ${note.placeId ? `<span class="truncate text-[11px] text-faint">· ${placeLabel(note.placeId)}</span>` : ''}
          </div>
          <span class="relative shrink-0" data-card-menu></span>
        </div>

        ${note.title ? `<b class="mt-2.5 block text-[14px] font-extrabold text-ink">${note.title}</b>` : ''}
        <p class="mt-1.5 text-[13px] leading-7 text-slate">${note.text ?? note.content ?? ''}</p>

        ${
          note.pinned
            ? `<p class="mt-3 flex items-center gap-1.5 text-[11px] font-bold" style="color:${scope.color}">${icon('pushpin', 12)}سنجاق‌شده</p>`
            : ''
        }
      </div>
    `

    card.querySelector('[data-card-menu]').appendChild(
      createDropdown({
        ariaLabel: `کنش‌های یادداشت ${note.title || ''}`,
        manageLabel: false,
        trigger: (() => {
          const b = document.createElement('button')
          b.type = 'button'
          b.className = 'icon-btn icon-btn-sm border border-line bg-white/70'
          b.setAttribute('aria-label', 'گزینه‌های یادداشت')
          b.innerHTML = icon('dotsVertical')
          return b
        })(),
        items: [
          { value: 'pin', label: note.pinned ? 'برداشتن سنجاق' : 'سنجاق کردن' },
          { value: 'edit', label: 'ویرایش' },
          { value: 'delete', label: 'حذف' },
        ],
        onSelect: (value) => {
          if (value === 'pin') {
            notesService.togglePinned(note.id)
            toast.info(note.pinned ? 'سنجاق برداشته شد.' : 'یادداشت سنجاق شد.')
            render(container)
          } else if (value === 'edit') {
            editNote(note)
          } else {
            confirmDelete(note)
          }
        },
      }).el,
    )

    function editNote(target) {
      openNoteModal({
        note: target,
        dayOptions,
        placeOptions,
        onSave: (draft) => {
          notesService.update(target.id, draft)
          toast.success('تغییرات ذخیره شد.')
          render(container)
        },
      })
    }

    function confirmDelete(target) {
      createModal({
        title: 'حذف یادداشت',
        description: `«${target.title || target.body.slice(0, 24)}…» حذف خواهد شد.`,
        size: 'sm',
        content: '<p class="text-sm leading-7 text-slate">این کار برگشت‌پذیر نیست.</p>',
        actions: [
          {
            label: 'حذف کن',
            onClick: (api) => {
              notesService.remove(target.id)
              api.requestClose()
              toast.success('یادداشت حذف شد.')
              render(container)
            },
          },
          { label: 'انصراف', variant: 'btn-ghost', onClick: (api) => api.requestClose() },
        ],
      }).open()
    }

    return card
  }

  const searchInput = container.querySelector('[data-note-search]')
  searchInput?.addEventListener(
    'input',
    debounce(() => {
      ui.query = searchInput.value
      renderBoard()
    }, 160),
  )

  buildScopeFilter(container)
  renderBoard()

  function buildScopeFilter(root) {
    const mount = root.querySelector('[data-note-filter-scope]')
    if (!mount) return
    let labelEl = null

    const dropdown = createDropdown({
      ariaLabel: 'فیلتر دستهٔ یادداشت‌ها',
      manageLabel: false,
      trigger: (() => {
        const t = document.createElement('button')
        t.type = 'button'
        t.className = 'btn btn-secondary btn-sm'
        t.innerHTML = `<span data-filter-label>همهٔ دسته‌ها</span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`
        return t
      })(),
      items: [
        { value: 'all', label: 'همهٔ دسته‌ها' },
        ...NOTE_SCOPES.map((s) => ({ value: s.key, label: s.label })),
      ],
      onSelect: (value) => {
        ui.scope = value
        labelEl.replaceChildren(value === 'all' ? 'همهٔ دسته‌ها' : getNoteScope(value).label)
        renderBoard()
      },
    })

    mount.appendChild(dropdown.el)
    labelEl = dropdown.el.querySelector('[data-filter-label]')
  }
}
