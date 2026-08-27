import { createOverlayController, centerAnimations } from './overlay.js'
import { uid } from '../utils/helpers.js'

const CLOSE_ICON =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'

export function createModal({
  title = '',
  description = '',
  content = null,
  size = 'md',
  actions = [],
  onClose,
} = {}) {
  const titleId = uid('modal-title')

  const wrap = document.createElement('div')
  wrap.className = 'overlay'
  wrap.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="modal-panel modal-${size}" role="dialog" aria-modal="true" aria-labelledby="${titleId}" data-overlay-panel>
      <header class="modal-header">
        <div class="min-w-0">
          <h2 class="modal-title" id="${titleId}"></h2>
          ${description ? '<p class="modal-desc" data-modal-desc></p>' : ''}
        </div>
        <button type="button" class="icon-btn ms-auto shrink-0" data-modal-close aria-label="بستن پنجره">
          ${CLOSE_ICON}
        </button>
      </header>
      <div class="modal-body" data-modal-body></div>
      ${actions.length ? '<footer class="modal-footer" data-modal-footer></footer>' : ''}
    </div>
  `

  wrap.querySelector(`#${titleId}`).textContent = title
  if (description) wrap.querySelector('[data-modal-desc]').textContent = description

  const body = wrap.querySelector('[data-modal-body]')
  if (typeof content === 'string') body.innerHTML = content
  else if (content instanceof HTMLElement) body.appendChild(content)

  const panel = wrap.querySelector('[data-overlay-panel]')
  const { animateIn, animateOut } = centerAnimations()
  const api = createOverlayController({ wrap, panel, animateIn, animateOut, onClosed: onClose })

  wrap.querySelector('[data-modal-close]').addEventListener('click', () => api.requestClose())

  if (actions.length) {
    const footer = wrap.querySelector('[data-modal-footer]')
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
