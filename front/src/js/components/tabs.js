function initTabsRoot(root) {
  const list = root.querySelector('[role="tablist"]')
  if (!list) return
  const tabs = Array.from(list.querySelectorAll('[role="tab"]'))
  if (!tabs.length) return

  const panels = tabs.map((tab) => {
    const id = tab.getAttribute('aria-controls')
    return id ? root.querySelector(`#${id}`) || document.getElementById(id) : null
  })

  function activate(tab, { focus = false } = {}) {
    tabs.forEach((t, i) => {
      const isSelected = t === tab
      t.setAttribute('aria-selected', String(isSelected))
      t.tabIndex = isSelected ? 0 : -1
      if (panels[i]) panels[i].hidden = !isSelected
    })
    if (focus) tab.focus()
  }

  list.addEventListener('click', (event) => {
    const tab = event.target.closest('[role="tab"]')
    if (tab && tabs.includes(tab)) activate(tab)
  })

  list.addEventListener('keydown', (event) => {
    const rtl = document.documentElement.dir === 'rtl'
    let delta = 0

    if (event.key === 'ArrowRight') delta = rtl ? -1 : 1
    else if (event.key === 'ArrowLeft') delta = rtl ? 1 : -1
    else if (event.key === 'Home') {
      event.preventDefault()
      activate(tabs[0], { focus: true })
      return
    } else if (event.key === 'End') {
      event.preventDefault()
      activate(tabs[tabs.length - 1], { focus: true })
      return
    } else {
      return
    }

    event.preventDefault()
    const index = tabs.indexOf(document.activeElement)
    if (index < 0) return
    activate(tabs[(index + delta + tabs.length) % tabs.length], { focus: true })
  })

  const initial = tabs.find((t) => t.getAttribute('aria-selected') === 'true') || tabs[0]
  activate(initial)
}

export function initTabs(scope = document) {
  scope.querySelectorAll('[data-tabs]').forEach(initTabsRoot)
}
