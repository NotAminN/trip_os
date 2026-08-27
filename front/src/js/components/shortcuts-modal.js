import { createModal } from './modal.js'

let modal = null

export function openShortcutsModal(trigger = null) {
  if (!modal) {
    modal = createModal({
      title: 'میان‌برهای صفحه‌کلید',
      description: 'با این میان‌برها سریع‌تر در Trip OS حرکت کن.',
      size: 'sm',
      content: `
        <ul class="space-y-3">
          <li class="flex items-center justify-between gap-4 text-sm">
            <span class="text-slate">جستجو و پالت دستورات</span>
            <span class="kbd">Ctrl + K</span>
          </li>
          <li class="flex items-center justify-between gap-4 text-sm">
            <span class="text-slate">بستن پنجره‌ها</span>
            <span class="kbd">Esc</span>
          </li>
          <li class="flex items-center justify-between gap-4 text-sm">
            <span class="text-slate">جابجایی بین گزینه‌ها</span>
            <span><span class="kbd">↑</span> <span class="kbd">↓</span></span>
          </li>
          <li class="flex items-center justify-between gap-4 text-sm">
            <span class="text-slate">انتخاب گزینهٔ فعال</span>
            <span class="kbd">Enter</span>
          </li>
        </ul>
      `,
      actions: [{ label: 'فهمیدم', onClick: (api) => api.requestClose() }],
    })
  }
  modal.open(trigger)
  return modal
}
