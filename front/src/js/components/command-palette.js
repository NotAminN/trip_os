import { createOverlayController, centerAnimations } from './overlay.js'
import { ROUTES, navigate } from '../router.js'
import { tripService } from '../services/trips.js'
import { setState } from '../state/app-state.js'
import { toast } from './toast.js'
import { icon } from '../shell/icons.js'
import { qsa } from '../utils/helpers.js'
import { toPersianDigits } from '../utils/formatters.js'

let instance = null
let keyHandlerBound = false

function buildCommands() {
  const navCommands = ROUTES.map((route) => ({
    group: 'ناوبری',
    label: `رفتن به ${route.label}`,
    hint: route.phase ? `فاز ${toPersianDigits(route.phase)}` : '',
    icon: route.icon,
    run: () => navigate(route.key),
  }))

  const tripCommands = tripService.list().map((trip) => ({
    group: 'سفرها',
    label: `تغییر سفر به «${trip.title}»`,
    hint: `${trip.daysCount} روز · ${trip.statusLabel}`,
    icon: 'compass',
    run: () => {
      setState({ currentTripId: trip.id })
      toast.success(`سفر فعال: «${trip.title}»`)
    },
  }))

  const actions = [
    {
      group: 'کنش‌ها',
      label: 'بازگشت به صفحهٔ اصلی',
      hint: 'لندینگ',
      icon: 'home',
      run: () => {
        window.location.href = 'index.html'
      },
    },
    {
      group: 'کنش‌ها',
      label: 'ساخت سفر جدید',
      hint: 'به‌زودی — فاز ۸',
      icon: 'sparkle',
      run: () => {
        navigate('trips')
        toast.info('جریان ساخت سفر در فاز هشتم فعال می‌شود.')
      },
    },
  ]

  return [...navCommands, ...tripCommands, ...actions]
}

export function initCommandPalette() {
  if (instance) return instance

  const wrap = document.createElement('div')
  wrap.className = 'overlay'
  wrap.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="modal-panel modal-md" role="dialog" aria-modal="true" aria-label="پالت دستورات" data-overlay-panel style="align-self:flex-start;margin-top:14vh;max-height:72vh">
      <div class="border-b border-line p-3">
        <input
          type="text"
          class="input border-0 shadow-none focus:shadow-none"
          placeholder="جستجو در دستورات و سفرها…"
          aria-label="جستجو در دستورات"
          data-palette-input
        />
      </div>
      <div class="max-h-[46vh] overflow-y-auto p-2" data-palette-results role="listbox" aria-label="نتایج"></div>
      <footer class="flex items-center gap-4 border-t border-line px-4 py-2.5 text-[11px] text-faint">
        <span><span class="kbd">↑↓</span> جابجایی</span>
        <span><span class="kbd">Enter</span> اجرا</span>
        <span><span class="kbd">Esc</span> بستن</span>
      </footer>
    </div>
  `

  const panel = wrap.querySelector('[data-overlay-panel]')
  const input = wrap.querySelector('[data-palette-input]')
  const resultsEl = wrap.querySelector('[data-palette-results]')

  let commands = []
  let filtered = []
  let activeIndex = 0

  function renderResults() {
    if (!filtered.length) {
      resultsEl.innerHTML =
        '<p class="p-6 text-center text-sm text-slate">نتیجه‌ای پیدا نشد؛ عبارت دیگری امتحان کن.</p>'
      return
    }

    let lastGroup = ''
    resultsEl.innerHTML = filtered
      .map((cmd, i) => {
        const header =
          cmd.group !== lastGroup
            ? `<p class="px-2 pb-1 pt-2 text-[11px] font-bold text-faint">${cmd.group}</p>`
            : ''
        lastGroup = cmd.group
        return `${header}
        <button type="button" role="option" data-palette-item="${i}"
          class="dropdown-item ${i === activeIndex ? 'is-active' : ''}" aria-selected="${i === activeIndex}">
          <span class="text-sky">${icon(cmd.icon)}</span>
          <span class="min-w-0 flex-1 truncate">${cmd.label}</span>
          ${cmd.hint ? `<span class="shrink-0 text-[11px] text-faint">${cmd.hint}</span>` : ''}
        </button>`
      })
      .join('')
  }

  function setActive(i) {
    activeIndex = (i + filtered.length) % filtered.length
    qsa('[data-palette-item]', resultsEl).forEach((el, idx) => {
      el.classList.toggle('is-active', idx === activeIndex)
      el.setAttribute('aria-selected', String(idx === activeIndex))
    })
    qsa('[data-palette-item]', resultsEl)[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }

  function filter(query) {
    const q = query.trim()
    filtered = q
      ? commands.filter((c) => c.label.includes(q) || c.group.includes(q) || c.hint.includes(q))
      : commands
    activeIndex = 0
    renderResults()
  }

  function run(index) {
    const cmd = filtered[index]
    if (!cmd) return
    api.requestClose()
    cmd.run()
  }

  input.addEventListener('input', () => filter(input.value))
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive(activeIndex + 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(activeIndex - 1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      run(activeIndex)
    }
  })

  resultsEl.addEventListener('click', (e) => {
    const item = e.target.closest('[data-palette-item]')
    if (item) run(Number(item.dataset.paletteItem))
  })
  resultsEl.addEventListener('pointermove', (e) => {
    const item = e.target.closest('[data-palette-item]')
    if (item) setActive(Number(item.dataset.paletteItem))
  })

  const { animateIn, animateOut } = centerAnimations()
  const api = createOverlayController({
    wrap,
    panel,
    animateIn,
    animateOut,
    onClosed: () => {
      input.value = ''
      filter('')
    },
  })

  document.body.appendChild(wrap)

  instance = {
    get isOpen() {
      return api.isOpen
    },
    open(trigger = null) {
      commands = buildCommands()
      input.value = ''
      filter('')
      api.open(trigger || input)
      setTimeout(() => input.focus(), 50)
    },
    close: () => api.requestClose(),
  }
  return instance
}

export function bindPaletteShortcut() {
  if (keyHandlerBound) return
  keyHandlerBound = true

  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault()
      if (!instance) initCommandPalette()
      instance.isOpen ? instance.close() : instance.open()
    }
  })
}
