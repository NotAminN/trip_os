import { gsap, prefersReducedMotion } from '../animations/gsap.js'
import { qs, qsa } from '../utils/helpers.js'

function initAccordionRoot(root) {
  const items = qsa('[data-acc-item]', root)
  if (!items.length || root.dataset.accInit) return
  root.dataset.accInit = 'true'

  let openItem = null

  function setOpen(item, open, { focusBack = false } = {}) {
    const btn = qs('[data-acc-btn]', item)
    const panel = qs('[data-acc-panel]', item)
    if (!btn || !panel) return

    btn.setAttribute('aria-expanded', String(open))
    item.classList.toggle('is-open', open)

    if (prefersReducedMotion()) {
      gsap.set(panel, { height: open ? 'auto' : 0 })
    } else {
      gsap.to(panel, { height: open ? 'auto' : 0, duration: 0.35, ease: 'power2.inOut' })
    }

    if (focusBack) btn.focus()
  }

  items.forEach((item) => {
    const btn = qs('[data-acc-btn]', item)
    const panel = qs('[data-acc-panel]', item)
    if (!btn || !panel) return

    gsap.set(panel, { height: 0 })

    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('is-open')

      if (openItem && openItem !== item && openItem.classList.contains('is-open')) {
        setOpen(openItem, false)
      }

      setOpen(item, !isOpen)

      if (!isOpen) openItem = item
      else if (openItem === item) openItem = null
    })
  })
}

export function initAccordions(scope = document) {
  scope.querySelectorAll('[data-accordion]').forEach(initAccordionRoot)
}
