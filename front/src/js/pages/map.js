import { tripService } from '../services/trips.js'
import { placeService } from '../services/places.js'
import { createMapView } from '../components/map-view.js'
import { createDropdown } from '../components/dropdown.js'
import { getCategory } from '../data/categories.js'
import { toast } from '../components/toast.js'
import { icon } from '../shell/icons.js'
import { toPersianDigits } from '../utils/formatters.js'

export const meta = { title: 'نقشه' }

const uiState = {
  selectedId: null,
  categoryFilter: 'all',
}

export async function render(container) {
  const trip = tripService.getCurrent()
  if (!trip) return

  const allPlaces = placeService.listByTrip(trip.id)

  container.innerHTML = `
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-extrabold text-deep">نقشهٔ سفر</h1>
        <p class="mt-1 text-sm text-slate">${trip.title} — ${allPlaces.length ? `${toPersianDigits(allPlaces.length)} مکان ثبت‌شده` : 'هنوز مکانی ثبت نشده'}</p>
      </div>
      ${
        allPlaces.length
          ? `<div class="flex flex-wrap items-center gap-2">
              <span data-map-filter-category></span>
              <span class="chip">${icon('route', 14)}مسیر ${toPersianDigits(allPlaces.length)} ایستگاه</span>
            </div>`
          : ''
      }
    </header>

    ${
      allPlaces.length === 0
        ? `<section class="card mt-8 p-10 text-center">
            <span class="mx-auto grid size-16 place-items-center rounded-2xl bg-tint text-sky">${icon('pin', 28)}</span>
            <h2 class="mt-5 text-xl font-extrabold text-deep">برای این سفر مکانی ثبت نشده است.</h2>
            <p class="mx-auto mt-2 max-w-sm text-sm leading-8 text-slate">
              با افزودن مکان‌ها به برنامه، مسیر سفرت اینجا به‌صورت زنده رسم می‌شود.
            </p>
          </section>`
        : `<div class="mt-5 grid gap-5 lg:grid-cols-[1fr_20rem]">
            <div data-map-mount></div>
            <aside class="card flex max-h-[32rem] flex-col overflow-hidden" aria-label="فهرست مکان‌ها">
              <div class="border-b border-line p-3">
                <b class="text-sm font-extrabold text-ink">مکان‌های سفر</b>
                <p class="mt-0.5 text-[11px] text-faint" data-list-count></p>
              </div>
              <div class="flex-1 overflow-y-auto p-2" data-place-list role="list"></div>
              <div class="border-t border-line p-4" data-place-details></div>
            </aside>
          </div>`
    }
  `

  if (!allPlaces.length) return

  const visible = () =>
    allPlaces.filter(
      (p) => uiState.categoryFilter === 'all' || p.category === uiState.categoryFilter,
    )

  const mapMount = container.querySelector('[data-map-mount]')
  const listEl = container.querySelector('[data-place-list]')
  const listCount = container.querySelector('[data-list-count]')
  const detailsEl = container.querySelector('[data-place-details]')

  const map = createMapView({
    onSelect: (id) => select(id, { fromMap: true }),
  })
  mapMount.appendChild(map.el)

  function renderList() {
    const places = visible()
    listEl.innerHTML = ''
    listCount.textContent = `${toPersianDigits(places.length)} مورد در نمایش فعلی`

    if (!places.length) {
      listEl.innerHTML =
        '<p class="p-6 text-center text-sm text-slate">در این دسته مکانی نیست؛ فیلتر را تغییر بده.</p>'
    }

    const catCount = new Map()
    allPlaces.forEach((p) => catCount.set(p.category, (catCount.get(p.category) || 0) + 1))

    places.forEach((place) => {
      const cat = getCategory(place.category)
      const row = document.createElement('button')
      row.type = 'button'
      row.className = `place-row ${uiState.selectedId === place.id ? 'is-active' : ''}`
      row.dataset.placeId = place.id
      row.setAttribute('role', 'listitem')
      row.innerHTML = `
        <span class="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg" style="color:${cat.color};background:${cat.color}1f">${icon(cat.icon, 15)}</span>
        <span class="min-w-0 flex-1">
          <b class="block truncate text-[13px] font-bold text-ink">${place.name}</b>
          <span class="mt-0.5 block truncate text-[11px] text-slate">${place.address || cat.label}</span>
        </span>
        <span class="shrink-0 text-[10px] font-bold text-faint">#${toPersianDigits((place.order ?? 0) + 1)}</span>
      `
      row.addEventListener('click', () => select(place.id, { focus: true }))
      listEl.appendChild(row)
    })
  }

  function renderDetails() {
    const place = allPlaces.find((p) => p.id === uiState.selectedId)

    if (!place) {
      detailsEl.innerHTML = `<p class="text-center text-xs leading-6 text-slate">یک مکان را از نقشه یا فهرست انتخاب کن تا جزئیاتش اینجا نمایش داده شود.</p>`
      return
    }

    const cat = getCategory(place.category)
    detailsEl.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <div class="flex min-w-0 items-center gap-2.5">
          <span class="grid size-9 shrink-0 place-items-center rounded-lg" style="color:${cat.color};background:${cat.color}1f">${icon(cat.icon, 16)}</span>
          <div class="min-w-0">
            <b class="block truncate text-sm font-extrabold text-ink">${place.name}</b>
            <span class="text-[11px] text-slate">${cat.label}${place.address ? ` · ${place.address}` : ''}</span>
          </div>
        </div>
        <button type="button" class="icon-btn icon-btn-sm" data-details-close aria-label="بستن جزئیات">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
      ${place.note ? `<p class="mt-2.5 rounded-lg bg-tint p-2.5 text-[11px] leading-6 text-slate">${place.note}</p>` : ''}
      <div class="mt-3 flex gap-2">
        ${
          place.activityRef
            ? `<a href="#/timeline" class="btn btn-secondary btn-sm">مشاهده در برنامه</a>`
            : ''
        }
        <button type="button" class="btn btn-ghost btn-sm" data-focus-marker>نمایش روی نقشه</button>
      </div>
    `

    detailsEl.querySelector('[data-details-close]').addEventListener('click', () => select(null))
    detailsEl.querySelector('[data-focus-marker]').addEventListener('click', () => {
      map.setSelected(place.id, { focus: true })
      toast.info(`${place.name} در مرکز نقشه قرار گرفت.`)
    })

    if (place.activityRef) {
      detailsEl.querySelector('a[href="#/timeline"]').addEventListener('click', () => {
        void place.activityRef
      })
    }
  }

  function select(id, { fromMap = false, focus = false } = {}) {
    uiState.selectedId = id
    map.setSelected(id, { focus: focus || !fromMap && Boolean(id) })
    renderList()
    renderDetails()

    listEl.querySelector('.is-active')?.scrollIntoView({ block: 'nearest' })

    if (fromMap && id) {
      const place = allPlaces.find((p) => p.id === id)
      if (place?.activityRef) {
        toast.info(`«${place.name}» در برنامهٔ روزها هم موجود است.`)
      }
    }
  }

  buildCategoryFilter(container)
  map.update(visible())
  select(null)

  function buildCategoryFilter(root) {
    const mount = root.querySelector('[data-map-filter-category]')
    if (!mount) return

    let triggerLabelEl = null

    const dropdown = createDropdown({
      ariaLabel: 'فیلتر دسته روی نقشه',
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
        ...[...new Set(allPlaces.map((p) => p.category))].map((key) => ({
          value: key,
          label: getCategory(key).label,
        })),
      ],
      onSelect: (value) => {
        uiState.categoryFilter = value
        triggerLabelEl.replaceChildren(
          value === 'all' ? 'همهٔ دسته‌ها' : getCategory(value).label,
        )
        uiState.selectedId = null
        map.update(visible())
        renderList()
        renderDetails()
      },
    })

    mount.appendChild(dropdown.el)
    triggerLabelEl = dropdown.el.querySelector('[data-filter-label]')
  }
}
