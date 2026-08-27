export const NOTE_SCOPES = [
  { key: 'general', label: 'عمومی', color: '#4D8FD8', icon: 'note' },
  { key: 'day', label: 'روز سفر', color: '#3F9673', icon: 'calendar' },
  { key: 'place', label: 'مکان', color: '#C08A35', icon: 'pin' },
  { key: 'reminder', label: 'یادآور', color: '#C5635C', icon: 'pushpin' },
]

const byKey = new Map(NOTE_SCOPES.map((s) => [s.key, s]))

export function getNoteScope(key) {
  return byKey.get(key) || byKey.get('general')
}

export const NOTE_TONES = [
  { key: 'sky', bg: '#EFF6FF', bar: '#4D8FD8' },
  { key: 'green', bg: '#E6F4EC', bar: '#3F9673' },
  { key: 'amber', bg: '#FBF2E2', bar: '#C08A35' },
  { key: 'rose', bg: '#FAEAE9', bar: '#C5635C' },
]

const today = () => new Date().toISOString()

export const SEED_NOTES = [
  {
    id: 'n-window',
    scope: 'reminder',
    title: 'چک‌این پرواز رفت',
    body: 'قبل از پرواز، صندلی کنار پنجره را آنلاین انتخاب کن؛ چک‌این از ۲۴ ساعت قبل باز می‌شود.',
    dayId: null,
    placeId: null,
    pinned: true,
    tone: 'rose',
    createdAt: today(),
  },
  {
    id: 'n-topkapi',
    scope: 'place',
    title: 'کاخ توپکاپی',
    body: 'بلیت ترکیبی حرم‌سرا هم شامل می‌شود و به‌صرفه‌تر است. سه‌شنبه‌ها تعطیل است.',
    dayId: 'd2',
    placeId: 'p-topkapi',
    pinned: false,
    tone: 'amber',
    createdAt: today(),
  },
  {
    id: 'n-bosphorus',
    scope: 'general',
    title: 'قایق‌های بسفر',
    body: 'آخرین قایق خط کاباتاش تا اسکودار حدود ساعت ۲۳:۰۰ است؛ بعد از آن فقط تاکسی.',
    dayId: null,
    placeId: null,
    pinned: false,
    tone: 'sky',
    createdAt: today(),
  },
  {
    id: 'n-day2',
    scope: 'day',
    title: 'یادداشت روز دوم',
    body: 'بعد از بازار بزرگ اگر فرصت بود، پشت‌بام‌های امینونو برای غروب.',
    dayId: 'd2',
    placeId: null,
    pinned: false,
    tone: 'green',
    createdAt: today(),
  },
  {
    id: 'n-insurance',
    scope: 'reminder',
    title: 'بیمهٔ سفر',
    body: 'پوشش بیمهٔ درمانی هر دو نفر تا پایان سمععت اعتبار دارد؛ نسخهٔ چاپی در جیب پاسپورت.',
    dayId: null,
    placeId: null,
    pinned: false,
    tone: 'rose',
    createdAt: today(),
  },
  {
    id: 'n-hammam',
    scope: 'place',
    title: 'حمام چمبرلیتاش',
    body: 'رزرو ساعت ۱۵:۰۰ انجام شد؛ حوله و دمکنجی داخل هزینه هست، انعام جدا حساب کن.',
    dayId: 'd4',
    placeId: 'p-cistern',
    pinned: false,
    tone: 'sky',
    createdAt: today(),
  },
  {
    id: 'n-budget-tip',
    scope: 'general',
    title: 'ترفند خرید',
    body: 'در بازار بزرگ قیمت واقعی حدود ۴۵٪ زیر اولین پیشنهاد فروشنده است؛ با لبخند چانه بزن.',
    dayId: null,
    placeId: null,
    pinned: false,
    tone: 'amber',
    createdAt: today(),
  },
]
