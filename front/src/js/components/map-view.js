import { gsap, prefersReducedMotion } from '../animations/gsap.js'
import { getCategory } from '../data/categories.js'
import { icon } from '../shell/icons.js'
import { qs, clamp } from '../utils/helpers.js'

const BASE_W = 1000
const BASE_H = 640

const TARGET_ICON =
  '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2.5v3.2M12 18.3v3.2M2.5 12h3.2M18.3 12h3.2"/></svg>'

export function mapBaseLayers() {
  return `
    <svg class="absolute inset-0 h-full w-full" viewBox="0 0 ${BASE_W} ${BASE_H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <path d="M640 -40 C600 120 700 240 620 380 S520 560 600 700 L760 700 C690 560 780 430 720 300 S700 60 760 -40 Z" fill="#CFE2F5" opacity="0.75"/>
      <ellipse cx="180" cy="480" rx="130" ry="70" fill="#DCEEFF" opacity="0.8"/>
      <ellipse cx="420" cy="120" rx="110" ry="55" fill="#DCEEFF" opacity="0.65"/>
      <g stroke="#FFFFFF" stroke-width="10" opacity="0.85" fill="none" stroke-linecap="round">
        <path d="M60 0 L140 640 M230 0 L170 640 M330 0 L290 640 M450 0 L430 640 M540 0 L560 640"/>
        <path d="M0 120 L1000 90 M0 250 L1000 220 M0 380 L620 350 M0 500 L620 470"/>
        <path d="M620 60 C580 200 680 320 600 460 S540 580 610 640" stroke-width="14"/>
      </g>
      <g fill="#FFFFFF" opacity="0.45">
        <rect x="360" y="270" width="70" height="50" rx="8"/>
        <rect x="470" y="150" width="56" height="44" rx="8"/>
        <rect x="250" y="400" width="64" height="46" rx="8"/>
        <rect x="520" y="530" width="58" height="42" rx="8"/>
      </g>
    </svg>
  `
}

function baseLayers() {
  return mapBaseLayers()
}

function smoothPath(points) {
  if (points.length < 2) return ''
  let d = `M${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1]
    const cur = points[i]
    const midX = (prev.x + cur.x) / 2
    const midY = (prev.y + cur.y) / 2
    d += ` Q ${prev.x} ${prev.y} ${(midX + cur.x) / 2} ${(midY + cur.y) / 2}`
  }
  const last = points[points.length - 1]
  return `${d} L ${last.x} ${last.y}`
}

export function createMapView({ onSelect } = {}) {
  const el = document.createElement('div')
  el.className = 'app-map min-h-[26rem] lg:min-h-[32rem]'
  el.innerHTML = `
    <div class="app-map-inner" data-map-inner>
      ${baseLayers()}
      <div class="absolute inset-0" data-marker-layer></div>
      <svg class="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 ${BASE_W} ${BASE_H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <path data-route-base fill="none" stroke="#245B91" stroke-width="3" opacity="0.28" stroke-linecap="round" stroke-dasharray="2 8"/>
        <path data-route-main class="map-route-flow" fill="none" stroke="#4D8FD8" stroke-width="3.5" stroke-linecap="round" opacity="0.85"/>
      </svg>
    </div>

    <div class="map-ctrl-cluster">
      <button type="button" class="map-ctrl-btn" data-zoom-in aria-label="بزرگ‌نمایی">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
      </button>
      <button type="button" class="map-ctrl-btn" data-zoom-out aria-label="کوچک‌نمایی">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14"/></svg>
      </button>
      <button type="button" class="map-ctrl-btn" data-zoom-reset aria-label="بازگشت به نمای کامل">${TARGET_ICON}</button>
    </div>

    <span class="pill pill-cool absolute end-3 top-3 z-10" data-map-count></span>
  `

  const inner = qs('[data-map-inner]', el)
  const markerLayer = qs('[data-marker-layer]', el)
  const routeMain = qs('[data-route-main]', el)
  const routeBase = qs('[data-route-base]', el)
  const countEl = qs('[data-map-count]', el)

  let view = { scale: 1, tx: 0, ty: 0 }
  let placesCache = []
  const markersById = new Map()

  function applyView() {
    if (prefersReducedMotion()) {
      inner.style.transform = `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`
      return
    }
    gsap.to(inner, {
      x: view.tx,
      y: view.ty,
      scale: view.scale,
      duration: 0.35,
      ease: 'power2.out',
      overwrite: true,
    })
  }

  function clampPan() {
    const maxX = ((view.scale - 1) * el.clientWidth) / 2 + 60
    const maxY = ((view.scale - 1) * el.clientHeight) / 2 + 60
    view.tx = clamp(view.tx, -maxX, maxX)
    view.ty = clamp(view.ty, -maxY, maxY)
  }

  el.querySelector('[data-zoom-in]').addEventListener('click', () => {
    view.scale = clamp(view.scale + 0.25, 1, 2.4)
    clampPan()
    applyView()
  })
  el.querySelector('[data-zoom-out]').addEventListener('click', () => {
    view.scale = clamp(view.scale - 0.25, 1, 2.4)
    clampPan()
    applyView()
  })
  el.querySelector('[data-zoom-reset]').addEventListener('click', () => {
    view = { scale: 1, tx: 0, ty: 0 }
    applyView()
  })

  let panStart = null
  el.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.app-marker')) return
    panStart = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty }
    el.setPointerCapture(e.pointerId)
    if (view.scale > 1) el.classList.add('is-panning')
  })
  el.addEventListener('pointermove', (e) => {
    if (!panStart || view.scale <= 1) return
    view.tx = panStart.tx + (e.clientX - panStart.x)
    view.ty = panStart.ty + (e.clientY - panStart.y)
    clampPan()
    inner.style.transform = `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`
  })
  const endPan = () => {
    panStart = null
    el.classList.remove('is-panning')
  }
  el.addEventListener('pointerup', endPan)
  el.addEventListener('pointercancel', endPan)

  function fa(n) {
    const faDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
    return String(n).replace(/\d/g, (d) => faDigits[Number(d)])
  }

  function update(places) {
    placesCache = places
    markerLayer.innerHTML = ''
    markersById.clear()

    const pts = [...places]
      .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
      .map((p) => ({ x: (p.x / 100) * BASE_W, y: (p.y / 100) * BASE_H }))
    const pathD = smoothPath(pts)
    routeBase.setAttribute('d', pathD)
    routeMain.setAttribute('d', pathD)

    places.forEach((place) => {
      const cat = getCategory(place.category)
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'app-marker'
      btn.dataset.placeId = place.id
      btn.style.left = `${place.x}%`
      btn.style.top = `${place.y}%`
      btn.style.color = cat.color
      btn.setAttribute('aria-label', `${place.name} — ${cat.label}`)
      btn.setAttribute('data-tooltip', place.name)
      btn.innerHTML = icon(cat.icon, 15)
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        onSelect?.(place.id)
      })

      markersById.set(place.id, btn)
      markerLayer.appendChild(btn)
    })

    countEl.textContent = `${fa(places.length)} مکان روی نقشه`
  }

  function setSelected(id, { focus = false } = {}) {
    markersById.forEach((marker, markerId) => {
      marker.classList.toggle('is-selected', markerId === id)
    })

    if (!id || !focus) return

    const place = placesCache.find((p) => p.id === id)
    if (!place) return

    const px = (place.x / 100) * el.clientWidth
    const py = (place.y / 100) * el.clientHeight
    view.scale = Math.max(view.scale, 1.35)
    view.tx = el.clientWidth / 2 - px * view.scale
    view.ty = el.clientHeight / 2 - py * view.scale
    clampPan()
    applyView()
  }

  return { el, update, setSelected }
}
