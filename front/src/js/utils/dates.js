const LOCALE = 'fa-IR-u-ca-persian-nu-arabext'

export function formatFullDate(date = new Date()) {
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatDayMonth(date = new Date()) {
  return new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long' }).format(date)
}

export function formatWeekday(date = new Date()) {
  return new Intl.DateTimeFormat(LOCALE, { weekday: 'long' }).format(date)
}

export function formatTodayJalali() {
  return formatFullDate(new Date())
}

export function addDays(date, amount) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

export function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function diffDays(fromDate, toDate) {
  return Math.round((startOfDay(toDate) - startOfDay(fromDate)) / 86400000)
}
