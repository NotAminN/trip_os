import { icon } from '../shell/icons.js'

const CITIES = [
  { name: 'تهران', country: 'ایران', tz: 'Asia/Tehran' },
  { name: 'استانبول', country: 'ترکیه', tz: 'Europe/Istanbul' },
  { name: 'پاریس', country: 'فرانسه', tz: 'Europe/Paris' },
  { name: 'توکیو', country: 'ژاپن', tz: 'Asia/Tokyo' },
  { name: 'نیویورک', country: 'آمریکا', tz: 'America/New_York' },
]

const formatterCache = new Map()

function formattersFor(tz) {
  if (!formatterCache.has(tz)) {
    formatterCache.set(tz, {
      time: new Intl.DateTimeFormat('fa-IR', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }),
      date: new Intl.DateTimeFormat('fa-IR', {
        timeZone: tz,
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
      hour: new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: 'numeric',
        hourCycle: 'h23',
      }),
    })
  }
  return formatterCache.get(tz)
}

function buildCards(mount) {
  mount.innerHTML = CITIES.map(
    (city) => `
    <article class="card card-hover min-w-44 flex-1 p-5 lg:min-w-0" data-clock-card="${city.tz}">
      <header class="flex items-center gap-2">
        <span class="grid size-7 place-items-center rounded-lg bg-tint text-sky" data-clock-icon aria-hidden="true">
          ${icon('sun', 14)}
        </span>
        <div class="leading-tight">
          <b class="block text-sm font-extrabold text-ink">${city.name}</b>
          <span class="block text-[10px] text-faint">${city.country}</span>
        </div>
        <span class="badge badge-info ms-auto" data-clock-state>—</span>
      </header>
      <p dir="ltr" data-clock-time class="my-3 text-center text-3xl font-extrabold tracking-wide text-deep">--:--:--</p>
      <footer data-clock-date class="text-center text-[11px] font-semibold text-slate">—</footer>
    </article>`,
  ).join('')
}

function updateCard(card) {
  const tz = card.dataset.clockCard
  const fmt = formattersFor(tz)
  const now = new Date()

  card.querySelector('[data-clock-time]').textContent = fmt.time.format(now)
  card.querySelector('[data-clock-date]').textContent = fmt.date.format(now)

  const hour = Number(fmt.hour.format(now))
  const isNight = hour < 6 || hour >= 19
  const iconEl = card.querySelector('[data-clock-icon]')
  iconEl.innerHTML = icon(isNight ? 'moon' : 'sun', 14)
  iconEl.style.color = isNight ? '#245B91' : '#C08A35'
  card.querySelector('[data-clock-state]').textContent = isNight ? 'شب' : 'روز'
}

let timer = null

function tick() {
  const cards = document.querySelectorAll('[data-clock-card]')
  if (!cards.length) {
    clearInterval(timer)
    timer = null
    return
  }
  cards.forEach(updateCard)
}

export function initWorldClocks(scope = document) {
  const mounts = scope.querySelectorAll('[data-world-clock]')
  if (!mounts.length) return

  mounts.forEach((mount) => {
    if (!mount.dataset.clockInit) {
      mount.dataset.clockInit = 'true'
      buildCards(mount)
    }
  })

  if (!timer) {
    timer = setInterval(tick, 1000)
    tick()
  }
}
