import { gsap, prefersReducedMotion } from './animations/gsap.js'
import { qs } from './utils/helpers.js'

export const ROUTES = [
  { key: 'dashboard', label: 'داشبورد', icon: 'home' },
  { key: 'trips', label: 'سفرهای من', icon: 'compass' },
  { key: 'timeline', label: 'برنامه سفر', icon: 'calendar' },
  { key: 'map', label: 'نقشه', icon: 'pin' },
  { key: 'places', label: 'مکان‌ها', icon: 'marker' },
  { key: 'budget', label: 'بودجه', icon: 'wallet' },
  { key: 'weather', label: 'آب‌وهوا', icon: 'cloudSun' },
  { key: 'packing', label: 'چمدان', icon: 'bag' },
  { key: 'notes', label: 'یادداشت‌ها', icon: 'note' },
  { key: 'analytics', label: 'آمار سفر', icon: 'chart' },
  { key: 'settings', label: 'تنظیمات', icon: 'gear' },
]

const routeByKey = new Map(ROUTES.map((r) => [r.key, r]))

let viewContainer = null
let onRouteChange = null
let currentKey = null

function parseHash() {
  const hash = window.location.hash.replace(/^#\/?/, '')
  return routeByKey.has(hash) ? hash : hash === '' ? 'dashboard' : 'notfound'
}

async function renderRoute(key) {
  if (!viewContainer || key === currentKey) return

  try {
    currentKey = key

    if (key === 'notfound') {
      const module = await import('./pages/placeholder.js')
      module.render(viewContainer, { notFound: true })
    } else {
      const route = routeByKey.get(key)
      document.title = `${route.label} · Trip OS`
      if (route.phase) {
        const module = await import('./pages/placeholder.js')
        module.render(viewContainer, { title: route.label, phase: route.phase, icon: route.icon })
      } else {
        const module = await import(`./pages/${key}.js`)
        await module.render(viewContainer)
      }
    }
  } catch (error) {
    currentKey = null
    document.title = 'خطا · Trip OS'
    viewContainer.innerHTML = `
      <div class="mx-auto mt-14 max-w-md text-center">
        <p class="text-6xl font-extrabold text-lineblue select-none" aria-hidden="true">!</p>
        <h1 class="mt-4 text-2xl font-extrabold text-deep">این بخش بارگذاری نشد.</h1>
        <p class="mt-2 text-sm leading-7 text-slate">یک خطای غیرمنتظره رخ داد؛ دوباره تلاش کن یا به داشبورد برگرد.</p>
        <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button type="button" class="btn btn-primary" data-retry-route>تلاش مجدد</button>
          <a href="#/dashboard" class="btn btn-secondary">داشبورد</a>
        </div>
      </div>
    `
    viewContainer.querySelector('[data-retry-route]')?.addEventListener('click', () => {
      handleHashChange()
    })
    return
  }

  onRouteChange?.(key)

  if (prefersReducedMotion()) return
  gsap.fromTo(
    viewContainer,
    { autoAlpha: 0, y: 14 },
    {
      autoAlpha: 1,
      y: 0,
      duration: 0.32,
      ease: 'power2.out',
      // If rAF-driven tweens stall (hidden tab), force the view visible.
      onComplete: () => gsap.set(viewContainer, { clearProps: 'opacity,visibility,transform' }),
      onStart: () => setTimeout(() => {
        if (getComputedStyle(viewContainer).visibility === 'hidden') {
          gsap.set(viewContainer, { clearProps: 'opacity,visibility,transform' })
        }
      }, 1200),
    },
  )
}

function handleHashChange() {
  renderRoute(parseHash())
  viewContainer?.scrollTo?.({ top: 0 })
  window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
}

export function navigate(key) {
  window.location.hash = `/${key}`
}

export function startRouter(container, onRouteChangeCallback) {
  viewContainer = container
  onRouteChange = onRouteChangeCallback

  window.addEventListener('hashchange', handleHashChange)

  return renderRoute(parseHash())
}
