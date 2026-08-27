import '../css/main.css'
import 'lenis/dist/lenis.css'
import { initGsap, applySavedMotionPreference, revealAll } from './animations/gsap.js'
import { initSmoothScroll } from './animations/scroll.js'
import { initHero } from './animations/hero.js'
import { initMarketing } from './animations/marketing.js'
import { initAccordions } from './components/accordion.js'
import { toast } from './components/toast.js'
import { getLenis } from './animations/scroll.js'
import { copyText } from './utils/clipboard.js'
import { initTooltips } from './components/tooltip.js'
import { initNavbar } from './components/navbar.js'
import { initWorldClocks } from './components/world-clock.js'
import { initStyleGuide } from './pages/style-guide.js'
import { qs } from './utils/helpers.js'

function boot() {
  const motionReduced = applySavedMotionPreference()
  document.documentElement.classList.add('js')
  if (motionReduced) document.documentElement.classList.add('no-motion')

  initGsap()
  initSmoothScroll()
  initHero()
  revealAll()
  initTooltips()
  initStyleGuide()
  initNavbar(qs('[data-navbar]'))
  initMarketing()
  initAccordions()
  initWorldClocks()
  initGlobalActions()
}

function initGlobalActions() {
  document.addEventListener('click', (event) => {
    const copyBtn = event.target.closest('[data-copy-email]')
    if (copyBtn) {
      copyText(copyBtn.dataset.copyEmail)
        .then(() => toast.success('نشانی ایمیل کپی شد.'))
        .catch(() => toast.error('کپی انجام نشد؛ نشانی را دستی کپی کن.'))
      return
    }

    const topBtn = event.target.closest('[data-back-top]')
    if (topBtn) {
      const lenis = getLenis()
      if (lenis) lenis.scrollTo(0, { duration: 1.1 })
      else window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true })
} else {
  boot()
}
