export const PACKING_CATEGORIES = [
  { key: 'clothes', label: 'لباس', icon: 'bag', color: '#4D8FD8' },
  { key: 'docs', label: 'مدارک', icon: 'note', color: '#245B91' },
  { key: 'personal', label: 'لوازم شخصی', icon: 'sparkle', color: '#C08A35' },
  { key: 'tech', label: 'الکترونیک', icon: 'cart', color: '#3F9673' },
  { key: 'care', label: 'دارو و مراقبت', icon: 'droplet', color: '#C5635C' },
  { key: 'travel', label: 'سفر', icon: 'compass', color: '#647789' },
]

const byKey = new Map(PACKING_CATEGORIES.map((c) => [c.key, c]))

export function getPackingCategory(key) {
  return (
    byKey.get(key) || {
      key: 'travel',
      label: 'سفر',
      icon: 'compass',
      color: '#647789',
    }
  )
}

export const SEED_PACKING_ITEMS = [
  { id: 'pk-passport', category: 'docs', name: 'مدارک و پاسپورت', quantity: 1, done: true },
  { id: 'pk-tickets', category: 'docs', name: 'بلیت و واچر هتل', quantity: 1, done: true },
  { id: 'pk-powerbank', category: 'tech', name: 'پاوربانک', quantity: 1, done: true },
  { id: 'pk-charger', category: 'tech', name: 'شارژر گوشی', quantity: 2, done: true },
  { id: 'pk-headphone', category: 'tech', name: 'هدفون', quantity: 1, done: false },
  { id: 'pk-tshirt', category: 'clothes', name: 'تی‌شرت', quantity: 4, done: true },
  { id: 'pk-pants', category: 'clothes', name: 'شلوار', quantity: 2, done: true },
  { id: 'pk-jacket', category: 'clothes', name: 'ژاکت سبک', quantity: 1, done: false },
  { id: 'pk-shoes', category: 'clothes', name: 'کفش راحتی', quantity: 1, done: true },
  { id: 'pk-sunscreen', category: 'care', name: 'کرم ضدآفتاب', quantity: 1, done: false },
  { id: 'pk-meds', category: 'care', name: 'داروهای شخصی', quantity: 1, done: false },
  { id: 'pk-sunglasses', category: 'personal', name: 'عینک آفتابی', quantity: 2, done: false },
]
