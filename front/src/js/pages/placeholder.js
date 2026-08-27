import { icon } from '../shell/icons.js'
import { toPersianDigits } from '../utils/formatters.js'

export const meta = { title: 'به‌زودی' }

export function render(container, { title = 'این بخش', phase = null, iconName = 'sparkle', notFound = false } = {}) {
  if (notFound) {
    document.title = 'صفحه پیدا نشد · Trip OS'
    container.innerHTML = `
      <div class="mx-auto mt-10 max-w-md text-center">
        <p class="text-7xl font-extrabold text-lineblue select-none" aria-hidden="true">۴۰۴</p>
        <h1 class="mt-4 text-2xl font-extrabold text-deep">این صفحه پیدا نشد.</h1>
        <p class="mt-2 text-sm leading-7 text-slate">نشانی واردشده به هیچ بخشی از Trip OS اشاره نمی‌کند.</p>
        <a href="#/dashboard" class="btn btn-primary mt-6">بازگشت به داشبورد</a>
      </div>
    `
    return
  }

  document.title = `${title} · Trip OS`
  container.innerHTML = `
    <div class="mx-auto mt-14 max-w-lg text-center">
      <span class="mx-auto grid size-16 place-items-center rounded-2xl bg-tint text-sky">
        ${icon(iconName, 28)}
      </span>
      <h1 class="mt-5 text-2xl font-extrabold text-deep">${title} به‌زودی آماده می‌شود.</h1>
      <p class="mt-3 text-sm leading-8 text-slate">
        این بخش در فاز ${toPersianDigits(phase)} از نقشهٔ راه ساخته می‌شود؛ لایهٔ داده، سرویس‌ها و
        معماری آن از همین حالا در پروژه قرار دارد.
      </p>
      <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
        <a href="#/dashboard" class="btn btn-primary">بازگشت به داشبورد</a>
        <a href="/index.html#preview" class="btn btn-secondary">نمای زندهٔ اجزا</a>
      </div>
    </div>
  `
}
