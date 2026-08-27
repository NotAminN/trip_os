import { tripService } from '../services/trips.js'
import { timelineService } from '../services/timeline.js'
import { getState } from '../state/app-state.js'
import { createActivityCard, createPlannerRow } from '../components/activity-card.js'
import { openActivityModal } from '../components/activity-modal.js'
import { createDropdown } from '../components/dropdown.js'
import { createModal } from '../components/modal.js'
import { toast } from '../components/toast.js'
import { icon } from '../shell/icons.js'
import { CATEGORIES, getCategory } from '../data/categories.js'
import { formatMoney, formatPercent } from '../utils/money.js'
import { toPersianDigits } from '../utils/formatters.js'

const uiState = {
  tripId: null,
  view: 'board',
  activeDayId: null,
  categoryFilter: 'all',
  statusFilter: 'all',
}

export const meta = { title: 'برنامه سفر' }

export async function render(container) {
  const trip = tripService.getCurrent()
  if (!trip) {
    container.innerHTML = ''
    return
  }

  if (uiState.tripId !== trip.id) {
    Object.assign(uiState, {
      tripId: trip.id,
      view: 'board',
      activeDayId: null,
      categoryFilter: 'all',
      statusFilter: 'all',
    })
  }

  let days = timelineService.getDays(trip)

  const totalActivities = days.reduce((n, d) => n + d.activities.length, 0)
  const totalCost = days.reduce((sum, d) => sum + d.cost, 0)

  if (!uiState.activeDayId && days.length) uiState.activeDayId = days[0].id

  container.innerHTML = `
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-extrabold text-deep">برنامهٔ سفر</h1>
        <p class="mt-1 text-sm text-slate">${trip.title} — ${trip.destination}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span class="chip">${icon('sparkle', 14)}${toPersianDigits(totalActivities)} فعالیت</span>
        <span class="chip">${icon('wallet', 14)}${formatMoney(totalCost)}</span>
        <button type="button" class="btn btn-primary" data-add-activity>${icon('plus', 16)}افزودن فعالیت</button>
      </div>
    </header>

    ${
      days.length === 0
        ? `<section class="card mt-8 p-10 text-center">
            <span class="mx-auto grid size-16 place-items-center rounded-2xl bg-tint text-sky">${icon('calendar', 28)}</span>
            <h2 class="mt-5 text-xl font-extrabold text-deep">هنوز روزی ساخته نشده است.</h2>
            <p class="mx-auto mt-2 max-w-sm text-sm leading-8 text-slate">
              می‌توانم بر اساس مدت سفر (${toPersianDigits(trip.daysCount)} روز)، ستون روزها را برایت آماده کنم؛ بعد هر فعالیتی را خواستی اضافه یا جابه‌جا کن.
            </p>
            <button type="button" class="btn btn-primary mx-auto mt-6" data-generate-days>ساخت خودکار روزها</button>
          </section>`
        : `
      <div class="tl-days-strip mt-5 -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 py-2 no-scrollbar" data-day-chips role="group" aria-label="انتخاب روز"></div>

      <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div class="tabs" role="tablist" aria-label="نمای برنامه">
          <button type="button" class="tab-btn" role="tab" aria-selected="true" data-view-btn="board">تایم‌لاین</button>
          <button type="button" class="tab-btn" role="tab" aria-selected="false" data-view-btn="planner">برنامهٔ روز</button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span data-filter-category></span>
          <span data-filter-status></span>
          <span class="hidden text-[11px] text-faint lg:inline">کارت‌ها را بکش و بین روزها جابه‌جا کن</span>
        </div>
      </div>

      <div data-board-wrap class="mt-4"></div>
    `
  }
  `

  container.querySelector('[data-generate-days]')?.addEventListener('click', () => {
    timelineService.generateDayShells(trip.id)
    uiState.activeDayId = null
    toast.success('روزهای سفر ساخته شد.')
    render(container)
  })

  if (!days.length) return

  bindViewTabs(container)
  buildFilters(container)
  renderDayChips(container, days)
  renderBody(container, trip, days)

  const addBtn = container.querySelector('[data-add-activity]')
  addBtn?.addEventListener('click', () => {
    const dayId =
      uiState.activeDayId ||
      timelineService.getDays(tripService.getCurrent())[0]?.id
    openActivityModal({
      dayLabel: dayLabelOf(days, dayId),
      onSave: (draft) => {
        timelineService.addActivity(trip.id, dayId, normalizeDraft(draft))
        toast.success('فعالیت به برنامه اضافه شد.')
        softRefresh(container, trip)
      },
    })
  })
}

function dayLabelOf(days, dayId) {
  return days.find((d) => d.id === dayId)?.title || 'روز سفر'
}

function normalizeDraft(draft) {
  return { ...draft, cost: Number(draft.cost) || 0 }
}

function passesFilters(activity) {
  if (uiState.categoryFilter !== 'all' && activity.category !== uiState.categoryFilter) return false
  if (uiState.statusFilter === 'done' && !activity.done) return false
  if (uiState.statusFilter === 'todo' && activity.done) return false
  return true
}

function bindViewTabs(container) {
  container.querySelectorAll('[data-view-btn]').forEach((btn) => {
    if (btn.dataset.viewBtn === uiState.view) btn.setAttribute('aria-selected', 'true')
    else btn.setAttribute('aria-selected', 'false')

    btn.addEventListener('click', () => {
      uiState.view = btn.dataset.viewBtn
      container.querySelectorAll('[data-view-btn]').forEach((b) =>
        b.setAttribute('aria-selected', String(b === btn)),
      )
      renderBody(container, tripService.getCurrent(), timelineService.getDays(tripService.getCurrent()))
    })
  })
}

function buildFilters(container) {
  const catMount = container.querySelector('[data-filter-category]')
  const statusMount = container.querySelector('[data-filter-status]')
  let catTriggerEl
  let statusTriggerEl

  function filterTrigger(initialLabel) {
    const t = document.createElement('button')
    t.type = 'button'
    t.className = 'btn btn-secondary btn-sm'
    t.innerHTML = `<span data-filter-label>${initialLabel}</span>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`
    return t
  }

  function syncTrigger(root, label) {
    root?.querySelector('[data-filter-label]')?.replaceChildren(label)
  }

  const presentCats = new Set()
  timelineService.getDays(tripService.getCurrent()).forEach((d) =>
    d.activities.forEach((a) => presentCats.add(a.category)),
  )

  const catDropdown = createDropdown({
    placeholder: 'همهٔ دسته‌ها',
    ariaLabel: 'فیلتر دسته‌بندی',
    selectedValue: uiState.categoryFilter,
    manageLabel: false,
    trigger: filterTrigger('همهٔ دسته‌ها'),
    items: [
      { value: 'all', label: 'همهٔ دسته‌ها' },
      ...CATEGORIES.filter((c) => presentCats.has(c.key)).map((c) => ({
        value: c.key,
        label: c.label,
      })),
    ],
    onSelect: (value) => {
      uiState.categoryFilter = value
      syncTrigger(catTriggerEl, value === 'all' ? 'همهٔ دسته‌ها' : getCategory(value).label)
      renderBody(container, tripService.getCurrent(), timelineService.getDays(tripService.getCurrent()))
    },
  })

  catTriggerEl = catDropdown.el.firstElementChild
  catMount?.appendChild(catDropdown.el)

  const statusDropdown = createDropdown({
    placeholder: 'همهٔ وضعیت‌ها',
    ariaLabel: 'فیلتر وضعیت',
    selectedValue: uiState.statusFilter,
    manageLabel: false,
    trigger: filterTrigger('همهٔ وضعیت‌ها'),
    items: [
      { value: 'all', label: 'همهٔ وضعیت‌ها' },
      { value: 'done', label: 'انجام‌شده' },
      { value: 'todo', label: 'باقی‌مانده' },
    ],
    onSelect: (value) => {
      uiState.statusFilter = value
      syncTrigger(
        statusTriggerEl,
        { all: 'همهٔ وضعیت‌ها', done: 'انجام‌شده', todo: 'باقی‌مانده' }[value],
      )
      renderBody(container, tripService.getCurrent(), timelineService.getDays(tripService.getCurrent()))
    },
  })

  statusTriggerEl = statusDropdown.el.firstElementChild
  statusMount?.appendChild(statusDropdown.el)
}

function renderDayChips(container, days) {
  const strip = container.querySelector('[data-day-chips]')
  strip.innerHTML = ''

  days.forEach((day) => {
    const chip = document.createElement('button')
    chip.type = 'button'
    chip.className = 'day-chip'
    chip.dataset.dayId = day.id
    chip.setAttribute('aria-pressed', String(day.id === uiState.activeDayId))
    const dotColor = day.completion >= 100 ? '#3F9673' : day.completion > 0 ? '#C08A35' : '#DDE8F1'
    chip.innerHTML = `
      <span>${day.title.replace('روز ', 'روز ')}</span>
      <small class="flex items-center gap-1">
        <span style="width:.45rem;height:.45rem;border-radius:99px;background:${dotColor};display:inline-block"></span>
        ${day.weather ? day.weather.temp : `${toPersianDigits(day.activities.length)} کار`}
      </small>
    `
    chip.addEventListener('click', () => {
      uiState.activeDayId = day.id
      renderDayChips(container, days)
      if (uiState.view === 'planner') {
        renderBody(container, tripService.getCurrent(), days)
      } else {
        container.querySelector(`[data-col-id="${day.id}"]`)?.scrollIntoView({
          behavior: 'smooth',
          inline: 'start',
          block: 'nearest',
        })
      }
    })
    strip.appendChild(chip)
  })
}

function softRefresh(container, trip) {
  const board = container.querySelector('[data-board-wrap] .tl-board')
  const scrollLeft = board?.scrollLeft ?? 0
  render(container)
  requestAnimationFrame(() => {
    const nextBoard = container.querySelector('[data-board-wrap] .tl-board')
    if (nextBoard && scrollLeft) nextBoard.scrollLeft = scrollLeft
  })
  void trip
}

function renderBody(container, trip, days) {
  const wrap = container.querySelector('[data-board-wrap]')
  if (!wrap) return
  wrap.innerHTML = ''

  if (!days.some((d) => d.id === uiState.activeDayId)) {
    uiState.activeDayId = days[0].id
  }

  if (uiState.view === 'board') renderBoard(wrap, trip, days)
  else renderPlanner(wrap, trip, days)
}

function renderBoard(wrap, trip, days) {
  const board = document.createElement('div')
  board.className = 'tl-board'
  board.setAttribute('role', 'list')
  board.setAttribute('aria-label', 'ستون‌های روزهای سفر')

  const placeholderEl = document.createElement('div')
  placeholderEl.className = 'drop-placeholder'
  placeholderEl.hidden = true

  let dragCtx = null

  days.forEach((day) => {
    const col = document.createElement('section')
    col.className = 'tl-col'
    col.dataset.colId = day.id
    col.setAttribute('aria-label', day.title)

    const visibleActs = day.activities.filter(passesFilters)
    const shownCount = visibleActs.length
    const totalCount = day.activities.length

    col.innerHTML = `
      <header class="border-b border-line p-4">
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="text-sm font-extrabold text-deep">${day.title}</p>
            <p class="text-[11px] text-slate">${day.date || ''}</p>
          </div>
          ${day.weather ? `<span class="pill pill-warm">${day.weather.temp} · ${day.weather.cond}</span>` : ''}
        </div>
        <div class="mt-2.5 flex items-center gap-2 text-[11px] text-slate">
          <span>${icon('clock', 12)} ${toPersianDigits(shownCount)}${shownCount !== totalCount ? ` از ${toPersianDigits(totalCount)}` : ''} فعالیت</span>
          <span>·</span>
          <b class="font-bold text-ink">${formatMoney(day.cost)}</b>
          <b class="ms-auto font-extrabold" style="color:${day.completion >= 100 ? 'var(--color-success)' : 'var(--color-warning)'}">${formatPercent(day.completion)}</b>
        </div>
      </header>
      <div data-acts class="flex min-h-24 flex-col gap-2 p-3" role="list"></div>
      <footer class="mt-auto border-t border-line p-3">
        <button type="button" class="btn btn-ghost btn-sm w-full" data-add-day="${day.id}">
          ${icon('plus', 14)}افزودن فعالیت
        </button>
      </footer>
    `

    const actsMount = col.querySelector('[data-acts]')
    visibleActs.forEach((activity) => {
      const card = createActivityCard({
        activity,
        draggable: true,
        onToggle: (id) => {
          timelineService.toggleDone(trip.id, day.id, id)
          softRefresh(wrap.closest('[data-view]') || document.body, trip)
        },
      })

      card.addEventListener('dragstart', (e) => {
        dragCtx = { fromDayId: day.id, activityId: activity.id }
        card.classList.add('is-dragging')
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', activity.id)
      })
      card.addEventListener('dragend', () => {
        dragCtx = null
        card.classList.remove('is-dragging')
        clearDropHints(board)
      })

      actsMount.appendChild(card)
    })

    col.addEventListener('dragover', (e) => {
      if (!dragCtx) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      col.classList.add('is-drop-target')
      positionPlaceholder(actsMount, placeholderEl, e.clientY)
    })

    col.addEventListener('drop', (e) => {
      e.preventDefault()
      if (!dragCtx) return
      const rawIndex = Array.from(actsMount.children).indexOf(placeholderEl)
      const index = rawIndex < 0 ? actsMount.children.length : rawIndex
      timelineService.moveActivity(trip.id, dragCtx.fromDayId, dragCtx.activityId, day.id, index)
      dragCtx = null
      clearDropHints(board)
      toast.success('برنامهٔ سفر به‌روزرسانی شد.')
      softRefresh(wrap.closest('[data-view]') || document.body, trip)
    })

    board.appendChild(col)
  })

  function positionPlaceholder(actsMount, ph, clientY) {
    ph.hidden = false
    const cards = Array.from(actsMount.children).filter((c) => c !== ph)
    let insertAt = cards.length
    for (let i = 0; i < cards.length; i += 1) {
      const rect = cards[i].getBoundingClientRect()
      if (clientY < rect.top + rect.height / 2) {
        insertAt = i
        break
      }
    }
    if (insertAt >= cards.length) actsMount.appendChild(ph)
    else actsMount.insertBefore(ph, cards[insertAt])
  }

  function clearDropHints(scope) {
    placeholderEl.hidden = true
    placeholderEl.remove()
    scope.querySelectorAll('.is-drop-target').forEach((el) => el.classList.remove('is-drop-target'))
  }

  board.addEventListener('dragleave', (e) => {
    const col = e.target.closest('.tl-col')
    if (col && !col.contains(e.relatedTarget)) {
      col.classList.remove('is-drop-target')
      placeholderEl.hidden = true
      placeholderEl.remove()
    }
  })

  wrap.appendChild(board)
  bindColumnAddButtons(wrap, trip, days)
}

function bindColumnAddButtons(wrap, trip, days) {
  wrap.querySelectorAll('[data-add-day]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const dayId = btn.dataset.addDay
      openActivityModal({
        dayLabel: dayLabelOf(days, dayId),
        onSave: (draft) => {
          timelineService.addActivity(trip.id, dayId, normalizeDraft(draft))
          toast.success('فعالیت به برنامه اضافه شد.')
          softRefresh(wrap.closest('[data-view]') || document.body, trip)
        },
      })
    })
  })
}

function renderPlanner(wrap, trip, days) {
  const day = days.find((d) => d.id === uiState.activeDayId) || days[0]
  uiState.activeDayId = day.id

  const section = document.createElement('div')
  section.className = 'space-y-4'

  const visible = day.activities.map((a, i) => ({ a, i })).filter(({ a }) => passesFilters(a))

  section.innerHTML = `
    <div class="card flex flex-wrap items-center justify-between gap-3 p-4">
      <div class="flex items-center gap-3">
        <button type="button" class="icon-btn border border-line" data-prev-day ${days.indexOf(day) === 0 ? 'disabled style="opacity:.35"' : ''} aria-label="روز قبل">${icon('arrowUp', 16)}</button>
        <div>
          <p class="text-sm font-extrabold text-deep">${day.title} — برنامهٔ دقیق</p>
          <p class="text-[11px] text-slate">${day.date || ''} · ${toPersianDigits(visible.length)} فعالیت · ${formatMoney(day.cost)} · تکمیل ${formatPercent(day.completion)}</p>
        </div>
        ${day.weather ? `<span class="pill pill-warm ms-auto">${day.weather.temp} · ${day.weather.cond}</span>` : ''}
      </div>
      <div class="flex items-center gap-2">
        <button type="button" class="icon-btn border border-line" data-next-day ${days.indexOf(day) === days.length - 1 ? 'disabled style="opacity:.35"' : ''} aria-label="روز بعد" style="rotate:180deg">${icon('arrowUp', 16)}</button>
        <button type="button" class="btn btn-primary btn-sm" data-planner-add>${icon('plus', 14)}فعالیت تازه</button>
      </div>
    </div>
    <div class="space-y-3" data-planner-list role="list"></div>
  `

  const list = section.querySelector('[data-planner-list]')

  if (!visible.length) {
    list.innerHTML = `<p class="rounded-xl bg-tint p-6 text-center text-sm text-slate">با فیلترهای فعلی موردی در این روز نیست.</p>`
  }

  visible.forEach(({ a: activity, i }) => {
    list.appendChild(
      createPlannerRow({
        activity,
        index: i,
        total: day.activities.length,
        onToggle: (id) => {
          timelineService.toggleDone(trip.id, day.id, id)
          softRefresh(wrap.closest('[data-view]') || document.body, trip)
        },
        onEdit: (activityToEdit) => {
          openActivityModal({
            dayLabel: day.title,
            activity: activityToEdit,
            onSave: (draft) => {
              timelineService.updateActivity(trip.id, day.id, activityToEdit.id, normalizeDraft(draft))
              toast.success('تغییرات ذخیره شد.')
              softRefresh(wrap.closest('[data-view]') || document.body, trip)
            },
          })
        },
        onDelete: (target) => {
          createModal({
            title: 'حذف فعالیت',
            description: `«${target.title}» از ${day.title} حذف می‌شود.`,
            size: 'sm',
            content: '<p class="text-sm leading-7 text-slate">این کار برگشت‌پذیر نیست.</p>',
            actions: [
              {
                label: 'حذف کن',
                onClick: (api) => {
                  timelineService.removeActivity(trip.id, day.id, target.id)
                  api.requestClose()
                  toast.success('فعالیت حذف شد.')
                  softRefresh(wrap.closest('[data-view]') || document.body, trip)
                },
              },
              { label: 'انصراف', variant: 'btn-ghost', onClick: (api) => api.requestClose() },
            ],
          }).open()
        },
        onMove: (id, delta) => {
          timelineService.nudgeActivity(trip.id, day.id, id, delta)
          softRefresh(wrap.closest('[data-view]') || document.body, trip)
        },
      }),
    )
  })

  section.querySelector('[data-prev-day]')?.addEventListener('click', () => {
    const idx = days.indexOf(day)
    if (idx > 0) {
      uiState.activeDayId = days[idx - 1].id
      renderDayChips(section.closest('[data-view]'), days)
      renderBody(section.closest('[data-view]'), trip, days)
    }
  })

  section.querySelector('[data-next-day]')?.addEventListener('click', () => {
    const idx = days.indexOf(day)
    if (idx < days.length - 1) {
      uiState.activeDayId = days[idx + 1].id
      renderDayChips(section.closest('[data-view]'), days)
      renderBody(section.closest('[data-view]'), trip, days)
    }
  })

  section.querySelector('[data-planner-add]')?.addEventListener('click', () => {
    openActivityModal({
      dayLabel: day.title,
      onSave: (draft) => {
        timelineService.addActivity(trip.id, day.id, normalizeDraft(draft))
        toast.success('فعالیت به برنامه اضافه شد.')
        softRefresh(wrap.closest('[data-view]') || document.body, trip)
      },
    })
  })

  wrap.appendChild(section)
}
