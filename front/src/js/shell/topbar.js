import { tripService } from '../services/trips.js'
import { timelineService } from '../services/timeline.js'
import { placeService } from '../services/places.js'
import { getState, setState, subscribe } from '../state/app-state.js'
import { createDropdown } from '../components/dropdown.js'
import { openShortcutsModal } from '../components/shortcuts-modal.js'
import { toast } from '../components/toast.js'
import { icon } from './icons.js'
import { qs } from '../utils/helpers.js'
import { formatMoney } from '../utils/money.js'
import { getSpentOrFallback } from '../services/budget.js'
import { budgetService } from '../services/budget.js'
import { packingService } from '../services/packing.js'
import { notificationsService } from '../services/notifications.js'
import { authService } from '../services/auth.js'

const CHEVRON =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>'

export function initTopbar({ onOpenPalette }) {
  const topbar = qs('[data-topbar]')
  if (!topbar) return () => {}

  let notifOpen = false
  let notifPanel = null
  let notifBtn = null
  let switcherDropdown = null
  const switcherMount = qs('[data-trip-switcher]', topbar)

  function buildTripSwitcher() {
    if (!switcherMount) return

    const trigger = document.createElement('button')
    trigger.type = 'button'
    trigger.className = 'trip-trigger'
    trigger.innerHTML = `
      <span data-trip-flag class="grid size-9 shrink-0 place-items-center rounded-lg text-[13px] font-extrabold text-white"></span>
      <span class="hidden text-start leading-tight sm:block">
        <span data-trip-title class="block max-w-44 truncate text-sm font-bold text-ink"></span>
        <span data-trip-meta class="block text-[11px] text-slate"></span>
      </span>
      <span class="text-slate">${CHEVRON}</span>
    `

    switcherDropdown = createDropdown({
      trigger,
      manageLabel: false,
      ariaLabel: 'تغییر سفر فعال',
      selectedValue: getState().currentTripId,
      items: tripService.list().map((trip) => ({
        value: trip.id,
        label: trip.title,
        meta: `${trip.daysCount} روز · ${trip.travelers} مسافر`,
        status: trip.statusLabel,
        remaining: formatMoney(trip.budget.total - getSpentOrFallback(trip)),
      })),
      onSelect: (value) => {
        setState({ currentTripId: value })
        toast.success(`سفر فعال: «${tripService.getById(value).title}»`)
        // Warm the per-trip caches for the incoming views.
        void timelineService.ensureLoaded(value)
        void placeService.ensureLoaded(value)
        void budgetService.ensureLoaded(value)
        void packingService.ensureLoaded(value)
      },
    })

    switcherMount.appendChild(switcherDropdown.el)
    renderTripLabel()
  }

  function rebuildSwitcher() {
    switcherDropdown?.destroy()
    if (switcherMount) switcherMount.innerHTML = ''
    buildTripSwitcher()
  }

  function renderTripLabel() {
    const trip = tripService.getCurrent()
    if (!trip) return
    const flagEl = qs('[data-trip-flag]', topbar)
    const titleEl = qs('[data-trip-title]', topbar)
    const metaEl = qs('[data-trip-meta]', topbar)
    if (!flagEl || !titleEl || !metaEl) return

    flagEl.textContent = trip.destination.charAt(0)
    flagEl.style.background = `linear-gradient(135deg, ${trip.coverFrom}, ${trip.coverTo})`
    titleEl.textContent = trip.title
    metaEl.textContent = `${trip.dates} · ${trip.statusLabel}`
  }

  buildTripSwitcher()
  buildNotifications()
  buildProfile()

  qs('[data-open-palette]', topbar)?.addEventListener('click', () => onOpenPalette?.())
  qs('[data-open-shortcuts]', topbar)?.addEventListener('click', (event) =>
    openShortcutsModal(event.currentTarget),
  )
  qs('[data-burger-app]', topbar)?.addEventListener('click', () =>
    document.dispatchEvent(new CustomEvent('app:toggle-mobile-menu')),
  )

  subscribe(() => {
    rebuildSwitcher()
    renderNotifications()
  })

  function buildNotifications() {
    const mount = qs('[data-notifications]', topbar)
    if (!mount) return
    mount.classList.add('relative')

    notifBtn = document.createElement('button')
    notifBtn.type = 'button'
    notifBtn.className = 'icon-btn relative border border-line'
    notifBtn.setAttribute('aria-label', 'اعلان‌ها')
    notifBtn.setAttribute('aria-expanded', 'false')
    notifBtn.innerHTML = `${icon('bell')}<span class="notif-dot" data-notif-dot></span>`

    notifPanel = document.createElement('div')
    notifPanel.className = 'popover-panel'
    notifPanel.setAttribute('role', 'region')
    notifPanel.setAttribute('aria-label', 'مرکز اعلان‌ها')
    notifPanel.hidden = true

    mount.append(notifBtn, notifPanel)
    renderNotifications()

    notifBtn.addEventListener('click', () => {
      notifOpen = !notifOpen
      if (notifOpen) {
        renderNotifications()
        notifPanel.hidden = false
        notifBtn.setAttribute('aria-expanded', 'true')
        document.addEventListener('pointerdown', onOutsideNotif)
      } else {
        closeNotif()
      }
    })

    topbar.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeNotif({ restoreFocus: false })
    })
  }

  function renderNotifications() {
    const typeClass = {
      deadline: 'badge-warn',
      budget: 'badge-warn',
      warning: 'badge-warn',
      activity: 'badge-ok',
      success: 'badge-ok',
      packing: 'badge-info',
      trip: 'badge-info',
      info: 'badge-info',
      system: 'badge-info',
    }

    const rows = notificationsService.list()
    const hasUnread = notificationsService.unreadCount() > 0
    qs('[data-notif-dot]', notifBtn).style.display = hasUnread ? '' : 'none'

    notifPanel.innerHTML = `
      <div class="flex items-center justify-between px-2 pb-2 pt-1">
        <b class="text-sm font-extrabold text-ink">اعلان‌ها</b>
        <button type="button" class="btn btn-ghost btn-sm" data-notif-read ${hasUnread ? '' : 'disabled style="opacity:.5;cursor:default"'}>خواندن همه</button>
      </div>
      <ul class="space-y-1">
        ${
          rows.length
            ? rows
                .map((n) => {
                  const timeLabel = n.created_at
                    ? new Date(n.created_at).toLocaleDateString('fa-IR')
                    : ''
                  return `
          <li class="flex flex-col gap-1 rounded-lg p-2.5 ${n.is_read ? '' : 'bg-tint'}">
            <span class="text-[13px] leading-6 text-ink">${n.title}</span>
            ${n.message ? `<span class="text-[11px] leading-5 text-slate">${n.message}</span>` : ''}
            <span class="flex items-center gap-2">
              <span class="badge ${typeClass[n.type] || 'badge-info'}">${timeLabel}</span>
              ${n.is_read ? '' : '<span class="text-[11px] font-bold text-sky">جدید</span>'}
            </span>
          </li>`
                })
                .join('')
            : '<li class="p-3 text-center text-[12px] text-slate">اعلانی ندارید.</li>'
        }
      </ul>
    `

    notifPanel.querySelector('[data-notif-read]')?.addEventListener('click', async (e) => {
      if ((e.currentTarget)?.disabled) return
      try {
        await notificationsService.markAllRead()
        renderNotifications()
        toast.info('همهٔ اعلان‌ها خوانده شدند.')
      } catch (error) {
        toast.error?.('عملیات ناموفق بود.')
      }
    })
  }

  function closeNotif({ restoreFocus = true } = {}) {
    if (!notifOpen) return
    notifOpen = false
    notifPanel.hidden = true
    notifBtn.setAttribute('aria-expanded', 'false')
    document.removeEventListener('pointerdown', onOutsideNotif)
    if (restoreFocus) notifBtn.focus()
  }

  function onOutsideNotif(event) {
    if (!notifBtn.contains(event.target) && !notifPanel.contains(event.target)) {
      closeNotif({ restoreFocus: false })
    }
  }

  function buildProfile() {
    const mount = qs('[data-profile]', topbar)
    if (!mount) return

    const trigger = document.createElement('button')
    trigger.type = 'button'
    trigger.className = 'trip-trigger'
    trigger.innerHTML = `
      <span class="avatar avatar-sm" aria-hidden="true">سم</span>
      <span class="hidden text-start leading-tight md:block">
        <span class="block text-sm font-bold text-ink">سارا محمدی</span>
        <span class="block text-[11px] text-slate">حساب نمایشی</span>
      </span>
      <span class="text-slate">${CHEVRON}</span>
    `

    const dropdown = createDropdown({
      trigger,
      manageLabel: false,
      ariaLabel: 'منوی کاربر',
      items: [
        { value: 'dashboard', label: 'داشبورد' },
        { value: 'settings', label: 'تنظیمات' },
        { value: 'landing', label: 'بازگشت به صفحهٔ اصلی' },
        { value: 'logout', label: 'خروج از حساب' },
      ],
      onSelect: (value) => {
        if (value === 'landing') window.location.href = 'index.html'
        else if (value === 'logout') {
          authService.logout().finally(() => window.location.reload())
        } else window.location.hash = `/${value}`
      },
    })

    mount.appendChild(dropdown.el)
  }

  return () => {}
}
