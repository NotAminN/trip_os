export const BUDGET_CATEGORIES = [
  { key: 'stay', label: 'اقامت', icon: 'bed', color: '#3F9673' },
  { key: 'food', label: 'غذا', icon: 'utensils', color: '#C5635C' },
  { key: 'transport', label: 'حمل‌ونقل', icon: 'bus', color: '#647789' },
  { key: 'fun', label: 'تفریح', icon: 'sparkle', color: '#4D8FD8' },
  { key: 'shopping', label: 'خرید', icon: 'cart', color: '#C08A35' },
  { key: 'ticket', label: 'بلیت', icon: 'museum', color: '#245B91' },
  { key: 'other', label: 'سایر', icon: 'marker', color: '#90A3B4' },
]

const byKey = new Map(BUDGET_CATEGORIES.map((c) => [c.key, c]))

export function getBudgetCategory(key) {
  return (
    byKey.get(key) || { key: 'other', label: 'سایر', icon: 'marker', color: '#90A3B4' }
  )
}

const T = 1_000_000

export const SEED_EXPENSES = [
  { id: 'e-stay', title: 'هتل سلطان احمد — ۵ شب', category: 'stay', dayId: null, amount: 4_450_000 },
  { id: 'e-metro', title: 'کارت‌های مترو و تراموا', category: 'transport', dayId: null, amount: 450_000 },
  { id: 'e-cafes', title: 'کافه‌های گالاتاپورت و تراس', category: 'fun', dayId: null, amount: 2_300_000 },

  { id: 'e-d1-transfer', title: 'ترانسفر فرودگاه به هتل', category: 'transport', dayId: 'd1', amount: 800_000 },
  { id: 'e-d1-hagia', title: 'بلیت آیا صوفیه', category: 'ticket', dayId: 'd1', amount: 1_280_000 },
  { id: 'e-d1-dinner', title: 'شام رستوران سنتی', category: 'food', dayId: 'd1', amount: 2_600_000 },

  { id: 'e-d2-topkapi', title: 'بلیت کاخ توپکاپی', category: 'ticket', dayId: 'd2', amount: 2_240_000 },
  { id: 'e-d2-lunch', title: 'ناهار کنار بسفر', category: 'food', dayId: 'd2', amount: 1_550_000 },
  { id: 'e-d2-bazaar', title: 'خرید از بازار بزرگ', category: 'shopping', dayId: 'd2', amount: 2_674_000 },
  { id: 'e-d2-dinner', title: 'شام در امینونو', category: 'food', dayId: 'd2', amount: 2_000_000 },

  { id: 'e-d3-cruise', title: 'کروز بسفر', category: 'fun', dayId: 'd3', amount: 3_120_000 },
  { id: 'e-d3-lunch', title: 'ناهار کاراکوی', category: 'food', dayId: 'd3', amount: 1_406_000 },
  { id: 'e-d3-galata', title: 'بلیت برج گالاتا', category: 'ticket', dayId: 'd3', amount: 1_650_000 },

  { id: 'e-d4-museum', title: 'بلیت موزهٔ هنرهای ترکی', category: 'ticket', dayId: 'd4', amount: 1_540_000 },
  { id: 'e-d4-hammam', title: 'حمام تاریخی چمبرلیتاش', category: 'fun', dayId: 'd4', amount: 2_100_000 },
  { id: 'e-d4-dinner', title: 'شام سبک بی‌اوغلو', category: 'food', dayId: 'd4', amount: 1_500_000 },

  { id: 'e-d5-islands', title: 'تور پرنس‌جزایر', category: 'fun', dayId: 'd5', amount: 3_400_000 },
  { id: 'e-d5-carriage', title: 'گشت ارابهٔ اسب', category: 'fun', dayId: 'd5', amount: 1_246_000 },
  { id: 'e-d5-souvenir', title: 'سوغاتی اورتاکوی', category: 'shopping', dayId: 'd5', amount: 1_450_000 },
  { id: 'e-d5-farewell', title: 'شام خداحافظی', category: 'food', dayId: 'd5', amount: 2_000_000 },

  { id: 'e-d6-transfer', title: 'ترانسفر به فرودگاه', category: 'transport', dayId: 'd6', amount: 784_000 },
]

void T
