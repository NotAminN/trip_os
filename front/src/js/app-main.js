import '../css/main.css'
import 'lenis/dist/lenis.css'
import { initGsap, applySavedMotionPreference } from './animations/gsap.js'
import { initSmoothScroll } from './animations/scroll.js'
import { initTooltips } from './components/tooltip.js'
import {
  bindPaletteShortcut,
  initCommandPalette,
} from './components/command-palette.js'
import { showAuthGate } from './components/auth-gate.js'
import { authService } from './services/auth.js'
import { tripService } from './services/trips.js'
import { timelineService } from './services/timeline.js'
import { placeService } from './services/places.js'
import { budgetService } from './services/budget.js'
import { packingService } from './services/packing.js'
import { weatherService } from './services/weather.js'
import { notesService } from './services/notes.js'
import { notificationsService } from './services/notifications.js'
import { toast } from './components/toast.js'
import { initSidebar } from './shell/sidebar.js'
import { initTopbar } from './shell/topbar.js'
import { initMobileNav } from './shell/mobile-nav.js'
import { startRouter } from './router.js'
import { qs } from './utils/helpers.js'

async function boot() {
  const motionReduced = applySavedMotionPreference()
  document.documentElement.classList.add('js')
  if (motionReduced) document.documentElement.classList.add('no-motion')

  initGsap()
  initSmoothScroll()
  initTooltips()

  // --- Authentication gate -------------------------------------------
  window.addEventListener('tripos:session-expired', () => {
    location.reload()
  })

  try {
    await waitForSession()
  } catch (error) {
    // Backend offline or network issue: keep the user informed, retry.
    console.error(error)
    toast.error?.('اتصال به سرور برقرار نشد؛ دوباره تلاش کنید.')
    return
  }

  // --- Load application data from the Django API ----------------------
  try {
    await tripService.ensureLoaded()
  } catch (error) {
    console.error(error)
    toast.error?.('دریافت اطلاعات با مشکل مواجه شد.')
    return
  }

  const currentTrip = tripService.getCurrent()
  await Promise.allSettled([
    timelineService.ensureLoaded(currentTrip?.id),
    placeService.ensureLoaded(currentTrip?.id),
    budgetService.ensureLoaded(currentTrip?.id),
    packingService.ensureLoaded(currentTrip?.id),
    weatherService.ensureLoaded(currentTrip?.id),
    notesService.ensureLoaded(currentTrip?.id),
    notificationsService.ensureLoaded(),
  ])

  // Mirror live counts onto the cached trips so cards/progress bars show real data.
  for (const trip of tripService.list()) {
    const days = timelineService.getDays(trip)
    const activities = days.reduce((sum, d) => sum + d.activities.length, 0)
    trip.stats.places = placeService.listByTrip(trip.id).length
    trip.stats.activities = activities
    const packing = packingService.summary(trip.id)
    if (packing) trip.packing = { done: packing.done, total: packing.total }
    if (days.length) {
      trip.progress = days.length
        ? Math.round(days.reduce((sum, d) => sum + d.completion, 0) / days.length)
        : 0
    }
  }

  const palette = initCommandPalette()
  bindPaletteShortcut()

  const setActiveSidebar = initSidebar()
  initTopbar({ onOpenPalette: () => palette.open() })
  const setActiveBottomNav = initMobileNav()

  startRouter(qs('[data-view]'), (key) => {
    setActiveSidebar?.(key)
    setActiveBottomNav?.(key)
    if (key === 'notfound') {
      setActiveSidebar?.('')
      setActiveBottomNav?.('')
    }
  })
}

async function waitForSession() {
  if (!authService.isAuthenticated()) {
    await showAuthGate()
    await authService.me()
    return
  }
  const user = await authService.me()
  if (!user) {
    await showAuthGate()
    await authService.me()
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true })
} else {
  boot()
}
