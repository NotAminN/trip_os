import { toast } from './toast.js'
import { createDrawer } from './drawer.js'
import { scrollToSection } from '../animations/scroll.js'
import { qs } from '../utils/helpers.js'

const HEADER_OFFSET = -84

const CHEVRON =
  '<svg class="dd-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>'

function handleNavLink(el) {
  const target = el.dataset.navTarget
  if (!target) return
  const label = el.textContent.trim()
  const exists = document.querySelector(target)

  if (exists) {
    scrollToSection(target, HEADER_OFFSET)
  } else {
    toast.info(`بخش «${label}» به‌زودی در همین صفحه ساخته می‌شود.`)
  }
}

function buildMenuContent() {
  const content = document.createElement('div')
  content.className = 'flex h-full flex-col'
  content.innerHTML = `
    <nav aria-label="منوی موبایل">
      <ul class="space-y-1">
        <li><a href="#preview" class="m-link" data-nav-target="#preview">
          نمای زندهٔ محصول ${CHEVRON}</a></li>
        <li><a href="#features" class="m-link" data-nav-target="#features">
          امکانات ${CHEVRON}</a></li>
        <li><a href="#how-it-works" class="m-link" data-nav-target="#how-it-works">
          چگونه کار می‌کند؟ ${CHEVRON}</a></li>
        <li><a href="#faq" class="m-link" data-nav-target="#faq">
          پرسش‌های متداول ${CHEVRON}</a></li>
      </ul>
    </nav>
    <div class="mt-auto space-y-2 pt-6">
      <button type="button" class="btn btn-primary w-full" data-app-link>
        شروع برنامه‌ریزی
      </button>
      <button type="button" class="btn btn-secondary w-full" data-demo-login>ورود به داشبورد</button>
    </div>
  `
  return content
}

export function initNavbar(header) {
  if (!header) return

  const updateScrolled = () => {
    header.classList.toggle('is-scrolled', (window.scrollY || 0) > 24)
  }
  window.addEventListener('scroll', updateScrolled, { passive: true })
  updateScrolled()

  let menu = null
  const burger = qs('[data-burger]', header)

  function openMenu() {
    if (!menu) {
      const content = buildMenuContent()
      menu = createDrawer({
        title: 'منوی Trip OS',
        side: 'start',
        content,
        onClose: () => {
          burger?.classList.remove('is-open')
          burger?.setAttribute('aria-expanded', 'false')
        },
      })

      content.addEventListener('click', (event) => {
        const loginBtn = event.target.closest('[data-demo-login]')
        if (loginBtn) {
          toast.info('نسخهٔ نمایشی است؛ ورود در فازهای بعدی فعال می‌شود.')
          return
        }
        const link = event.target.closest('[data-nav-target]')
        if (!link) return
        event.preventDefault()
        menu.requestClose()
        handleNavLink(link)
      })
    }

    burger?.classList.add('is-open')
    burger?.setAttribute('aria-expanded', 'true')
    menu.open(burger)
  }

  header.addEventListener('click', (event) => {
    if (event.target.closest('[data-burger]')) {
      openMenu()
      return
    }

    if (event.target.closest('[data-demo-login]')) {
      window.location.assign('app.html#/dashboard')
      return
    }

    if (event.target.closest('[data-app-link]')) {
      event.preventDefault()
      window.location.assign('app.html#/dashboard')
      return
    }

    const link = event.target.closest('[data-nav-target]')
    if (link) {
      event.preventDefault()
      handleNavLink(link)
    }
  })

  const desktopQuery = window.matchMedia('(min-width: 1024px)')
  desktopQuery.addEventListener('change', (event) => {
    if (event.matches && menu?.isOpen) menu.requestClose()
  })
}
