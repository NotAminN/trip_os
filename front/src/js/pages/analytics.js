import { tripService } from '../services/trips.js'
import { timelineService } from '../services/timeline.js'
import { placeService } from '../services/places.js'
import { budgetService } from '../services/budget.js'
import { packingService } from '../services/packing.js'
import { computeTripAnalytics } from '../services/analytics.js'
import { createDonutChart } from '../components/donut.js'
import { getState } from '../state/app-state.js'
import { icon } from '../shell/icons.js'
import { formatMoney, formatPercent } from '../utils/money.js'
import { toPersianDigits } from '../utils/formatters.js'

export const meta = { title: 'آمار سفر' }

export async function render(container) {
  const trip = tripService.getCurrent()
  if (!trip) return

  const currency = getState().currency
  const money = (amount) => formatMoney(amount, currency)

  const days = timelineService.getDays(trip)
  const places = placeService.listByTrip(trip.id)
  const expenses = budgetService.listByTrip(trip.id)
  const packing = packingService.summary(trip.id)

  const a = computeTripAnalytics({ trip, days, places, expenses, packing })

  container.innerHTML = `
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-extrabold text-deep">آمار سفر</h1>
        <p class="mt-1 text-sm text-slate">${trip.title} — تصویر کامل از آمادگی و خرج</p>
      </div>
      <span class="chip">${icon('chart', 14)}به‌روزرسانی زنده از دادهٔ سفر</span>
    </header>

    <section class="card mt-5 grid gap-8 p-6 lg:grid-cols-[auto_1fr] lg:items-center" aria-label="پیشرفت کلی">
      <div data-ring-mount class="mx-auto"></div>
      <div>
        <div class="grid gap-x-8 gap-y-5 sm:grid-cols-2" data-breakdown></div>
      </div>
    </section>

    <section class="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="اعداد کلیدی">
      <article class="card stat-card">${icon('route')}<b>${a.totals.distance}<small class="text-sm font-bold text-slate"> km</small></b><span>مسیر برنامه‌ریزی‌شده</span></article>
      <article class="card stat-card">${icon('marker')}<b>${toPersianDigits(a.totals.placesActual)}<small class="text-sm font-bold text-slate"> / ${toPersianDigits(a.totals.placesPlanned)}</small></b><span>مکان‌های اضافه‌شده</span></article>
      <article class="card stat-card">${icon('sparkle')}<b>${toPersianDigits(a.totals.actsActual)}<small class="text-sm font-bold text-slate"> / ${toPersianDigits(a.totals.actsPlanned)}</small></b><span>فعالیت‌های ثبت‌شده</span></article>
      <article class="card stat-card">${icon('wallet')}<b>${money(a.totals.dailyAvgSpending)}</b><span>میانگین خرج هر روز</span></article>
    </section>

    <section class="mt-5 grid gap-4 sm:grid-cols-3" aria-label="نکات برجسته">
      ${highlightCard('wallet', 'گران‌ترین روز', a.highlights.priciest ? `${a.highlights.priciest.label} · ${money(a.highlights.priciest.actual)}` : '—')}
      ${highlightCard('sparkle', 'پرکارترین روز', a.highlights.busiest ? `${a.highlights.busiest.label} · ${toPersianDigits(a.highlights.busiest.count)} فعالیت` : '—')}
      ${highlightCard('checkCircle', 'کامل‌ترین روز', a.highlights.bestDay ? `${a.highlights.bestDay.label} · ${formatPercent(a.highlights.bestDay.completion)}` : '—')}
    </section>

    <section class="card mt-5 overflow-hidden" aria-label="روز به روز">
      <header class="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
        <h2 class="text-[15px] font-extrabold text-ink">روز به روز</h2>
        <span class="text-[11px] text-faint">تکمیل · فعالیت · برنامه ↔ واقعی</span>
      </header>

      ${
        a.perDay.length
          ? `<ul class="divide-y divide-line" data-day-rows></ul>`
          : '<p class="p-8 text-center text-sm text-slate">هنوز روزی برای این سفر ثبت نشده است؛ از بخش «برنامه سفر» شروع کن.</p>'
      }
      <footer class="border-t border-line bg-tint px-5 py-3 text-[11px] leading-6 text-slate">
        «واقعی» از دفتر هزینه‌ها و «برنامه» از هزینهٔ فعالیت‌های تایم‌لاین محاسبه می‌شود.
      </footer>
    </section>
  `

  function highlightCard(iconName, label, value) {
    return `
      <article class="card stat-card">
        ${icon(iconName)}<b class="!text-base">${value}</b><span>${label}</span>
      </article>`
  }

  const ring = createDonutChart({
    segments: [{ value: Math.max(a.overallPct, 0.001), color: '#4D8FD8', label: 'پیشرفت کلی' }],
    centerTitle: formatPercent(a.overallPct),
    centerSub: 'آمادگی سفر',
    size: 168,
  })
  container.querySelector('[data-ring-mount]').appendChild(ring.el)
  setTimeout(() => ring.animateIn(), 120)

  renderBreakdown(container)
  renderDayRows(container)

  function renderBreakdown(root) {
    const mount = root.querySelector('[data-breakdown]')
    mount.innerHTML = ''
    a.breakdown.forEach((row) => {
      const el = document.createElement('div')
      el.innerHTML = `
        <div class="flex items-center justify-between text-xs">
          <span class="font-bold text-slate">${row.label}</span>
          <b class="font-extrabold text-deep">${formatPercent(row.value)}</b>
        </div>
        <div class="progress mt-1.5 h-2" role="progressbar" aria-label="${row.label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${row.value}">
          <div class="progress-fill" style="width:${row.value}%"></div>
        </div>
      `
      mount.appendChild(el)
    })
  }

  function renderDayRows(root) {
    const mount = root.querySelector('[data-day-rows]')
    if (!mount) return
    mount.innerHTML = ''

    a.perDay.forEach((day) => {
      const li = document.createElement('li')
      li.className = 'flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3'
      li.innerHTML = `
        <div class="w-24 shrink-0">
          <b class="block text-[13px] font-bold text-ink">${day.label}</b>
          ${day.date ? `<span class="block text-[10px] text-faint">${day.date}</span>` : ''}
        </div>
        <span class="badge badge-info shrink-0">${toPersianDigits(day.done)} از ${toPersianDigits(day.count)}</span>
        <div class="w-28 shrink-0">
          <div class="progress h-1.5"><div class="progress-fill" style="width:${day.completion}%"></div></div>
          <span class="mt-1 block text-[10px] font-bold text-faint">${formatPercent(day.completion)}</span>
        </div>
        <span class="text-[11px] text-slate">برنامه: <b class="font-bold text-ink">${money(day.planned)}</b></span>
        <span class="ms-auto text-[13px] font-extrabold text-deep">${money(day.actual)}</span>
      `
      mount.appendChild(li)
    })
  }

  void toPersianDigits
}
