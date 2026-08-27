import { gsap, prefersReducedMotion } from '../animations/gsap.js'

const CHEVRON =
  '<svg class="dd-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>'

export function createDropdown({
  items = [],
  placeholder = 'انتخاب کنید',
  ariaLabel = 'منوی انتخاب',
  onSelect,
  selectedValue = null,
  trigger = null,
  manageLabel = true,
} = {}) {
  const wrap = document.createElement('div')
  wrap.className = 'dropdown'

  if (!trigger) {
    trigger = document.createElement('button')
    trigger.type = 'button'
    trigger.className = 'btn btn-secondary btn-sm'
    if (manageLabel) trigger.innerHTML = `<span data-dd-label></span>${CHEVRON}`
  }

  trigger.setAttribute('aria-haspopup', 'menu')
  trigger.setAttribute('aria-expanded', 'false')

  const menu = document.createElement('div')
  menu.className = 'dropdown-menu'
  menu.setAttribute('role', 'menu')

  wrap.append(trigger, menu)

  let isOpen = false
  let value = selectedValue
  const labelEl = trigger.querySelector('[data-dd-label]')

  function itemButton(item) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'dropdown-item'
    btn.setAttribute('role', 'menuitem')
    btn.dataset.value = item.value
    btn.setAttribute('aria-selected', String(item.value === value))

    if (item.meta || item.remaining || item.status) {
      btn.innerHTML = `
        <span class="min-w-0 flex-1">
          <span class="block truncate font-semibold">${item.label}</span>
          <span class="mt-0.5 block text-[11px] font-normal text-slate">
            ${[item.meta, item.status, item.remaining].filter(Boolean).join(' · ')}
          </span>
        </span>
        <span class="dd-check hidden text-sky" aria-hidden="true">✓</span>
      `
      void 0
    } else {
      btn.textContent = item.label
    }
    return btn
  }

  function refreshSelection() {
    qsa('.dropdown-item', menu).forEach((b) => {
      b.setAttribute('aria-selected', String(b.dataset.value === value))
      const check = b.querySelector('.dd-check')
      if (check) check.style.visibility = b.dataset.value === value ? 'visible' : 'hidden'
    })
  }

  const buttons = items.map((item) => {
    const btn = itemButton(item)
    menu.appendChild(btn)
    return btn
  })
  refreshSelection()

  function setSelected(btn, { silent = false } = {}) {
    value = btn ? btn.dataset.value : null
    refreshSelection()
    if (manageLabel) labelEl.textContent = btn ? btn.textContent.trim().split('\n')[0] : placeholder
    if (!silent && btn) onSelect?.(value, items.find((i) => String(i.value) === String(value)))
  }

  function focusAt(index) {
    const clamped = (index + buttons.length) % buttons.length
    buttons[clamped]?.focus()
  }

  function openMenu() {
    if (isOpen) return
    isOpen = true
    menu.classList.add('is-open')
    trigger.setAttribute('aria-expanded', 'true')
    if (!prefersReducedMotion()) {
      gsap.fromTo(
        menu,
        { autoAlpha: 0, y: -6 },
        { autoAlpha: 1, y: 0, duration: 0.22, ease: 'power2.out' },
      )
    }
    const current = buttons.findIndex((b) => String(b.dataset.value) === String(value))
    setTimeout(() => focusAt(current >= 0 ? current : 0), 0)
    document.addEventListener('pointerdown', onOutside)
  }

  function closeMenu({ restoreFocus = true } = {}) {
    if (!isOpen) return
    isOpen = false
    menu.classList.remove('is-open')
    gsap.set(menu, { clearProps: 'all' })
    trigger.setAttribute('aria-expanded', 'false')
    document.removeEventListener('pointerdown', onOutside)
    if (restoreFocus) trigger.focus()
  }

  function onOutside(event) {
    if (!wrap.contains(event.target)) closeMenu({ restoreFocus: false })
  }

  trigger.addEventListener('click', () => (isOpen ? closeMenu() : openMenu()))
  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      openMenu()
    }
  })

  menu.addEventListener('keydown', (e) => {
    const index = buttons.indexOf(document.activeElement)
    switch (e.key) {
      case 'Escape':
        e.preventDefault()
        closeMenu()
        break
      case 'ArrowDown':
        e.preventDefault()
        focusAt(index + 1)
        break
      case 'ArrowUp':
        e.preventDefault()
        focusAt(index - 1)
        break
      case 'Home':
        e.preventDefault()
        focusAt(0)
        break
      case 'End':
        e.preventDefault()
        focusAt(buttons.length - 1)
        break
      case 'Tab':
        closeMenu({ restoreFocus: false })
        break
      default:
        break
    }
  })

  menu.addEventListener('click', (e) => {
    const btn = e.target.closest('.dropdown-item')
    if (!btn) return
    setSelected(btn)
    closeMenu()
  })

  const initial = buttons.find((b) => String(b.dataset.value) === String(value))
  if (initial && manageLabel) labelEl.textContent = initial.textContent

  return {
    el: wrap,
    getValue: () => value,
    setValue(next) {
      const btn = buttons.find((b) => String(b.dataset.value) === String(next))
      if (btn) setSelected(btn, { silent: true })
    },
    open: openMenu,
    close: () => closeMenu({ restoreFocus: false }),
    destroy: () => {
      closeMenu({ restoreFocus: false })
      wrap.remove()
    },
  }
}

function qsa(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector))
}
