import { tripService } from '../services/trips.js'
import { placeService } from '../services/places.js'
import { openPlaceModal } from '../components/place-modal.js'
import { createDrawer } from '../components/drawer.js'
import { createDropdown } from '../components/dropdown.js'
import { createModal } from '../components/modal.js'
import { toast } from '../components/toast.js'
import { getCategory, CATEGORIES } from '../data/categories.js'
import { icon } from '../shell/icons.js'
import { toPersianDigits } from '../utils/formatters.js'
import { debounce } from '../utils/helpers.js'

export const meta = { title: 'مکان‌ها' }

const filters = { query: '', category: 'all', tripId: null }

const MAP_FOCUS_KEY = 'trip-os:map-focus'

function setMapFocus(id) {
  try {
    sessionStorage.setItem(MAP_FOCUS_KEY, id)
  } catch {
    sessionStorage.removeItem(MAP_FOCUS_KEY)
  }
  window.location.hash = '/map'
}

export async function render(container) {
  const trip = tripService.getCurrent()
  if (!trip) return

  if (filters.tripId !== trip.id) {
    Object.assign(filters, { tripId: trip.id, query: '', category: 'all' })
  }

  const places = placeService.listByTrip(trip.id)

  container.innerHTML = `
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-extrabold text-deep">مکان‌های سفر</h1>
        <p class="mt-1 text-sm text-slate">${trip.title} — ${toPersianDigits(places.length)} مکان</p>
      </div>
      <button type="button" class="btn btn-primary" data-add-place>${icon('plus', 16)}افزودن مکان</button>
    </header>

    <div class="mt-5 flex flex-wrap items-center gap-2">
      <div class="relative min-w-56 flex-1 sm:max-w-xs">
        <span class="pointer-events-none absolute inset-y-0 start-3 grid place-items-center text-faint">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4.2-4.2"/></svg>
        </span>
        <input type="search" class="input ps-10" placeholder="جستجو در مکان‌ها…" data-place-search aria-label="جستجو در مکان‌ها" />
      </div>
      <span data-place-filter-category></span>
    </div>

    ${
      places.length === 0
        ? `<section class="card mt-8 p-10 text-center">
            <span class="mx-auto grid size-16 place-items-center rounded-2xl bg-tint text-sky">${icon('marker', 28)}</span>
            <h2 class="mt-5 text-xl font-extrabold text-deep">هنوز مکانی ثبت نشده است.</h2>
            <p class="mx-auto mt-2 max-w-sm text-sm leading-8 text-slate">
              اولین مکان را اضافه کن؛ موقعیتش را روی نقشه انتخاب می‌کنی و مسیر سفر کامل‌تر می‌شود.
            </p>
            <button type="button" class="btn btn-primary mx-auto mt-6" data-empty-add>${icon('plus', 16)}افزودن اولین مکان</button>
          </section>`
        : `<section class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-place-grid aria-label="مکان‌ها"></section>
           <p class="mt-4 hidden text-center text-sm text-slate" data-no-results>موردی مطابق جستجو پیدا نشد.</p>`
    }
  `

  const grid = container.querySelector('[data-place-grid]')

  function visiblePlaces() {
    const q = filters.query.trim()
    return places.filter((place) => {
      if (filters.category !== 'all' && place.category !== filters.category) return false
      if (!q) return true
      return (
        place.name.includes(q) ||
        (place.address || '').includes(q) ||
        getCategory(place.category).label.includes(q)
      )
    })
  }

  function renderGrid() {
    if (!grid) return
    const list = visiblePlaces()
    grid.innerHTML = ''

    container.querySelector('[data-no-results]')?.classList.toggle('hidden', list.length > 0)

    if (!list.length && places.length) {
      return
    }

    list.forEach((place) => grid.appendChild(placeCard(place)))
  }

  function placeCard(place) {
    const cat = getCategory(place.category)

    const card = document.createElement('article')
    card.className = 'card card-hover flex flex-col overflow-hidden'
    card.innerHTML = `
      <button type="button" class="relative h-24 w-full text-start" style="background:linear-gradient(135deg, ${cat.color}26, ${cat.color}55)" data-open-details aria-label="جزئیات ${place.name}">
        <span class="absolute end-4 top-1/2 -translate-y-1/2 opacity-90" style="color:${cat.color}">
          ${icon(cat.icon, 34)}
        </span>
        <span class="badge absolute bottom-3 start-4 bg-white/85" style="color:${cat.color}">${cat.label}</span>
      </button>
      <div class="flex flex-1 flex-col p-4">
        <div class="flex items-start justify-between gap-2">
          <b class="min-w-0 truncate text-[14px] font-extrabold text-ink">${place.name}</b>
          <span data-card-menu class="relative shrink-0"></span>
        </div>
        <p class="mt-1 truncate text-xs text-slate">${place.address || 'بدون آدرس'}</p>
        ${place.note ? `<p class="mt-2 line-clamp-2 rounded-lg bg-tint p-2 text-[11px] leading-6 text-slate">${place.note}</p>` : ''}
        <div class="mt-auto flex items-center justify-between pt-3">
          <button type="button" class="btn btn-secondary btn-sm" data-show-on-map data-place-id="${place.id}">${icon('pin', 13)}روی نقشه</button>
          <button type="button" class="btn btn-ghost btn-sm" data-open-details-2>جزئیات</button>
        </div>
      </div>
    `

    const menuMount = card.querySelector('[data-card-menu]')
    menuMount.appendChild(
      createDropdown({
        ariaLabel: `کنش‌های ${place.name}`,
        manageLabel: false,
        trigger: (() => {
          const b = document.createElement('button')
          b.type = 'button'
          b.className = 'icon-btn border border-line'
          b.setAttribute('aria-label', 'گزینه‌های مکان')
          b.innerHTML = icon('dotsVertical')
          return b
        })(),
        items: [
          { value: 'edit', label: 'ویرایش مکان' },
          { value: 'map', label: 'نمایش روی نقشه' },
          { value: 'delete', label: 'حذف مکان' },
        ],
        onSelect: (value) => {
          if (value === 'edit') editPlace(place)
          else if (value === 'map') setMapFocus(place.id)
          else confirmDelete(place)
        },
      }).el,
    )

    card.querySelectorAll('[data-open-details], [data-open-details-2]').forEach((el) =>
      el.addEventListener('click', () => openDetails(place)),
    )
    card.querySelector('[data-show-on-map]').addEventListener('click', () => setMapFocus(place.id))

    return card
  }

  function openDetails(place) {
    const cat = getCategory(place.category)
    const drawer = createDrawer({
      title: place.name,
      side: 'start',
      content: `
        <div class="grid h-32 place-items-center rounded-xl" style="background:linear-gradient(135deg, ${cat.color}26, ${cat.color}59);color:${cat.color}">
          ${icon(cat.icon, 40)}
        </div>
        <dl class="mt-4 space-y-2.5 text-sm">
          <div class="flex justify-between gap-3"><dt class="text-slate">دسته‌بندی</dt><dd class="font-semibold">${cat.label}</dd></div>
          <div class="flex justify-between gap-3"><dt class="text-slate">آدرس</dt><dd class="max-w-52 text-end font-semibold">${place.address || '—'}</dd></div>
          <div class="flex justify-between gap-3"><dt class="text-slate">موقعیت</dt><dd class="font-semibold">${toPersianDigits(place.x)}٪ · ${toPersianDigits(place.y)}٪</dd></div>
          ${place.activityRef ? '<div class="flex justify-between gap-3"><dt class="text-slate">در برنامهٔ روزها</dt><dd><a href="#/timeline" class="font-bold text-sky">مشاهده</a></dd></div>' : ''}
        </dl>
        ${place.note ? `<p class="mt-3 rounded-lg bg-tint p-3 text-[13px] leading-7 text-slate">${place.note}</p>` : ''}
        <div class="mt-4 flex gap-2">
          <button type="button" class="btn btn-secondary btn-sm" data-d-map>${icon('pin', 13)}روی نقشه</button>
          <button type="button" class="btn btn-ghost btn-sm" data-d-edit>${icon('pencil', 13)}ویرایش</button>
        </div>
      `,
    })

    drawer.body.addEventListener('click', (e) => {
      if (e.target.closest('[data-d-map]')) {
        drawer.requestClose()
        setMapFocus(place.id)
      }
      if (e.target.closest('[data-d-edit]')) {
        drawer.requestClose()
        setTimeout(() => editPlace(place), 250)
      }
    })

    drawer.open()
  }

  function addPlace() {
    openPlaceModal({
      contextPlaces: places,
      onSave: (draft) => {
        placeService.create({
          tripId: trip.id,
          name: draft.name.trim(),
          category: draft.category,
          address: draft.address.trim(),
          note: draft.note.trim(),
          x: draft.coords.x,
          y: draft.coords.y,
        })
        toast.success(`مکان «${draft.name.trim()}» اضافه شد.`)
        render(container)
      },
    })
  }

  function editPlace(place) {
    openPlaceModal({
      place,
      contextPlaces: places.filter((p) => p.id !== place.id),
      onSave: (draft) => {
        placeService.update(place.id, {
          name: draft.name.trim(),
          category: draft.category,
          address: draft.address.trim(),
          note: draft.note.trim(),
          x: draft.coords.x,
          y: draft.coords.y,
        })
        toast.success('تغییرات ذخیره شد.')
        render(container)
      },
    })
  }

  function confirmDelete(place) {
    createModal({
      title: 'حذف مکان',
      description: `«${place.name}» از سفر حذف خواهد شد.`,
      size: 'sm',
      content: '<p class="text-sm leading-7 text-slate">این کار برگشت‌پذیر نیست.</p>',
      actions: [
        {
          label: 'حذف کن',
          onClick: (api) => {
            placeService.remove(place.id)
            api.requestClose()
            toast.success(`مکان «${place.name}» حذف شد.`)
            render(container)
          },
        },
        { label: 'انصراف', variant: 'btn-ghost', onClick: (api) => api.requestClose() },
      ],
    }).open()
  }

  container.querySelector('[data-add-place]')?.addEventListener('click', addPlace)
  container.querySelector('[data-empty-add]')?.addEventListener('click', addPlace)

  const searchInput = container.querySelector('[data-place-search]')
  searchInput?.addEventListener(
    'input',
    debounce(() => {
      filters.query = searchInput.value
      renderGrid()
    }, 160),
  )

  buildCategoryFilter(container)
  renderGrid()

  function buildCategoryFilter(root) {
    const mount = root.querySelector('[data-place-filter-category]')
    if (!mount) return

    let labelEl = null

    const dropdown = createDropdown({
      ariaLabel: 'فیلتر دسته‌بندی مکان‌ها',
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
        ...CATEGORIES.filter((c) => places.some((p) => p.category === c.key)).map((c) => ({
          value: c.key,
          label: c.label,
        })),
      ],
      onSelect: (value) => {
        filters.category = value
        labelEl.replaceChildren(value === 'all' ? 'همهٔ دسته‌ها' : getCategory(value).label)
        renderGrid()
      },
    })

    mount.appendChild(dropdown.el)
    labelEl = dropdown.el.querySelector('[data-filter-label]')
  }
}
