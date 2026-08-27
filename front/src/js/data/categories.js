export const CATEGORIES = [
  { key: 'attraction', label: 'جاذبه', icon: 'pin', color: '#4D8FD8' },
  { key: 'food', label: 'رستوران', icon: 'utensils', color: '#C5635C' },
  { key: 'cafe', label: 'کافه', icon: 'cup', color: '#C08A35' },
  { key: 'museum', label: 'موزه', icon: 'museum', color: '#245B91' },
  { key: 'hotel', label: 'هتل', icon: 'bed', color: '#3F9673' },
  { key: 'shopping', label: 'خرید', icon: 'cart', color: '#647789' },
  { key: 'nature', label: 'طبیعت', icon: 'leaf', color: '#3F9673' },
  { key: 'activity', label: 'فعالیت', icon: 'sparkle', color: '#4D8FD8' },
  { key: 'airport', label: 'فرودگاه', icon: 'plane', color: '#1B466F' },
  { key: 'transport', label: 'حمل‌ونقل', icon: 'bus', color: '#647789' },
]

const byKey = new Map(CATEGORIES.map((c) => [c.key, c]))

export function getCategory(key) {
  return (
    byKey.get(key) || {
      key: 'activity',
      label: 'فعالیت',
      icon: 'sparkle',
      color: '#4D8FD8',
    }
  )
}
