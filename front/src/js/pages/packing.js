import { tripService } from '../services/trips.js'
import { packingService } from '../services/packing.js'
import { openPackingModal } from '../components/packing-modal.js'
import { createDropdown } from '../components/dropdown.js'
import { createModal } from '../components/modal.js'
import { animateProgressBar } from '../components/progress.js'
import { toast } from '../components/toast.js'
import { PACKING_CATEGORIES, getPackingCategory } from '../data/packing-data.js'
import { icon } from '../shell/icons.js'
import { toPersianDigits } from '../utils/formatters.js'

export const meta = { title: 'چمدان' }

const filters = { category: 'all', status: 'all' }

export async function render(container) {
  const trip = tripService.getCurrent()
  if (!trip) return

  const items = packingService.listByTrip(trip.id)
  const summary = packingService.summaryOrFallback(trip)

  container.innerHTML = `
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-extrabold text-deep">آمادگی چمدان</h1>
        <p class="mt-1 text-sm text-slate">${trip.title} — ${toPersianDigits(items.length)} مورد در فهرست</p>
      </div>
      <button type="button" class="btn btn-primary" data-add-item>${icon('plus', 16)}افزودن آیتم</button>
    </header>

    ${
      items.length === 0
        ? `<section class="card mt-8 p-10 text-center">
            <span class="mx-auto grid size-16 place-items-center rounded-2xl bg-tint text-sky">${icon('bag', 28)}</span>
            <h2 class="mt-5 text-xl font-extrabold text-deep">چمدانت خالی است.</h2>
            <p class="mx-auto mt-2 max-w-sm text-sm leading-8 text-slate">
              اولین آیتم را اضافه کن؛ پیشنهاد ما: مدارک، شارژر و یک لباس راحت.
            </p>
            <button type="button" class="btn btn-primary mx-auto mt-6" data-empty-add>${icon('plus', 16)}افزودن اولین آیتم</button>
          </section>`
        : `
      <section class="card mt-5 p-6" aria-label="پیشرفت چمدان">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <b class="text-[15px] font-extrabold text-ink">آمادگی کلی</b>
          <span class="text-xs text-slate"><b data-pack-count class="font-extrabold text-deep">${toPersianDigits(summary.done)}</b> از ${toPersianDigits(summary.total)} مورد</span>
        </div>
        <div class="progress mt-3 h-3" role="progressbar" data-pack-bar aria-label="درصد آمادگی چمدان" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${summary.percent}">
          <div class="progress-fill" data-pack-fill></div>
        </div>
        <p class="mt-2 text-xs font-bold text-deep" data-pack-label></p>
      </section>

      <div class="mt-5 flex flex-wrap items-center gap-2">
        <span data-filter-category></span>
        <span data-filter-status></span>
      </div>

      <div class="mt-5 grid gap-5 lg:grid-cols-2" data-groups aria-label="آیتم‌های چمدان"></div>

      <p class="mt-6 hidden rounded-xl bg-tint p-5 text-center text-sm text-slate" data-no-match>با این فیلترها موردی پیدا نشد.</p>`
    }
  `

  const addBtn = container.querySelector('[data-add-item]')
  const emptyAdd = container.querySelector('[data-empty-add]')
  const handler = (event) => {
    openPackingModal({
      defaultCategory: filters.category === 'all' ? 'clothes' : filters.category,
      onSave: (draft) => {
        packingService.create({ ...draft, tripId: trip.id })
        toast.success(`«${draft.name.trim()}» به چمدان اضافه شد.`)
        render(container)
      },
    })
  }
  addBtn?.addEventListener('click', handler)
  emptyAdd?.addEventListener('click', handler)

  if (!items.length) return

  renderGroups(container, trip, items)
  buildFilters(container, trip, items)
}

function visibleItems(items) {
  return items.filter((item) => {
    if (filters.category !== 'all' && item.category !== filters.category) return false
    if (filters.status === 'done' && !item.done) return false
    if (filters.status === 'todo' && item.done) return false
    return true
  })
}

function renderGroups(container, trip, items) {
  const mount = container.querySelector('[data-groups]')
  const noMatch = container.querySelector('[data-no-match]')
  if (!mount) return

  const list = visibleItems(items)
  noMatch?.classList.toggle('hidden', list.length > 0)

  mount.innerHTML = ''

  const groups = PACKING_CATEGORIES.map((cat) => ({
    cat,
    rows: list.filter((item) => item.category === cat.key),
    totalInCategory: items.filter((item) => item.category === cat.key).length,
  })).filter((group) => group.rows.length > 0)

  groups.forEach(({ cat, rows }) => {
    const doneCount = rows.filter((r) => r.done).length

    const sectionEl = document.createElement('section')
    sectionEl.className = 'card overflow-hidden'
    sectionEl.innerHTML = `
      <header class="flex items-center gap-2.5 border-b border-line px-4 py-3">
        <span class="grid size-8 place-items-center rounded-lg" style="color:${cat.color};background:${cat.color}1f">${icon(cat.icon, 15)}</span>
        <b class="text-sm font-extrabold text-ink">${cat.label}</b>
        <span class="badge badge-info ms-auto">${toPersianDigits(doneCount)} از ${toPersianDigits(rows.length)}</span>
      </header>
      <ul class="divide-y divide-line" data-rows></ul>
    `

    const rowsMount = sectionEl.querySelector('[data-rows]')

    rows.forEach((item) => {
      const li = document.createElement('li')
      li.className = 'flex items-center gap-3 px-4 py-2.5'
      li.dataset.itemId = item.id
      li.innerHTML = `
        <button type="button" class="check-mini shrink-0 ${item.done ? 'is-done' : ''}" data-toggle aria-pressed="${item.done}" aria-label="${item.done ? 'خارج کردن از آماده‌ها' : 'علامت‌زدن به‌عنوان آماده'}">
          ${item.done ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>' : ''}
        </button>
        <span class="min-w-0 flex-1 truncate text-[13px] font-semibold ${item.done ? 'text-slate line-through decoration-success/50' : 'text-ink'}">
          ${item.name}
        </span>
        ${item.quantity > 1 ? `<span class="badge badge-info shrink-0">×${toPersianDigits(item.quantity)}</span>` : ''}
        <span data-row-menu class="relative shrink-0"></span>
      `

      li.querySelector('[data-toggle]').addEventListener('click', () => {
        packingService.toggleDone(item.id)
        refresh(container, trip)
      })

      li.querySelector('[data-row-menu]').appendChild(
        createDropdown({
          ariaLabel: `کنش‌های ${item.name}`,
          manageLabel: false,
          trigger: (() => {
            const b = document.createElement('button')
            b.type = 'button'
            b.className = 'icon-btn icon-btn-sm border border-line'
            b.setAttribute('aria-label', 'گزینه‌های آیتم')
            b.innerHTML = icon('dotsVertical')
            return b
          })(),
          items: [
            { value: 'edit', label: 'ویرایش' },
            { value: 'delete', label: 'حذف' },
          ],
          onSelect: (value) => {
            if (value === 'edit') {
              openPackingModal({
                item,
                onSave: (draft) => {
                  packingService.update(item.id, draft)
                  toast.success('آیتم به‌روزرسانی شد.')
                  refresh(container, trip)
                },
              })
            } else {
              confirmDelete(container, trip, item)
            }
          },
        }).el,
      )

      rowsMount.appendChild(li)
    })

    mount.appendChild(sectionEl)
  })
}

function refresh(container, trip) {
  const summary = packingService.summaryOrFallback(trip)
  const countEl = container.querySelector('[data-pack-count]')
  const barEl = container.querySelector('[data-pack-bar]')
  const fillEl = container.querySelector('[data-pack-fill]')
  const labelEl = container.querySelector('[data-pack-label]')

  if (countEl) countEl.textContent = toPersianDigits(summary.done)
  if (fillEl) fillEl.style.width = `${summary.percent}%`
  if (barEl) barEl.setAttribute('aria-valuenow', String(summary.percent))
  if (labelEl) labelEl.textContent = `${formatPercentFa(summary.percent)} آماده`

  const items = packingService.listByTrip(trip.id)
  renderGroups(container, trip, items)
}

function formatPercentFa(p) {
  return `${toPersianDigits(Math.round(p))}٪`
}

function confirmDelete(container, trip, item) {
  createModal({
    title: 'حذف آیتم',
    description: `«${item.name}» از چمدان حذف می‌شود.`,
    size: 'sm',
    content: '<p class="text-sm leading-7 text-slate">این کار برگشت‌پذیر نیست.</p>',
    actions: [
      {
        label: 'حذف کن',
        onClick: (api) => {
          packingService.remove(item.id)
          api.requestClose()
          toast.success('آیتم حذف شد.')
          render(container)
        },
      },
      { label: 'انصراف', variant: 'btn-ghost', onClick: (api) => api.requestClose() },
    ],
  }).open()
}

function buildFilters(container, trip, items) {
  let catLabel = null
  let statusLabel = null

  function makeTrigger(initialText) {
    const t = document.createElement('button')
    t.type = 'button'
    t.className = 'btn btn-secondary btn-sm'
    t.innerHTML = `<span data-filter-label>${initialText}</span>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`
    return t
  }

  const catDropdown = createDropdown({
    ariaLabel: 'فیلتر دستهٔ آیتم‌ها',
    manageLabel: false,
    trigger: makeTrigger('همهٔ دسته‌ها'),
    items: [
      { value: 'all', label: 'همهٔ دسته‌ها' },
      ...PACKING_CATEGORIES.filter((c) => items.some((i) => i.category === c.key)).map((c) => ({
        value: c.key,
        label: c.label,
      })),
    ],
    onSelect: (value) => {
      filters.category = value
      catLabel.replaceChildren(value === 'all' ? 'همهٔ دسته‌ها' : getPackingCategory(value).label)
      refresh(container, trip)
    },
  })
  catLabel = catDropdown.el.querySelector('[data-filter-label]')
  container.querySelector('[data-filter-category]')?.appendChild(catDropdown.el)

  const statusDropdown = createDropdown({
    ariaLabel: 'فیلتر وضعیت آیتم‌ها',
    manageLabel: false,
    trigger: makeTrigger('همهٔ وضعیت‌ها'),
    items: [
      { value: 'all', label: 'همهٔ وضعیت‌ها' },
      { value: 'done', label: 'آماده' },
      { value: 'todo', label: 'باقی‌مانده' },
    ],
    onSelect: (value) => {
      filters.status = value
      statusLabel.replaceChildren(
        { all: 'همهٔ وضعیت‌ها', done: 'آماده', todo: 'باقی‌مانده' }[value],
      )
      refresh(container, trip)
    },
  })
  statusLabel = statusDropdown.el.querySelector('[data-filter-label]')
  container.querySelector('[data-filter-status]')?.appendChild(statusDropdown.el)

  requestAnimationFrame(() =>
    animateProgressBar({
      bar: container.querySelector('[data-pack-bar]'),
      fill: container.querySelector('[data-pack-fill]'),
      label: container.querySelector('[data-pack-label]'),
      percent: packingService.summaryOrFallback(trip).percent,
      duration: 1.2,
    }),
  )
}
