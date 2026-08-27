import { getState, setState } from '../state/app-state.js'
import { createDropdown } from './dropdown.js'
import { icon } from '../shell/icons.js'
import { formatMoney, formatPercent } from '../utils/money.js'
import { getSpentOrFallback } from '../services/budget.js'
import { toPersianDigits } from '../utils/formatters.js'

const SCENES = {
  city:
    '<path d="M0 130 L0 96 h26 v-18 h20 v30 h24 V78 h28 l6 10 h20 v42 Z" fill="rgba(23,43,58,0.22)"/><path d="M150 130 V88 h30 v-14 h26 v56 Z" fill="rgba(23,43,58,0.16)"/>',
  mountain:
    '<path d="M-10 130 L70 52 L120 108 L160 66 L230 130 Z" fill="rgba(23,43,58,0.2)"/><path d="M60 130 L140 74 L220 130 Z" fill="rgba(23,43,58,0.14)"/>',
  sea: '<path d="M0 104 C50 92 90 116 140 106 S240 94 300 106 L300 130 L0 130 Z" fill="rgba(255,255,255,0.4)"/><path d="M0 116 C60 106 110 126 170 118 S280 108 300 114 L300 130 L0 130 Z" fill="rgba(23,43,58,0.12)"/>',
}

export function coverScene(trip) {
  const scene = SCENES[trip.coverScene] || SCENES.mountain
  return `
    <div class="relative h-36 overflow-hidden" style="background:linear-gradient(180deg, ${trip.coverFrom}, ${trip.coverTo})">
      <svg class="absolute inset-x-0 bottom-0 w-full" viewBox="0 0 300 130" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        ${scene}
      </svg>
      <svg class="absolute end-5 top-5 opacity-80" width="34" height="34" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
        <circle cx="12" cy="12" r="5.5"/>
        <g stroke="#fff" stroke-width="1.8" stroke-linecap="round">
          <path d="M12 2.5v2.4M12 19.1v2.4M3.8 12H6.2M17.8 12h2.4M6.2 6.2l1.7 1.7M16.1 16.1l1.7 1.7M6.2 17.8l1.7-1.7M16.1 7.9l1.7-1.7"/>
        </g>
      </svg>
    </div>
  `
}

const STATUS_CLASS = {
  active: 'badge-ok',
  upcoming: 'badge-info',
  planned: 'badge-warn',
  done: 'badge-ok',
}

export function createTripCard({ trip, onDeleted }) {
  const state = getState()
  const isActive = state.currentTripId === trip.id
  const remaining = trip.budget.total - getSpentOrFallback(trip)

  const el = document.createElement('article')
  el.className = 'card card-hover flex flex-col overflow-hidden'
  el.dataset.tripId = trip.id
  el.style.outline = isActive ? '2px solid var(--color-sky)' : ''
  el.style.outlineOffset = '-2px'

  el.innerHTML = `
    <a href="#/dashboard" data-open-trip class="block text-start" aria-label="مشاهدهٔ ${trip.title}">
      ${coverScene(trip)}
    </a>

    <div class="flex flex-1 flex-col p-5">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h3 class="truncate text-[15px] font-extrabold text-ink">${trip.title}</h3>
          <p class="mt-0.5 truncate text-xs text-slate">${trip.destination}</p>
        </div>
        <span class="relative shrink-0" data-card-menu></span>
      </div>

      <div class="mt-3 flex flex-wrap gap-1.5">
        <span class="badge ${STATUS_CLASS[trip.status] || 'badge-info'}">${trip.statusLabel}</span>
        <span class="badge badge-info">${toPersianDigits(trip.daysCount)} روز</span>
        <span class="badge badge-info">${toPersianDigits(trip.travelers)} مسافر</span>
      </div>

      <dl class="mt-4 space-y-2 text-xs text-slate">
        <div class="flex items-center justify-between gap-3">
          <dt>${trip.dates}</dt>
        </div>
        <div class="flex items-center justify-between gap-3">
          <dt>بودجهٔ باقی‌مانده</dt>
          <dd class="font-bold text-ink">${formatMoney(remaining)}</dd>
        </div>
      </dl>

      <div class="mt-auto pt-4">
        <div class="flex items-center justify-between text-[11px] text-slate">
          <span>${isActive ? 'سفر فعال' : 'آمادگی'}</span>
          <b class="text-deep">${formatPercent(trip.progress)}</b>
        </div>
        <div class="progress mt-1.5 h-1.5" role="progressbar" aria-label="${trip.title}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${trip.progress}">
          <div class="progress-fill" style="width:${trip.progress}%"></div>
        </div>
      </div>
    </div>
  `

  const menuMount = el.querySelector('[data-card-menu]')
  el.querySelector('[data-open-trip]').addEventListener('click', () => {
    setState({ currentTripId: trip.id })
  })
  const menu = createDropdown({
    ariaLabel: `کنش‌های سفر ${trip.title}`,
    manageLabel: false,
    trigger: (() => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'icon-btn border border-line'
      btn.setAttribute('aria-label', 'گزینه‌های سفر')
      btn.innerHTML = icon('dotsVertical')
      return btn
    })(),
    items: [
      { value: 'open', label: 'مشاهدهٔ داشبورد سفر' },
      { value: 'activate', label: isActive ? 'سفر فعال است' : 'فعال‌سازی این سفر' },
      { value: 'delete', label: 'حذف سفر' },
    ],
    onSelect: (value) => {
      if (value === 'open') {
        setState({ currentTripId: trip.id })
        window.location.hash = '/dashboard'
      } else if (value === 'activate') {
        if (getState().currentTripId !== trip.id) {
          setState({ currentTripId: trip.id })
        }
      }
      if (value === 'delete') onDeleted?.(trip)
    },
  })
  menuMount.appendChild(menu.el)

  return el
}
