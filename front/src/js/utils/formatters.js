const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']

export function toPersianDigits(value) {
  return String(value ?? '').replace(/\d/g, (d) => FA_DIGITS[Number(d)])
}

export function toEnglishDigits(value) {
  return String(value ?? '')
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
}

export function formatNumber(value, options = {}) {
  const num = Number(value) || 0
  return new Intl.NumberFormat('fa-IR', options).format(num)
}

export function formatPercent(ratio) {
  return `${toPersianDigits(Math.round(ratio))}٪`
}
