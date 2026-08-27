import { createDrawer } from '../components/drawer.js'
import { ROUTES } from '../router.js'
import { icon } from './icons.js'
import { qs, qsa } from '../utils/helpers.js'

const PRIMARY_ITEMS = [
  { key: 'dashboard', label: 'خانه', iconName: 'home' },
  { key: 'timeline', label: 'برنامه', iconName: 'calendar' },
  { key: 'map', label: 'نقشه', iconName: 'pin' },
  { key: 'budget', label: 'بودجه', iconName: 'wallet' },
]

let moreMenu = null

function openMoreMenu(trigger) {
  if (!moreMenu) {
    const content = document.createElement('div')
    content.innerHTML = `<ul class="space-y-1">${ROUTES.map(
      (route) => `
        <li><a href="#/${route.key}" class="m-link" data-more-route="${route.key}">
          ${route.label}
          <svg class="dd-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>
        </a></li>`,
    ).join('')}</ul>`

    moreMenu = createDrawer({
      title: 'همهٔ بخش‌ها',
      side: 'end',
      content,
    })

    content.addEventListener('click', (e) => {
      if (e.target.closest('[data-more-route]')) moreMenu.requestClose()
    })
  }
  moreMenu.open(trigger)
}

export function initMobileNav() {
  const nav = qs('[data-bottom-nav]')
  if (!nav) return () => {}

  PRIMARY_ITEMS.forEach(({ key, label, iconName }) => {
    const link = document.createElement('a')
    link.href = `#/${key}`
    link.className = 'bottom-nav-item'
    link.dataset.routeKey = key
    link.innerHTML = `${icon(iconName, 20)}<span>${label}</span>`
    nav.appendChild(link)
  })

  const moreBtn = document.createElement('button')
  moreBtn.type = 'button'
  moreBtn.className = 'bottom-nav-item'
  moreBtn.innerHTML = `${icon('marker', 20)}<span>بیشتر</span>`
  moreBtn.addEventListener('click', () => openMoreMenu(moreBtn))
  nav.appendChild(moreBtn)

  document.addEventListener('app:toggle-mobile-menu', () => openMoreMenu(nav))

  return (activeKey) => {
    qsa('[data-route-key]', nav).forEach((el) => {
      if (el.dataset.routeKey === activeKey) el.setAttribute('aria-current', 'page')
      else el.removeAttribute('aria-current')
    })
  }
}
