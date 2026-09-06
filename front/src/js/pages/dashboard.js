import { tripService } from '../services/trips.js'
import { getSpentOrFallback } from '../services/budget.js'
import { packingService } from '../services/packing.js'
import { getState } from '../state/app-state.js'
import { authService } from '../services/auth.js'
import { formatMoney, formatPercent } from '../utils/money.js'
import { formatTodayJalali } from '../utils/dates.js'
import { toPersianDigits } from '../utils/formatters.js'
import { icon } from '../shell/icons.js'
import { openCreateTripWizard } from '../components/create-trip-wizard.js'

let rerenderBound = false

function chip(text) {
  return `<span class="pill pill-cool">${text}</span>`
}

export const meta = { title: 'داشبورد' }

function greetingName() {
  const user = authService.getUser()
  const fromState = getState().displayName
  const fromUser = user?.first_name || user?.full_name || user?.username || ''
  return fromState && fromState !== 'سارا' ? fromState : fromUser || fromState || 'مسافر'
}

function renderEmptyDashboard(container) {
  container.innerHTML = `
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-extrabold text-deep">سلام، ${greetingName()}</h1>
        <p class="mt-1 text-sm text-slate">هنوز سفری نساخته‌ای — اولین سفرت را راه بینداز.</p>
      </div>
      <span class="chip">${icon('calendar', 14)}${formatTodayJalali()}</span>
    </header>

    <section class="card mt-8 p-10 text-center" aria-label="بدون سفر">
      <span class="mx-auto grid size-16 place-items-center rounded-2xl bg-tint text-sky">${icon('compass', 28)}</span>
      <h2 class="mt-5 text-xl font-extrabold text-deep">سفر فعال نداری.</h2>
      <p class="mx-auto mt-2 max-w-sm text-sm leading-8 text-slate">
        با ساخت اولین سفر، تایم‌لاین، نقشه، بودجه و چمدان — همه در همین داشبورد جمع می‌شوند.
      </p>
      <button type="button" class="btn btn-primary mx-auto mt-6" data-new-trip>${icon('plus', 16)}ساخت سفر جدید</button>
    </section>
  `

  container.querySelector('[data-new-trip]')?.addEventListener('click', () => {
    openCreateTripWizard({ onCreated: () => render(container) })
  })
}

export async function render(container) {
  const trip = tripService.getCurrent()
  if (!trip) {
    renderEmptyDashboard(container)
    bindRerender(container)
    return
  }
  const spent = getSpentOrFallback(trip)
  const remaining = Math.max(0, trip.budget.total - spent)
  const spentPercent = Math.round((spent / (trip.budget.total || 1)) * 100)
  const packing = packingService.summaryOrFallback(trip)
  const packingPercent = packing.percent

  container.innerHTML = `
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-extrabold text-deep">سلام، ${greetingName()}</h1>
        <p class="mt-1 text-sm text-slate">سفر فعال تو: ${trip.title} — ${trip.destination}</p>
      </div>
      <span class="chip">${icon('calendar', 14)}${formatTodayJalali()}</span>
    </header>

    <section class="card mt-6 overflow-hidden" aria-label="خلاصهٔ سفر فعال">
      <div
        class="relative h-36"
        style="background: linear-gradient(135deg, ${trip.coverFrom}, ${trip.coverTo})"
      >
        <svg class="absolute inset-0 h-full w-full opacity-20" viewBox="0 0 600 144" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <path d="M-20 120 C120 60 220 150 340 90 S520 30 620 80" stroke="#fff" stroke-width="2.5" fill="none" stroke-dasharray="4 9"/>
          <circle cx="120" cy="92" r="5" fill="#fff"/><circle cx="340" cy="90" r="5" fill="#fff"/><circle cx="540" cy="55" r="5" fill="#fff"/>
        </svg>
        <div class="absolute bottom-3 inline-flex flex-col px-5">
          <h2 class="text-xl font-extrabold text-white drop-shadow-sm">${trip.title}</h2>
          <p class="text-[13px] font-semibold text-white/85">${trip.destination} · ${trip.dates}</p>
        </div>
        <span class="badge absolute end-4 top-4 bg-white/90 text-deep">${trip.statusLabel}</span>
      </div>

      <div class="grid gap-x-8 gap-y-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
        <div class="flex flex-wrap gap-2">
          ${chip(`${toPersianDigits(trip.daysCount)} روز`)}
          ${chip(`${toPersianDigits(trip.travelers)} مسافر`)}
          ${chip(`${toPersianDigits(trip.stats.places)} مکان`)}
          ${chip(`${toPersianDigits(trip.stats.activities)} فعالیت`)}
          ${chip(`${trip.stats.distanceKm} کیلومتر`)}
        </div>
        <div class="min-w-52">
          <div class="flex items-center justify-between text-xs text-slate">
            <span>آمادگی سفر</span><b class="font-extrabold text-deep">${formatPercent(trip.progress)}</b>
          </div>
          <div class="progress mt-2" role="progressbar" aria-label="آمادگی سفر" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${trip.progress}">
            <div class="progress-fill" style="width:${trip.progress}%"></div>
          </div>
        </div>
      </div>
    </section>

    <section class="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="آمار سفر">
      <div class="card stat-card">${icon('marker')}<b>${toPersianDigits(trip.stats.places)}</b><span>مکان برنامه‌ریزی‌شده</span></div>
      <div class="card stat-card">${icon('sparkle')}<b>${toPersianDigits(trip.stats.activities)}</b><span>فعالیت ثبت‌شده</span></div>
      <div class="card stat-card">${icon('route')}<b>${trip.stats.distanceKm}<small class="text-sm font-bold text-slate"> km</small></b><span>مسیر طی‌شده</span></div>
      <div class="card stat-card">${icon('wallet')}<b>${formatMoney(remaining)}</b><span>بودجهٔ باقی‌مانده</span></div>
    </section>

    <section class="mt-5 grid gap-5 lg:grid-cols-3">
      ${
        trip.upcoming
          ? `<article class="card p-5 lg:col-span-2" aria-label="فعالیت بعدی">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <span class="badge badge-info">${icon('clock', 12)}فعالیت بعدی</span>
                <a href="#/map" class="btn btn-secondary btn-sm">مشاهده روی نقشه</a>
              </div>
              <h3 class="mt-4 text-lg font-extrabold text-ink">${trip.upcoming.title}</h3>
              <p class="mt-1 text-sm text-slate">${trip.upcoming.time} · ${trip.upcoming.place}</p>
              <div class="mt-4 flex flex-wrap gap-2">
                ${chip(`مدت: ${trip.upcoming.duration}`)}
                ${chip(`هزینه: ${formatMoney(trip.upcoming.cost)}`)}
              </div>
            </article>`
          : `<article class="card p-5 lg:col-span-2" aria-label="فعالیت بعدی">
              <h3 class="font-extrabold text-ink">فعالیتی در پیش نیست</h3>
              <p class="mt-1 text-sm text-slate">برای این سفر هنوز فعالیتی زمان‌بندی نشده است.</p>
            </article>`
      }

      ${
        trip.weather
          ? `<article class="card p-5" aria-label="آب‌وهوای امروز">
              <span class="badge badge-warn">آب‌وهوای مقصد</span>
              <p class="mt-3 flex items-baseline gap-2"><b class="text-4xl font-extrabold text-deep">${trip.weather.temp}</b><span class="text-sm font-bold text-slate">${trip.weather.cond}</span></p>
              <dl class="mt-4 space-y-1.5 text-xs text-slate">
                <div class="flex justify-between"><dt>بیشینه</dt><dd class="font-bold text-ink">${trip.weather.high}</dd></div>
                <div class="flex justify-between"><dt>کمینه</dt><dd class="font-bold text-ink">${trip.weather.low}</dd></div>
              </dl>
            </article>`
          : `<article class="card p-5" aria-label="آب‌وهوا">
              <h3 class="font-extrabold text-ink">آب‌وهوا</h3>
              <p class="mt-1 text-sm leading-7 text-slate">با نزدیک شدن تاریخ سفر، پیش‌بینی اینجا نمایش داده می‌شود.</p>
            </article>`
      }
    </section>

    <section class="mt-5 grid gap-5 lg:grid-cols-2">
      <article class="card p-5" aria-label="بودجه">
        <div class="flex items-center justify-between">
          <h3 class="font-extrabold text-ink">بودجهٔ سفر</h3>
          <a href="#/budget" class="btn btn-ghost btn-sm">جزئیات</a>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <b class="text-xl font-extrabold text-deep">${formatMoney(spent)}</b>
          <span class="text-xs text-slate">از ${formatMoney(trip.budget.total)}</span>
        </div>
        <div class="progress mt-3 h-2" role="progressbar" aria-label="بودجهٔ مصرف‌شده" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${spentPercent}">
          <div class="progress-fill" style="width:${spentPercent}%"></div>
        </div>
        <p class="mt-2 text-xs text-slate">${formatPercent(spentPercent)} مصرف شده · ${formatMoney(remaining)} باقی مانده</p>
      </article>

      <article class="card p-5" aria-label="چمدان">
        <div class="flex items-center justify-between">
          <h3 class="font-extrabold text-ink">آمادگی چمدان</h3>
          <a href="#/packing" class="btn btn-ghost btn-sm">چک‌لیست</a>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <b class="text-xl font-extrabold text-deep">${toPersianDigits(packing.done)} از ${toPersianDigits(packing.total)}</b>
          <span class="text-xs text-slate">مورد آماده</span>
        </div>
        <div class="progress mt-3 h-2" role="progressbar" aria-label="آمادگی چمدان" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${packingPercent}">
          <div class="progress-fill" style="width:${packingPercent}%"></div>
        </div>
        <p class="mt-2 text-xs text-slate">${formatPercent(packingPercent)} آماده · ${toPersianDigits(Math.max(0, packing.total - packing.done))} مورد باقی مانده</p>
      </article>
    </section>
  `

  if (!rerenderBound) bindRerender(container)
}

function bindRerender(container) {
  if (rerenderBound) return
  rerenderBound = true
  import('../state/app-state.js').then(({ subscribe }) => {
    subscribe(() => {
      if (container.isConnected && window.location.hash.includes('dashboard')) {
        render(container)
      }
    })
  })
}
