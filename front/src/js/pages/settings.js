import { getState, setState } from '../state/app-state.js'
import { setMotionPreference } from '../animations/gsap.js'
import { createDropdown } from '../components/dropdown.js'
import { createToggle } from '../components/toggle.js'
import { createModal } from '../components/modal.js'
import { toast } from '../components/toast.js'
import { icon } from '../shell/icons.js'
import { loadState, saveState } from '../utils/storage.js'
import { toPersianDigits } from '../utils/formatters.js'

const PREFIX = 'trip-os:'

export const meta = { title: 'تنظیمات' }

function collectLocalData() {
  const data = {}
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i)
      if (key && key.startsWith(PREFIX)) data[key] = window.localStorage.getItem(key)
    }
  } catch {
    return data
  }
  return data
}

export async function render(container) {
  const state = getState()

  container.innerHTML = `
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-extrabold text-deep">تنظیمات</h1>
        <p class="mt-1 text-sm text-slate">شخصی‌سازی Trip OS — همه‌چیز فقط روی همین مرورگر ذخیره می‌شود.</p>
      </div>
      <span class="badge badge-info">نسخهٔ ۱٫۰٫۰</span>
    </header>

    <div class="mt-6 grid gap-5 lg:grid-cols-2">
      <section class="card p-6" aria-label="پروفایل">
        <h2 class="flex items-center gap-2 text-[15px] font-extrabold text-ink">${icon('compass', 16)}پروفایل</h2>
        <div class="field mt-4">
          <label class="field-label" for="st-name">نام نمایشی</label>
          <input id="st-name" class="input" type="text" value="${state.displayName}" autocomplete="off" />
          <p class="field-hint">در سلامِ داشبورد نمایش داده می‌شود.</p>
        </div>
        <button type="button" class="btn btn-primary btn-sm mt-4" data-save-name>ذخیرهٔ نام</button>
      </section>

      <section class="card p-6" aria-label="نمایش و حرکت">
        <h2 class="flex items-center gap-2 text-[15px] font-extrabold text-ink">${icon('gear', 16)}نمایش و حرکت</h2>
        <div class="mt-4 space-y-5">
          <div class="field">
            <span class="field-label">واحد پول پیش‌فرض</span>
            <div data-st-currency></div>
          </div>
          <div data-st-motion></div>
          <div data-st-notifdot></div>
        </div>
      </section>

      <section class="card p-6" aria-label="داده‌های محلی">
        <h2 class="flex items-center gap-2 text-[15px] font-extrabold text-ink">${icon('note', 16)}داده‌های محلی</h2>
        <p class="mt-3 text-[13px] leading-7 text-slate" data-storage-size>…</p>
        <div class="mt-4 flex flex-wrap gap-2">
          <button type="button" class="btn btn-secondary btn-sm" data-export>${icon('logout', 14)}خروجی JSON</button>
          <button type="button" class="btn text-white btn-sm bg-danger hover:brightness-95" data-wipe>${icon('trash', 14)}پاک کردن همهٔ داده‌ها</button>
        </div>
      </section>

      <section class="card p-6" aria-label="درباره">
        <h2 class="flex items-center gap-2 text-[15px] font-extrabold text-ink">${icon('sparkle', 16)}دربارهٔ Trip OS</h2>
        <p class="mt-3 text-[13px] leading-7 text-slate">
          تجربه‌ای بصری برای برنامه‌ریزی سفر؛ ساخته‌شده با HTML، Tailwind، جاوااسکریپت خالص، GSAP و Lenis — بدون هیچ فریم‌ورکی.
        </p>
        <a href="/index.html" class="btn btn-secondary btn-sm mt-4">مشاهدهٔ صفحهٔ اصلی</a>
      </section>
    </div>
  `

  bindName(container)
  buildCurrency(container)
  buildMotionToggle(container)
  buildNotifDotToggle(container)
  renderStorageStats(container)
  bindExport(container)
  bindWipe(container)
}

function bindName(container) {
  const input = container.querySelector('#st-name')
  container.querySelector('[data-save-name]')?.addEventListener('click', () => {
    const name = input.value.trim()
    if (name.length < 2) {
      toast.warning('نام باید حداقل دو حرف باشد.')
      return
    }
    setState({ displayName: name })
    toast.success(`سلام، ${name}! نام ذخیره شد.`)
  })
}

function buildCurrency(container) {
  const mount = container.querySelector('[data-st-currency]')
  let labelEl = null

  const dropdown = createDropdown({
    ariaLabel: 'واحد پول پیش‌فرض',
    manageLabel: false,
    selectedValue: getState().currency,
    trigger: (() => {
      const t = document.createElement('button')
      t.type = 'button'
      t.className = 'input flex w-full items-center justify-between gap-2 text-start'
      t.innerHTML = `<span data-filter-label></span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`
      return t
    })(),
    items: [
      { value: 'IRT', label: 'تومان' },
      { value: 'USD', label: 'دلار ($)' },
      { value: 'EUR', label: 'یورو (€)' },
      { value: 'GBP', label: 'پوند (£)' },
    ],
    onSelect: (value, item) => {
      setState({ currency: value })
      labelEl.replaceChildren(item.label)
      toast.info(`واحد پول روی ${item.label} تنظیم شد.`)
    },
  })

  mount.appendChild(dropdown.el)
  labelEl = dropdown.el.querySelector('[data-filter-label]')
  const current = { IRT: 'تومان', USD: 'دلار ($)', EUR: 'یورو (€)', GBP: 'پوند (£)' }[
    getState().currency
  ]
  labelEl.replaceChildren(current)
}

function buildMotionToggle(container) {
  const state = getState()
  const toggle = createToggle({
    label: 'کاهش انیمیشن‌ها',
    checked: state.motionReduced,
    onChange: (checked) => {
      setState({ motionReduced: checked })
      setMotionPreference(checked)
      toast.info(checked ? 'انیمیشن‌ها کاهش یافت.' : 'انیمیشن‌ها فعال شد.')
    },
  })
  container.querySelector('[data-st-motion]')?.appendChild(toggle.el)
}

function buildNotifDotToggle(container) {
  const state = getState()
  const toggle = createToggle({
    label: 'نمایش نقطهٔ اعلان خوانده‌نشده',
    checked: !state.hideNotifDot,
    onChange: (checked) => {
      setState({ hideNotifDot: !checked })
      toast.info(checked ? 'نقطهٔ اعلان فعال شد.' : 'نقطهٔ اعلان مخفی شد.')
    },
  })
  container.querySelector('[data-st-notifdot]')?.appendChild(toggle.el)
}

function renderStorageStats(container) {
  const el = container.querySelector('[data-storage-size]')
  const data = collectLocalData()
  const bytes = Object.entries(data).reduce((sum, [, v]) => sum + (v?.length || 0) + 24, 0)
  const kb = (bytes / 1024).toFixed(1)
  el.innerHTML = `حجم داده‌های ذخیره‌شدهٔ Trip OS در این مرورگر حدوداً <b class="font-bold text-ink">${toPersianDigits(kb)} کیلوبایت</b> است؛ شامل سفرها، برنامهٔ روزها، هزینه‌ها، مکان‌ها، چمدان و یادداشت‌ها.`
}

function bindExport(container) {
  container.querySelector('[data-export]')?.addEventListener('click', () => {
    const payload = {
      app: 'trip-os',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      data: collectLocalData(),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'trip-os-backup.json'
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 500)
    toast.success('فایل پشتیبان دانلود شد.')
  })
}

function bindWipe(container) {
  container.querySelector('[data-wipe]')?.addEventListener('click', () => {
    createModal({
      title: 'پاک کردن همهٔ داده‌ها',
      description: 'همهٔ سفرها، برنامه‌ها، هزینه‌ها و تنظیمات این مرورگر حذف می‌شوند.',
      size: 'sm',
      content:
        '<p class="text-sm leading-7 text-slate">پس از پاک‌کردن، برنامه با داده‌های نمونهٔ اولیه بارگذاری می‌شود. این کار برگشت‌پذیر نیست.</p>',
      actions: [
        {
          label: 'همه‌چیز را پاک کن',
          variant: 'btn-primary',
          onClick: (api) => {
            try {
              const keys = []
              for (let i = 0; i < window.localStorage.length; i += 1) {
                const key = window.localStorage.key(i)
                if (key && key.startsWith(PREFIX)) keys.push(key)
              }
              keys.forEach((key) => window.localStorage.removeItem(key))
            } catch {
              void loadState
              void saveState
            }
            api.requestClose()
            toast.success('داده‌ها پاک شد؛ بازگذاری مجدد…')
            setTimeout(() => window.location.reload(), 700)
          },
        },
        { label: 'انصراف', variant: 'btn-ghost', onClick: (api) => api.requestClose() },
      ],
    }).open()
  })
}
