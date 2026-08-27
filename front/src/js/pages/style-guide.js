import { toast } from '../components/toast.js'
import { createDrawer } from '../components/drawer.js'
import { createDropdown } from '../components/dropdown.js'
import { createDatePicker, JALALI_MONTHS } from '../components/date-picker.js'
import { createToggle } from '../components/toggle.js'
import { createAvatar } from '../components/avatar.js'
import { animateProgressBar } from '../components/progress.js'
import { openShortcutsModal } from '../components/shortcuts-modal.js'
import { initTabs } from '../components/tabs.js'
import { toPersianDigits } from '../utils/formatters.js'
import { qs, qsa } from '../utils/helpers.js'

let placeDrawer = null

function wireButtons() {
  qsa('[data-demo-toast]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.demoToast
      const messages = {
        success: 'مکان با موفقیت اضافه شد.',
        info: 'برنامهٔ سفر به‌روزرسانی شد.',
        warning: 'بودجهٔ روزانه نزدیک به سقف است.',
        danger: 'حذف مکان انجام نشد؛ دوباره تلاش کن.',
      }
      toast[type]?.(messages[type])
    })
  })

  qs('[data-demo-action]')?.addEventListener('click', () =>
    toast.success('رابط کاربری Trip OS کاملاً عملیاتی است.'),
  )

  qs('[data-demo-drawer-trigger]')?.addEventListener('click', (event) => {
    if (!placeDrawer) placeDrawer = buildPlaceDrawer()
    placeDrawer.open(event.currentTarget)
  })

  qs('[data-demo-modal-trigger]')?.addEventListener('click', (event) => {
    openShortcutsModal(event.currentTarget)
  })
}

function buildPlaceDrawer() {
  return createDrawer({
    title: 'جزئیات مکان',
    side: 'start',
    content: `
      <div class="grid h-36 place-items-center rounded-xl bg-linear-to-br from-softblue to-tint text-sky" aria-hidden="true">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z"/>
          <circle cx="12" cy="10" r="2.6"/>
        </svg>
      </div>
      <h3 class="mt-4 font-bold text-ink">کاخ گلستان</h3>
      <p class="mt-1 text-xs text-slate">تهران · جاذبهٔ تاریخی</p>
      <dl class="mt-4 space-y-2.5 text-sm">
        <div class="flex items-center justify-between gap-4">
          <dt class="text-slate">ساعت بازدید</dt>
          <dd class="font-semibold text-ink">۹:۰۰ تا ۱۷:۰۰</dd>
        </div>
        <div class="flex items-center justify-between gap-4">
          <dt class="text-slate">هزینهٔ ورود</dt>
          <dd class="font-semibold text-ink">۲۵۰٬۰۰۰ تومان</dd>
        </div>
        <div class="flex items-center justify-between gap-4">
          <dt class="text-slate">مدت پیشنهادی</dt>
          <dd class="font-semibold text-ink">۲ ساعت</dd>
        </div>
      </dl>
      <p class="mt-4 text-[13px] leading-7 text-slate">
        کاخ گلستان، یادگار دورهٔ قاجار، با تالار آینه و باغ دل‌انگیزش یکی از کامل‌ترین
        نقاط شروع برای گشت شهری در تهران است.
      </p>
    `,
    actions: [
      {
        label: 'افزودن به برنامهٔ سفر',
        onClick: (api) => {
          toast.info('اتصال به دادهٔ سفر در فازهای بعدی فعال می‌شود.')
          api.requestClose()
        },
      },
      { label: 'بستن', variant: 'btn-ghost', onClick: (api) => api.requestClose() },
    ],
  })
}

function wireToggles() {
  const budgetMount = qs('[data-demo-toggle-budget]')
  if (budgetMount) {
    budgetMount.appendChild(
      createToggle({
        label: 'هشدار بودجهٔ روزانه',
        checked: true,
        onChange: (checked) =>
          toast.info(checked ? 'هشدار بودجهٔ روزانه فعال شد.' : 'هشدار بودجهٔ روزانه خاموش شد.'),
      }).el,
    )
  }

  const currencyMount = qs('[data-demo-toggle-currency]')
  if (currencyMount) {
    currencyMount.appendChild(
      createToggle({
        label: 'نمایش قیمت‌ها به تومان',
        checked: false,
        onChange: (checked) =>
          toast.info(checked ? 'واحد پول روی تومان تنظیم شد.' : 'واحد پول پیش‌فرض فعال شد.'),
      }).el,
    )
  }
}

function buildSortDropdown() {
  const mount = qs('[data-demo-dropdown]')
  if (!mount) return

  mount.appendChild(
    createDropdown({
      placeholder: 'مرتب‌سازی',
      ariaLabel: 'مرتب‌سازی نتایج',
      items: [
        { value: 'newest', label: 'جدیدترین' },
        { value: 'oldest', label: 'قدیمی‌ترین' },
        { value: 'cheapest', label: 'ارزان‌ترین' },
        { value: 'expensive', label: 'گران‌ترین' },
      ],
      onSelect: (_value, item) => toast.info(`ترتیب بر اساس «${item.label}» اعمال شد.`),
    }).el,
  )
}

function buildDatePickers() {
  const mount = qs('[data-demo-datepicker]')
  if (!mount) return

  const output = qs('[data-demo-date-value]')

  mount.appendChild(
    createDatePicker({
      placeholder: 'تاریخ شروع سفر',
      onChange: (value) => {
        if (!output) return
        const text = `${toPersianDigits(value.jd)} ${JALALI_MONTHS[value.jm - 1]} ${toPersianDigits(value.jy)}`
        output.textContent = `تاریخ انتخاب‌شده: ${text}`
        toast.success('تاریخ شروع سفر ثبت شد.')
      },
    }).el,
  )
}

function runProgressDemos() {
  qsa('[data-demo-progress]').forEach((wrap, index) => {
    animateProgressBar({
      bar: wrap.querySelector('.progress'),
      fill: wrap.querySelector('.progress-fill'),
      label: wrap.querySelector('[data-progress-label]'),
      percent: Number(wrap.dataset.percent || 0),
      delay: 0.5 + index * 0.15,
    })
  })
}

function buildAvatars() {
  const mount = qs('[data-demo-avatars]')
  if (!mount) return
  ;['سارا محمدی', 'امیر کریمی', 'نگار توکلی'].forEach((name) => {
    mount.appendChild(createAvatar({ name, size: 'md' }))
  })
}

export function initStyleGuide() {
  wireButtons()
  wireToggles()
  buildSortDropdown()
  buildDatePickers()
  runProgressDemos()
  buildAvatars()
  initTabs()
}
