import { tripService } from '../services/trips.js'
import { timelineService } from '../services/timeline.js'
import { weatherService } from '../services/weather.js'
import { CONDITIONS } from '../data/weather.js'
import { icon } from '../shell/icons.js'
import { toPersianDigits } from '../utils/formatters.js'

export const meta = { title: 'آب‌وهوا' }

const PERIODS = [
  { key: 'morning', label: 'صبح', icon: 'sunrise', sky: 'linear-gradient(160deg,#FFF2DC 0%,#DCEEFF 100%)', ink: '#245B91' },
  { key: 'noon', label: 'ظهر', icon: 'sun', sky: 'linear-gradient(160deg,#EAF4FF 0%,#DCEEFF 100%)', ink: '#245B91' },
  { key: 'evening', label: 'عصر', icon: 'sunset', sky: 'linear-gradient(160deg,#FFE7D1 0%,#DCE6F5 100%)', ink: '#8A5A3B' },
  { key: 'night', label: 'شب', icon: 'moon', sky: 'linear-gradient(160deg,#1B466F 0%,#245B91 100%)', ink: '#FFFFFF' },
]

const PERIOD_HOURS = { morning: [0, 1], noon: [1, 3], evening: [3, 5], night: [5, 7] }

const ADVISORY = {
  sunny: 'کرم ضدآفتاب و کلاه همراهت باشد.',
  partly: 'هوای دلپذیری برای پیاده‌روی است.',
  cloudy: 'برنامهٔ فضای باز هم اکنون راحت اجرا می‌شود.',
  rainy: 'چتر یا کاپشن ضدآب فراموش نشود؛ حمام و موزه گزینهٔ خوبی‌اند.',
}

export async function render(container) {
  const trip = tripService.getCurrent()
  if (!trip) return

  const data = weatherService.getForTrip(trip.id)

  if (!data) {
    container.innerHTML = `
      <header>
        <h1 class="text-2xl font-extrabold text-deep">آب‌وهوا</h1>
        <p class="mt-1 text-sm text-slate">${trip.title}</p>
      </header>
      <section class="card mt-8 p-10 text-center">
        <span class="mx-auto grid size-16 place-items-center rounded-2xl bg-tint text-sky">${icon('cloudSun', 28)}</span>
        <h2 class="mt-5 text-xl font-extrabold text-deep">پیش‌بینی این سفر هنوز فعال نشده است.</h2>
        <p class="mx-auto mt-2 max-w-sm text-sm leading-8 text-slate">
          با نزدیک شدن تاریخ سفر، پیش‌بینی روزها اینجا نمایش داده می‌شود. داده‌های آب‌وهوا در Trip OS محلی و نمونه هستند.
        </p>
        <a href="#/timeline" class="btn btn-secondary mx-auto mt-6">مشاهدهٔ برنامهٔ سفر</a>
      </section>
    `
    return
  }

  const ui = { period: 'noon' }
  const days = timelineService.getDays(trip)
  const activitiesOf = (dayId) => days.find((d) => d.id === dayId)?.activities.length ?? 0

  container.innerHTML = `
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-extrabold text-deep">آب‌وهوای سفر</h1>
        <p class="mt-1 text-sm text-slate">${trip.title} — ${data.city}</p>
      </div>
      <div class="tabs" role="group" aria-label="حالت روز یا شب">
        ${PERIODS.map(
          (p, i) => `
          <button type="button" class="tab-btn" data-period="${p.key}" aria-pressed="${i === 1}">
            ${icon(p.icon, 13)}${p.label}
          </button>`,
        ).join('')}
      </div>
    </header>

    <section class="card mt-5 overflow-hidden border-0" data-sky-hero aria-label="وضعیت فعلی"></section>

    <section class="mt-5" aria-label="ساعت‌های آینده">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-[15px] font-extrabold text-ink">ساعت به ساعت</h2>
        <span class="text-[11px] text-faint">احتمال بارش زیر هر ساعت</span>
      </div>
      <div class="flex gap-2.5 overflow-x-auto pb-2 no-scrollbar" data-hourly></div>
    </section>

    <div class="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
      <section class="card overflow-hidden" aria-label="پیش‌بینی روزها">
        <header class="border-b border-line px-5 py-3.5">
          <h2 class="text-[15px] font-extrabold text-ink">هم‌راستا با روزهای سفر</h2>
        </header>
        <ul class="divide-y divide-line" data-daily></ul>
      </section>

      <section class="card overflow-hidden" aria-label="توصیه‌ها">
        <header class="border-b border-line px-5 py-3.5">
          <h2 class="text-[15px] font-extrabold text-ink">هماهنگی با برنامه</h2>
        </header>
        <ul class="divide-y divide-line" data-advisory></ul>
        <footer class="border-t border-line bg-tint px-5 py-3 text-[11px] leading-6 text-slate">
          داده‌های آب‌وهوا نمونهٔ محلی هستند؛ در نسخهٔ نهایی به سرویس واقعی متصل می‌شوند.
        </footer>
      </section>
    </div>
  `

  const hero = container.querySelector('[data-sky-hero]')
  const hourly = container.querySelector('[data-hourly]')
  const daily = container.querySelector('[data-daily]')
  const advisory = container.querySelector('[data-advisory]')

  function renderHero() {
    const period = PERIODS.find((p) => p.key === ui.period)
    const isNight = period.key === 'night'
    const c = data.current
    const cond = CONDITIONS[c.cond]
    const textColor = isNight ? '#FFFFFF' : '#172B3A'
    const subColor = isNight ? 'rgba(255,255,255,.75)' : '#647789'

    const stars =
      isNight
        ? `<svg class="absolute inset-0 h-full w-full opacity-70" aria-hidden="true">${Array.from({ length: 26 }, (_, i) => {
            const x = (i * 137) % 100
            const y = (i * 53) % 60
            return `<circle cx="${x}%" cy="${y}%" r="${i % 4 === 0 ? 1.6 : 1}" fill="#fff" opacity=".${i % 3 === 0 ? 9 : 6}"/>`
          }).join('')}</svg>`
        : ''

    hero.style.background = period.sky
    hero.innerHTML = `
      <div class="relative p-6 sm:p-8">
        ${stars}
        <div class="relative flex flex-wrap items-start justify-between gap-6">
          <div style="color:${textColor}">
            <div class="flex items-center gap-2">
              <span
                class="badge"
                style="background:${isNight ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.85)'};color:${isNight ? '#fff' : 'var(--color-deep)'}"
              >${icon(period.icon, 12)}${period.label} · ${data.city}</span>
            </div>
            <div class="mt-3 flex items-end gap-3">
              <b class="text-6xl font-extrabold leading-none">${c.temp}</b>
              <div class="pb-1.5">
                <p class="text-sm font-bold">${cond.label}</p>
                <p class="text-xs" style="color:${subColor}">احساس واقعی ${c.feels}</p>
              </div>
              <span class="ms-2 pb-1.5" style="color:${cond === CONDITIONS.sunny && !isNight ? '#C08A35' : isNight ? '#FFE9A8' : '#4D8FD8'}">
                ${icon(isNight ? 'moon' : cond.icon, 44)}
              </span>
            </div>
            <div class="mt-4 flex flex-wrap gap-2 text-xs font-bold">
              <span class="rounded-lg px-2.5 py-1" style="background:${isNight ? 'rgba(255,255,255,.14)' : '#ffffffcc'}">↑ ${c.high}</span>
              <span class="rounded-lg px-2.5 py-1" style="background:${isNight ? 'rgba(255,255,255,.14)' : '#ffffffcc'}">↓ ${c.low}</span>
            </div>
          </div>

          <dl class="grid w-full max-w-72 grid-cols-2 gap-x-6 gap-y-3 text-xs" style="color:${subColor}">
            <div class="flex items-center gap-2">${icon('wind', 15)}<span>باد<b class="ms-auto font-bold" style="color:${textColor}">${c.wind}</b></span></div>
            <div class="flex items-center gap-2">${icon('droplet', 15)}<span>رطوبت<b class="ms-auto font-bold" style="color:${textColor}">${c.humidity}</b></span></div>
            <div class="flex items-center gap-2">${icon('sunrise', 15)}<span>طلوع<b class="ms-auto font-bold" style="color:${textColor}">${c.sunrise}</b></span></div>
            <div class="flex items-center gap-2">${icon('sunset', 15)}<span>غروب<b class="ms-auto font-bold" style="color:${textColor}">${c.sunset}</b></span></div>
          </dl>
        </div>
      </div>
    `
  }

  function renderHourly() {
    const [from, to] = PERIOD_HOURS[ui.period]
    hourly.innerHTML = data.hourly
      .map((slot, i) => {
        const active = i >= from && i < to
        const cond = CONDITIONS[slot.cond]
        return `
        <div class="min-w-24 rounded-xl border p-3 text-center transition-colors ${
          active
            ? 'border-sky bg-tint shadow-sm'
            : 'border-line bg-surface'
        }" ${active ? 'aria-current="true"' : ''}>
          <p class="text-[11px] font-bold text-faint">${slot.time}</p>
          <p class="my-1.5 grid place-items-center text-deep">${icon(cond.icon, 22)}</p>
          <b class="block text-sm font-extrabold text-ink">${slot.temp}</b>
          <span class="mt-1 block text-[10px] text-info">💧${slot.pop}</span>
        </div>`
      })
      .join('')
  }

  function renderDaily() {
    const weekMin = Math.min(...data.daily.map((d) => d.low))
    const weekMax = Math.max(...data.daily.map((d) => d.high))
    const span = Math.max(1, weekMax - weekMin)

    daily.innerHTML = data.daily
      .map((row) => {
        const cond = CONDITIONS[row.cond]
        const left = ((row.low - weekMin) / span) * 100
        const width = ((row.high - row.low) / span) * 100
        const count = activitiesOf(row.dayId)
        return `
        <li class="flex items-center gap-3 px-5 py-3">
          <div class="w-28 shrink-0">
            <b class="block text-[13px] font-bold text-ink">${row.label}</b>
            <span class="block text-[10px] text-faint">${row.date}</span>
          </div>
          <span class="grid size-8 shrink-0 place-items-center rounded-lg bg-tint text-deep">${icon(cond.icon, 16)}</span>
          <span class="w-10 shrink-0 text-[10px] font-bold ${row.pop >= 50 ? 'text-info' : 'text-faint'}">${toPersianDigits(row.pop)}٪</span>
          <div class="relative h-1.5 min-w-20 flex-1 rounded-full bg-line">
            <span class="absolute h-full rounded-full bg-linear-to-l from-sky to-deep" style="inset-inline-start:${left}%;width:${Math.max(width, 8)}%"></span>
          </div>
          <span class="w-24 shrink-0 text-end text-xs"><b class="font-extrabold text-deep">${toPersianDigits(row.high)}°</b> <span class="text-faint">${toPersianDigits(row.low)}°</span></span>
          <span class="hidden w-20 shrink-0 text-end text-[10px] text-faint sm:block">${toPersianDigits(count)} فعالیت</span>
        </li>`
      })
      .join('')
  }

  function renderAdvisory() {
    advisory.innerHTML = data.daily
      .map((row) => {
        const cond = CONDITIONS[row.cond]
        const tone = row.cond === 'rainy' ? 'badge-warn' : row.cond === 'sunny' ? 'badge-ok' : 'badge-info'
        return `
        <li class="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3">
          <span class="badge ${tone}" style="${row.cond === 'sunny' ? '' : ''}">${cond.label}</span>
          <b class="text-[13px] font-bold text-ink">${row.label}</b>
          <span class="text-xs leading-6 text-slate">${ADVISORY[row.cond]}</span>
          <a href="#/timeline" class="ms-auto text-[11px] font-bold text-sky hover:text-deep">دیدن برنامه</a>
        </li>`
      })
      .join('')
  }

  function applyPeriod(key) {
    ui.period = key
    container.querySelectorAll('[data-period]').forEach((btn) =>
      btn.setAttribute('aria-pressed', String(btn.dataset.period === key)),
    )
    renderHero()
    renderHourly()
  }

  container.querySelectorAll('[data-period]').forEach((btn) => {
    btn.addEventListener('click', () => applyPeriod(btn.dataset.period))
  })

  applyPeriod(ui.period)
  renderDaily()
  renderAdvisory()
}
