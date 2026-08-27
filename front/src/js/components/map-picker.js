import { mapBaseLayers } from './map-view.js'
import { toPersianDigits } from '../utils/formatters.js'

export function createMapPicker({ value = null, onChange, contextPlaces = [] } = {}) {
  const el = document.createElement('div')
  el.className = 'relative aspect-[16/9] w-full cursor-crosshair overflow-hidden rounded-xl border border-lineblue'
  el.setAttribute('role', 'application')
  el.setAttribute('aria-label', 'انتخاب موقعیت روی نقشه — برای انتخاب کلیک کن')

  el.innerHTML = `
    ${mapBaseLayers()}
    ${contextPlaces
      .map(
        (p) =>
          `<span class="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-deep/30" style="left:${p.x}%;top:${p.y}%"></span>`,
      )
      .join('')}
    <span data-picker-dot class="pointer-events-none absolute z-10 hidden -translate-x-1/2 -translate-y-1/2">
      <span class="block size-5 rounded-full border-2 border-sky bg-white shadow-md" style="box-shadow:0 0 0 4px rgb(77 143 216/.25)"></span>
    </span>
    <span data-picker-hint class="absolute inset-x-0 bottom-0 bg-white/85 py-1 text-center text-[10px] font-semibold text-slate backdrop-blur-sm">
      روی نقشه کلیک کن تا موقعیت مکان مشخص شود
    </span>
  `

  const dot = el.querySelector('[data-picker-dot]')
  const hint = el.querySelector('[data-picker-hint]')

  function setValue(x, y) {
    if (x == null) {
      dot.classList.add('hidden')
      hint.textContent = 'روی نقشه کلیک کن تا موقعیت مکان مشخص شود'
      onChange?.(null)
      return
    }
    dot.style.left = `${x}%`
    dot.style.top = `${y}%`
    dot.classList.remove('hidden')
    hint.textContent = `موقعیت: ${toPersianDigits(Math.round(x))}٪ افقی · ${toPersianDigits(Math.round(y))}٪ عمودی`
    onChange?.(Math.round(x), Math.round(y))
  }

  el.addEventListener('pointerdown', (event) => {
    event.preventDefault()
    const rect = el.getBoundingClientRect()
    const x = clampPct(((event.clientX - rect.left) / rect.width) * 100)
    const y = clampPct(((event.clientY - rect.top) / rect.height) * 100)
    setValue(x, y)
  })

  if (value && value.x != null && value.y != null) {
    setValue(value.x, value.y)
  }

  return {
    el,
    setValue,
    getValue: () => {
      if (!dot || dot.classList.contains('hidden')) return null
      return {
        x: Math.round(parseFloat(dot.style.left)),
        y: Math.round(parseFloat(dot.style.top)),
      }
    },
  }
}

function clampPct(v) {
  return Math.min(100, Math.max(0, v))
}
