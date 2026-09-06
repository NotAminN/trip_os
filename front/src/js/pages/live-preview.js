import { toast } from '../components/toast.js'
import { toPersianDigits } from '../utils/formatters.js'
import { qs, qsa } from '../utils/helpers.js'

let countdownInterval = null

function initLiveTabs() {
  const tabButtons = qsa('[data-live-tab]')
  const panels = qsa('[data-live-panel]')

  if (!tabButtons.length || !panels.length) return

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.liveTab

      tabButtons.forEach((b) => {
        const isActive = b === btn
        b.classList.toggle('is-active', isActive)
        b.setAttribute('aria-selected', isActive ? 'true' : 'false')
      })

      panels.forEach((p) => {
        const matches = p.dataset.livePanel === target
        p.classList.toggle('hidden', !matches)
        p.setAttribute('aria-hidden', matches ? 'false' : 'true')
      })
    })
  })
}

function initFlightCountdown() {
  const elHours = qs('[data-flight-cd-h]')
  const elMins = qs('[data-flight-cd-m]')
  const elSecs = qs('[data-flight-cd-s]')

  if (!elHours && !elMins && !elSecs) return

  // 42 minutes and 35 seconds remaining
  let totalSeconds = 42 * 60 + 35

  if (countdownInterval) clearInterval(countdownInterval)

  function render() {
    if (totalSeconds <= 0) {
      if (elHours) elHours.textContent = toPersianDigits('۰۰')
      if (elMins) elMins.textContent = toPersianDigits('۰۰')
      if (elSecs) elSecs.textContent = toPersianDigits('۰۰')
      clearInterval(countdownInterval)
      return
    }

    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60

    if (elHours) elHours.textContent = toPersianDigits(String(h).padStart(2, '0'))
    if (elMins) elMins.textContent = toPersianDigits(String(m).padStart(2, '0'))
    if (elSecs) elSecs.textContent = toPersianDigits(String(s).padStart(2, '0'))

    totalSeconds -= 1
  }

  render()
  countdownInterval = setInterval(render, 1000)
}

function wireLiveActions() {
  // Flight simulation notification
  qs('[data-simulate-flight-notif]')?.addEventListener('click', () => {
    toast.info('اعلان هواپیمایی ماهان: گیت ۲۴ باز شد — سوار شدن مسافران پرواز W5-112 آغاز شد.')
  })

  // Routing to next landmark
  qs('[data-live-route-action]')?.addEventListener('click', () => {
    toast.success('مسیریابی زنده تا کاخ توپکاپی فعال شد (۱۸ دقیقه پیاده‌روی).')
  })

  // Checkin voucher action
  qs('[data-live-voucher-action]')?.addEventListener('click', () => {
    toast.info('ووچر رزرو هتل پرا پالاس آماده است — شماره تأیید: TR-89420')
  })

  // Sync companion ping
  qs('[data-live-ping-companion]')?.addEventListener('click', () => {
    toast.success('موقعیت زنده برای سارا و نوید ارسال شد.')
  })
}

export function initLivePreview() {
  initLiveTabs()
  initFlightCountdown()
  wireLiveActions()
}
