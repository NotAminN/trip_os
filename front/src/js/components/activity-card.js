import { icon } from '../shell/icons.js'
import { getCategory } from '../data/categories.js'
import { formatMoney } from '../utils/money.js'
import { toPersianDigits } from '../utils/formatters.js'

function faTime(time) {
  return toPersianDigits(time)
}

export function createActivityCard({ activity, onToggle, onMove, draggable = true }) {
  const cat = getCategory(activity.category)

  const el = document.createElement('div')
  el.className = `act-card ${activity.done ? 'is-done' : ''}`
  el.draggable = draggable
  el.dataset.activityId = activity.id
  el.setAttribute('role', 'listitem')

  el.innerHTML = `
    <div class="flex items-center gap-2">
      <button type="button" data-act-toggle class="check-mini ${activity.done ? 'is-done' : ''}"
        aria-label="${activity.done ? 'نشان کردن به‌عنوان انجام‌نشده' : 'انجام شد'}"
        aria-pressed="${activity.done}">
        ${
          activity.done
            ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>'
            : ''
        }
      </button>
      <span class="text-[11px] font-extrabold text-deep">${faTime(activity.time)}</span>
      <span
        class="ms-auto grid size-6 place-items-center rounded-md"
        style="color:${cat.color};background:${cat.color}1f"
        title="${cat.label}"
        aria-label="${cat.label}"
      >
        ${icon(cat.icon, 13)}
      </span>
    </div>
    <p class="act-title mt-1.5">${activity.title}</p>
    <p class="mt-0.5 flex items-center justify-between text-[11px] text-slate">
      <span>${activity.duration ? activity.duration : ''}</span>
      <b class="font-bold text-ink">${Number(activity.cost) ? formatMoney(activity.cost) : 'رایگان'}</b>
    </p>
    ${
      onMove
        ? `<div class="mt-2 flex items-center gap-1 opacity-0 transition-opacity hover:opacity-100 focus-within:opacity-100 [html.no-motion_&]:opacity-100">
            <button type="button" class="icon-btn icon-btn-sm border border-lineblue" data-move="-1" aria-label="جابجایی به بالا">${icon('arrowUp', 12)}</button>
            <button type="button" class="icon-btn icon-btn-sm border border-lineblue" data-move="1" aria-label="جابجایی به پایین">${icon('arrowDown', 12)}</button>
          </div>`
        : ''
    }
  `

  if (onToggle) {
    el.querySelector('[data-act-toggle]').addEventListener('click', (e) => {
      e.stopPropagation()
      onToggle(activity.id)
    })
  }

  if (onMove) {
    el.querySelectorAll('[data-move]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        onMove(activity.id, Number(btn.dataset.move))
      })
    })
  }

  return el
}

export function createPlannerRow({
  activity,
  index,
  total,
  onToggle,
  onEdit,
  onDelete,
  onMove,
}) {
  const cat = getCategory(activity.category)

  const row = document.createElement('div')
  row.className = 'planner-row'
  row.innerHTML = `
    <span class="planner-time-big">${faTime(activity.time)}</span>
    <div class="min-w-0">
      <div class="flex items-start justify-between gap-2">
        <p class="act-title ${activity.done ? 'is-done-title' : ''}" style="${activity.done ? 'text-decoration:line-through;color:var(--color-slate)' : ''}">
          ${activity.title}
        </p>
        <button type="button" data-row-toggle class="check-mini shrink-0 ${activity.done ? 'is-done' : ''}" aria-label="تغییر وضعیت انجام" aria-pressed="${activity.done}">
          ${
            activity.done
              ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>'
              : ''
          }
        </button>
      </div>
      <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span class="meta-chip"><span style="color:${cat.color}">${icon(cat.icon, 13)}</span>${cat.label}</span>
        <span class="meta-chip">${icon('clock', 12)}${activity.duration || '—'}</span>
        <span class="meta-chip">${icon('pin', 12)}${activity.place || 'بدون مکان'}</span>
        <span class="meta-chip font-bold text-ink">${Number(activity.cost) ? formatMoney(activity.cost) : 'رایگان'}</span>
      </div>
      ${activity.notes ? `<p class="mt-2 rounded-lg bg-tint p-2 text-[11px] leading-6 text-slate">${activity.notes}</p>` : ''}
      <div class="mt-2 flex items-center gap-1">
        <button type="button" class="icon-btn icon-btn-sm border border-line" data-row-edit aria-label="ویرایش فعالیت">${icon('pencil', 13)}</button>
        <button type="button" class="icon-btn icon-btn-sm border border-line" data-row-delete aria-label="حذف فعالیت">${icon('trash', 13)}</button>
        <span class="mx-1 h-5 w-px bg-line"></span>
        <button type="button" class="icon-btn icon-btn-sm border border-line ${index === 0 ? 'opacity-30' : ''}" data-row-up aria-label="یک قدم بالاتر" ${index === 0 ? 'disabled' : ''}>${icon('arrowUp', 13)}</button>
        <button type="button" class="icon-btn icon-btn-sm border border-line ${index === total - 1 ? 'opacity-30' : ''}" data-row-down aria-label="یک قدم پایین‌تر" ${index === total - 1 ? 'disabled' : ''}>${icon('arrowDown', 13)}</button>
      </div>
    </div>
    <span
      class="grid size-7 place-items-center rounded-md mt-0.5"
      style="color:${cat.color};background:${cat.color}1f"
      title="${cat.label}"
      aria-hidden="true"
    >
      ${icon(cat.icon, 14)}
    </span>
  `

  row.querySelector('[data-row-toggle]')?.addEventListener('click', () => onToggle?.(activity.id))
  row.querySelector('[data-row-edit]')?.addEventListener('click', () => onEdit?.(activity))
  row.querySelector('[data-row-delete]')?.addEventListener('click', () => onDelete?.(activity))
  row.querySelector('[data-row-up]')?.addEventListener('click', () => onMove?.(activity.id, -1))
  row.querySelector('[data-row-down]')?.addEventListener('click', () => onMove?.(activity.id, 1))

  return row
}
