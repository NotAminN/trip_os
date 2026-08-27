import { tripService } from '../services/trips.js'
import { budgetService, getSpentOrFallback } from '../services/budget.js'
import { timelineService } from '../services/timeline.js'
import { getState, setState } from '../state/app-state.js'
import { openExpenseModal } from '../components/expense-modal.js'
import { createModal } from '../components/modal.js'
import { createDropdown } from '../components/dropdown.js'
import { createDonutChart } from '../components/donut.js'
import { toast } from '../components/toast.js'
import { BUDGET_CATEGORIES, getBudgetCategory } from '../data/budget-data.js'
import { icon } from '../shell/icons.js'
import { formatMoney, formatPercent } from '../utils/money.js'
import { toPersianDigits } from '../utils/formatters.js'

export const meta = { title: 'بودجه' }

export async function render(container) {
  const trip = tripService.getCurrent()
  if (!trip) return

  const currency = getState().currency
  const money = (amount) => formatMoney(amount, currency)

  const expenses = budgetService.listByTrip(trip.id)
  const spent = getSpentOrFallback(trip)
  const remaining = Math.max(0, trip.budget.total - spent)
  const spentPct = Math.min(100, Math.round((spent / (trip.budget.total || 1)) * 100))
  const dailyAvg = Math.round(trip.budget.total / (trip.daysCount || 1))

  const days = timelineService.getDays(trip)
  const dayOptions = days.map((d) => ({ value: d.id, label: `${d.title}${d.date ? ` — ${d.date}` : ''}` }))
  const dayLabel = (dayId) => {
    if (!dayId) return 'عمومی'
    return days.find((d) => d.id === dayId)?.title?.replace('روز ', 'روز ') || 'عمومی'
  }

  const byCategory = BUDGET_CATEGORIES.map((cat) => {
    const items = expenses.filter((e) => e.category === cat.key)
    const total = items.reduce((s, e) => s + e.amount, 0)
    return { ...cat, count: items.length, total }
  }).filter((row) => row.count > 0)

  const donutSegments = [...byCategory].sort((a, b) => b.total - a.total).map((c) => ({
    value: c.total,
    color: c.color,
    label: c.label,
  }))

  const plannedByDay = new Map(days.map((d) => [d.id, d.cost]))
  const actualByDay = new Map()
  expenses.forEach((e) => {
    if (!e.dayId) return
    actualByDay.set(e.dayId, (actualByDay.get(e.dayId) || 0) + e.amount)
  })

  container.innerHTML = `
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-extrabold text-deep">بودجهٔ سفر</h1>
        <p class="mt-1 text-sm text-slate">${trip.title} · ${toPersianDigits(expenses.length)} هزینهٔ ثبت‌شده</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span data-currency-mount></span>
        <button type="button" class="btn btn-primary" data-add-expense>${icon('plus', 16)}ثبت هزینه</button>
      </div>
    </header>

    <section class="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="خلاصهٔ بودجه">
      <article class="card stat-card">${icon('wallet')}<b>${money(trip.budget.total)}</b><span>بودجهٔ کل سفر</span></article>
      <article class="card stat-card">${icon('chart')}<b>${money(spent)}</b><span>مصرف‌شده تا امروز (${formatPercent(spentPct)})</span></article>
      <article class="card stat-card">${icon('checkCircle')}<b>${money(remaining)}</b><span>باقی‌مانده</span></article>
      <article class="card stat-card">${icon('calendar')}<b>${money(dailyAvg)}</b><span>سقف پیشنهادی هر روز</span></article>
    </section>

    <section class="card mt-5 p-5" aria-label="پیشرفت مصرف">
      <div class="flex items-center justify-between text-xs text-slate">
        <span>${money(spent)} از ${money(trip.budget.total)}</span>
        <b class="font-extrabold ${spentPct > 85 ? 'text-danger' : 'text-deep'}">${formatPercent(spentPct)}</b>
      </div>
      <div class="progress mt-2 h-2.5" role="progressbar" aria-label="مصرف بودجه" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${spentPct}">
        <div class="progress-fill" style="width:${spentPct}%"></div>
      </div>
    </section>

    <div class="mt-5 grid gap-5 lg:grid-cols-[auto_1fr]">
      <section class="card p-6" aria-label="توزیع دسته‌ها">
        <h2 class="mb-4 text-[15px] font-extrabold text-ink">توزیع هزینه‌ها</h2>
        <div data-donut-mount class="flex justify-center"></div>
      </section>

      <section class="card overflow-hidden" aria-label="جزئیات دسته‌ها">
        <header class="border-b border-line px-5 py-3.5">
          <h2 class="text-[15px] font-extrabold text-ink">تفکیک بر اساس دسته</h2>
        </header>
        <ul class="divide-y divide-line" data-category-list></ul>
      </section>
    </div>

    <div class="mt-5 grid gap-5 lg:grid-cols-2">
      <section class="card overflow-hidden" aria-label="خرج روزانه">
        <header class="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 class="text-[15px] font-extrabold text-ink">خرج روزانه</h2>
          <span data-most-expensive class="badge badge-warn"></span>
        </header>
        <div class="space-y-3 p-5" data-daily-bars></div>
      </section>

      <section class="card overflow-hidden" aria-label="برآورد در مقابل واقعی">
        <header class="border-b border-line px-5 py-3.5">
          <h2 class="text-[15px] font-extrabold text-ink">برنامه‌ریزی‌شده ↔ واقعی</h2>
        </header>
        <div class="overflow-x-auto p-2" data-compare-table></div>
      </section>
    </div>

    <section class="card mt-5 overflow-hidden" aria-label="دفتر هزینه‌ها">
      <header class="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <h2 class="text-[15px] font-extrabold text-ink">دفتر هزینه‌ها</h2>
        <span data-ledger-filter></span>
      </header>
      <ul class="divide-y divide-line" data-ledger></ul>
    </section>
  `

  buildCurrencySwitcher(container)
  bindAddButton(container)

  const donutMount = container.querySelector('[data-donut-mount]')
  if (donutSegments.length) {
    const chart = createDonutChart({
      segments: donutSegments,
      centerTitle: money(spent),
      centerSub: 'مجموع مصرف',
      size: 168,
    })
    donutMount.appendChild(chart.el)
    setTimeout(() => chart.animateIn({ delay: 0.15 }), 80)
  } else {
    donutMount.innerHTML =
      '<p class="py-10 text-center text-sm text-slate">هنوز هزینه‌ای ثبت نشده تا نمودار ساخته شود.</p>'
  }

  renderCategoryList(container, byCategory, spent, money)
  renderDailyBars(container, { days, actualByDay, plannedByDay, money })
  renderCompareTable(container, { days, actualByDay, plannedByDay, money })
  renderLedger(container, { expenses, dayOptions, dayLabel, money })

  function rerender() {
    render(container)
  }

  function bindAddButton(root) {
    root.querySelector('[data-add-expense]')?.addEventListener('click', () => {
      openExpenseModal({
        dayOptions,
        onSave: (draft) => {
          budgetService.create({ ...draft, tripId: trip.id })
          toast.success('هزینه ثبت شد.')
          rerender()
        },
      })
    })
  }

  function buildCurrencySwitcher(root) {
    const mount = root.querySelector('[data-currency-mount]')
    let labelEl = null

    const dropdown = createDropdown({
      ariaLabel: 'واحد پول نمایش',
      manageLabel: false,
      selectedValue: currency,
      trigger: (() => {
        const t = document.createElement('button')
        t.type = 'button'
        t.className = 'btn btn-secondary btn-sm'
        t.innerHTML = `<span data-filter-label></span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`
        return t
      })(),
      items: [
        { value: 'IRT', label: 'تومان' },
        { value: 'USD', label: 'دلار ($)' },
        { value: 'EUR', label: 'یورو (€)' },
        { value: 'GBP', label: 'پوند (£)' },
      ],
      onSelect: (value, item) => {
        setState({ currency: value })
        toast.info(`نمایش قیمت‌ها به ${item.label} تغییر کرد.`)
        setTimeout(() => render(container), 30)
      },
    })

    mount.appendChild(dropdown.el)
    const currentLabel = dropdown.el.querySelector('[data-filter-label]')
    currentLabel.replaceChildren(
      { IRT: 'تومان', USD: '$ دلار', EUR: '€ یورو', GBP: '£ پوند' }[currency] || 'تومان',
    )
  }
}

function renderCategoryList(container, rows, spent, money) {
  const list = container.querySelector('[data-category-list]')
  list.innerHTML = rows.length
    ? ''
    : '<li class="p-6 text-center text-sm text-slate">دسته‌ای برای نمایش نیست.</li>'

  rows.forEach((row) => {
    const pct = spent ? Math.round((row.total / spent) * 100) : 0
    const li = document.createElement('li')
    li.className = 'px-5 py-3'
    li.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="legend-dot" style="background:${row.color}"></span>
        <span class="flex items-center gap-1.5 text-[13px] font-bold text-ink"><span style="color:${row.color}">${icon(row.icon, 14)}</span>${row.label}</span>
        <span class="text-[11px] text-faint">${toPersianDigits(row.count)} مورد</span>
        <b class="ms-auto text-[13px] font-extrabold text-ink">${money(row.total)}</b>
        <span class="w-12 text-end text-[11px] font-bold text-slate">${formatPercent(pct)}</span>
      </div>
      <div class="progress mt-2 h-1"><div class="progress-fill" style="width:${Math.min(100, pct)}%;background:${row.color}"></div></div>
    `
    list.appendChild(li)
  })
}

function renderDailyBars(container, { days, actualByDay, money }) {
  const mount = container.querySelector('[data-daily-bars]')
  const rows = days.map((d) => ({ id: d.id, label: d.title.replace('روز ', 'روز '), amount: actualByDay.get(d.id) || 0 }))
  const max = Math.max(...rows.map((r) => r.amount), 1)
  const heaviest = rows.reduce((best, r) => (r.amount > best.amount ? r : best), rows[0])

  container.querySelector('[data-most-expensive]').textContent =
    heaviest.amount > 0 ? `گران‌ترین روز: ${heaviest.label}` : '—'

  mount.innerHTML = rows.length
    ? ''
    : '<p class="text-center text-sm text-slate">داده‌ای برای نمایش نیست.</p>'

  rows.forEach((row) => {
    const pct = Math.round((row.amount / max) * 100)
    const bar = document.createElement('div')
    bar.innerHTML = `
      <div class="flex items-center justify-between text-xs">
        <span class="font-bold text-slate">${row.label}</span>
        <b class="font-extrabold ${row.amount === heaviest.amount && row.amount > 0 ? 'text-warning' : 'text-ink'}">${money(row.amount)}</b>
      </div>
      <div class="progress mt-1.5 h-2"><div class="progress-fill" style="width:${pct}%"></div></div>
    `
    mount.appendChild(bar)
  })
}

function renderCompareTable(container, { days, actualByDay, plannedByDay, money }) {
  const mount = container.querySelector('[data-compare-table]')

  const rows = days.map((d) => {
    const planned = plannedByDay.get(d.id) || 0
    const actual = actualByDay.get(d.id) || 0
    return { label: d.title, planned, actual, diff: actual - planned }
  })

  mount.innerHTML = `
    <table class="w-full min-w-96 text-start text-[13px]">
      <thead>
        <tr class="text-[11px] text-faint">
          <th class="px-3 py-2 text-start font-bold">روز</th>
          <th class="px-3 py-2 text-start font-bold">برنامه</th>
          <th class="px-3 py-2 text-start font-bold">واقعی</th>
          <th class="px-3 py-2 text-start font-bold">اختلاف</th>
        </tr>
      </thead>
      <tbody>
        ${
          rows.map((r) => {
            const over = r.diff > 0
            const neutral = r.planned === 0
            return `<tr class="border-t border-line">
              <td class="px-3 py-2.5 font-bold text-ink">${r.label.replace('روز ', '')}</td>
              <td class="px-3 py-2.5 text-slate">${money(r.planned)}</td>
              <td class="px-3 py-2.5 font-bold text-ink">${money(r.actual)}</td>
              <td class="px-3 py-2.5 font-bold ${neutral ? 'text-faint' : over ? 'text-danger' : 'text-success'}">
                ${neutral ? '—' : `${over ? '+' : '−'}${money(Math.abs(r.diff))}`}
              </td>
            </tr>`
          }).join('')
        }
      </tbody>
    </table>
  `
}

function renderLedger(container, { expenses, dayOptions, dayLabel, money }) {
  const list = container.querySelector('[data-ledger]')
  const filterMount = container.querySelector('[data-ledger-filter]')
  let filterValue = 'all'

  function renderRows() {
    const filtered =
      filterValue === 'all' ? expenses : expenses.filter((e) => e.category === filterValue)

    list.innerHTML = filtered.length
      ? ''
      : '<li class="p-8 text-center text-sm text-slate">هزینه‌ای در این دسته ثبت نشده است.</li>'

    filtered.forEach((expense) => {
      const cat = getBudgetCategory(expense.category)
      const li = document.createElement('li')
      li.className = 'flex items-center gap-3 px-5 py-3'
      li.innerHTML = `
        <span class="grid size-9 shrink-0 place-items-center rounded-lg" style="color:${cat.color};background:${cat.color}1f">${icon(cat.icon, 16)}</span>
        <div class="min-w-0 flex-1">
          <b class="block truncate text-[13px] font-bold text-ink">${expense.title}</b>
          <span class="text-[11px] text-slate">${cat.label} · ${dayLabel(expense.dayId)}</span>
        </div>
        <b class="shrink-0 text-[13px] font-extrabold text-ink">${money(expense.amount)}</b>
        <span class="relative shrink-0" data-row-menu></span>
      `

      li.querySelector('[data-row-menu]').appendChild(
        createDropdown({
          ariaLabel: `کنش‌های ${expense.title}`,
          manageLabel: false,
          trigger: (() => {
            const b = document.createElement('button')
            b.type = 'button'
            b.className = 'icon-btn icon-btn-sm border border-line'
            b.setAttribute('aria-label', 'گزینه‌های هزینه')
            b.innerHTML = icon('dotsVertical')
            return b
          })(),
          items: [
            { value: 'edit', label: 'ویرایش' },
            { value: 'delete', label: 'حذف' },
          ],
          onSelect: (value) => {
            if (value === 'edit') editExpense(expense)
            else confirmDelete(expense)
          },
        }).el,
      )

      list.appendChild(li)
    })
  }

  function editExpense(expense) {
    openExpenseModal({
      expense,
      dayOptions,
      onSave: (draft) => {
        budgetService.update(expense.id, draft)
        toast.success('هزینه به‌روزرسانی شد.')
        render(container)
      },
    })
  }

  function confirmDelete(expense) {
    createModal({
      title: 'حذف هزینه',
      description: `«${expense.title}» حذف خواهد شد.`,
      size: 'sm',
      content: '<p class="text-sm leading-7 text-slate">این کار برگشت‌پذیر نیست.</p>',
      actions: [
        {
          label: 'حذف کن',
          onClick: (api) => {
            budgetService.remove(expense.id)
            api.requestClose()
            toast.success('هزینه حذف شد.')
            render(container)
          },
        },
        { label: 'انصراف', variant: 'btn-ghost', onClick: (api) => api.requestClose() },
      ],
    }).open()
  }

  const dropdown = createDropdown({
    ariaLabel: 'فیلتر دفتر هزینه',
    placeholder: 'همهٔ دسته‌ها',
    items: [{ value: 'all', label: 'همهٔ دسته‌ها' }, ...BUDGET_CATEGORIES.map((c) => ({ value: c.key, label: c.label }))],
    onSelect: (value) => {
      filterValue = value
      renderRows()
    },
  })
  filterMount.appendChild(dropdown.el)

  renderRows()
}
