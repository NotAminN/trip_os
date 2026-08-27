import { getState, setState, subscribe } from '../state/app-state.js'
import { ROUTES } from '../router.js'
import { icon } from './icons.js'
import { qs } from '../utils/helpers.js'

export function initSidebar() {
  const sidebar = qs('[data-sidebar]')
  if (!sidebar) return null

  const navList = qs('[data-side-nav]', sidebar)

  ROUTES.forEach((route) => {
    const item = document.createElement('a')
    item.className = 'nav-item'
    item.href = `#/${route.key}`
    item.dataset.routeKey = route.key
    item.dataset.tooltip = route.label
    item.innerHTML = `<span class="nav-icon">${icon(route.icon)}</span><span class="side-label">${route.label}</span>`
    navList.appendChild(item)
  })

  function applyCollapsed(collapsed) {
    sidebar.classList.toggle('is-collapsed', collapsed)
    qsa('.nav-item', sidebar).forEach((item) => {
      if (collapsed) {
        item.setAttribute('data-tooltip', item.querySelector('.side-label').textContent)
      } else {
        item.removeAttribute('data-tooltip')
      }
    })
    const toggle = qs('[data-collapse-toggle]', sidebar)
    toggle?.setAttribute('aria-label', collapsed ? 'باز کردن منوی کناری' : 'جمع کردن منوی کناری')
  }

  applyCollapsed(getState().sidebarCollapsed)
  subscribe((state) => applyCollapsed(state.sidebarCollapsed))

  qs('[data-collapse-toggle]', sidebar)?.addEventListener('click', () => {
    setState({ sidebarCollapsed: !getState().sidebarCollapsed })
  })

  return (activeKey) => {
    qsa('.nav-item', sidebar).forEach((item) => {
      if (item.dataset.routeKey === activeKey) item.setAttribute('aria-current', 'page')
      else item.removeAttribute('aria-current')
    })
  }
}

function qsa(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector))
}
