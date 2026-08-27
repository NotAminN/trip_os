import { createOverlayController, slideAnimations } from './overlay.js'
import { uid } from '../utils/helpers.js'

const CLOSE_ICON =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'

export function createDrawer({
  title = '',
  content = null,
  side = 'start',
  actions = [],
  onClose,
} = {}) {
  const titleId = uid('drawer-title')

  const wrap = document.createElement('div')
  wrap.className = `drawer-overlay drawer-side-${side}`
  wrap.innerHTML = `
    <div class="overlay-backdrop"></div>
    <aside class="drawer-panel" role="dialog" aria-modal="true" aria-labelledby="${titleId}" data-overlay-panel>
      <span class="drawer-grabber" aria-hidden="true"></span>
      <header class="modal-header">
        <h2 class="modal-title" id="${titleId}"></h2>
        <button type="button" class="icon-btn ms-auto shrink-0" data-drawer-close aria-label="بستن پنل">
          ${CLOSE_ICON}
        </button>
      </header>
      <div class="modal-body" data-drawer-body></div>
      ${actions.length ? '<footer class="modal-footer" data-drawer-footer></footer>' : ''}
    </aside>
  `

  wrap.querySelector(`#${titleId}`).textContent = title

  const body = wrap.querySelector('[data-drawer-body]')
  if (typeof content === 'string') body.innerHTML = content
  else if (content instanceof HTMLElement) body.appendChild(content)

  const panel = wrap.querySelector('[data-overlay-panel]')
  const { animateIn, animateOut } = slideAnimations(side)
  const api = createOverlayController({ wrap, panel, animateIn, animateOut, onClosed: onClose })

  wrap.querySelector('[data-drawer-close]').addEventListener('click', () => api.requestClose())

  if (actions.length) {
    const footer = wrap.querySelector('[data-drawer-footer]')
    actions.forEach(({ label, variant = 'btn-primary', onClick }) => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `btn ${variant}`
      btn.textContent = label
      btn.addEventListener('click', () => onClick?.(api))
      footer.appendChild(btn)
    })
  }

  document.body.appendChild(wrap)

  return Object.assign(api, { body })
}
