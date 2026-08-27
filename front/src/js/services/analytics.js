export function computeTripAnalytics({ trip, days = [], places = [], expenses = [], packing = null }) {
  const actsActual = days.reduce((sum, d) => sum + d.activities.length, 0)
  const placesPlanned = trip?.stats?.places || Math.max(places.length, 1)
  const actsPlanned = trip?.stats?.activities || Math.max(actsActual, 1)
  const spent = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
  const budgetTotal = trip?.budget?.total || 1
  const spentPct = Math.min(100, Math.round((spent / budgetTotal) * 100))
  const packingPct = packing ? packing.percent : 0

  const breakdown = [
    { key: 'places', label: 'مکان‌ها', value: Math.min(100, Math.round((places.length / placesPlanned) * 100)) },
    { key: 'activities', label: 'فعالیت‌ها', value: Math.min(100, Math.round((actsActual / actsPlanned) * 100)) },
    { key: 'budget', label: 'بودجه مصرف‌شده', value: spentPct },
    { key: 'packing', label: 'چمدان', value: packingPct },
  ]
  const overallPct = Math.round(breakdown.reduce((s, b) => s + b.value, 0) / breakdown.length)

  const perDay = days.map((day) => ({
    id: day.id,
    label: day.title,
    date: day.date,
    count: day.activities.length,
    done: day.activities.filter((a) => a.done).length,
    planned: day.cost,
    actual: expenses
      .filter((e) => e.dayId === day.id)
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
    completion: day.completion ?? 0,
  }))

  const activeDays = perDay.filter((d) => d.count > 0 || d.actual > 0)
  const priciest =
    activeDays.length > 0
      ? activeDays.reduce((best, d) => (d.actual > best.actual ? d : best), activeDays[0])
      : null
  const busiest =
    activeDays.length > 0
      ? activeDays.reduce((best, d) => (d.count > best.count ? d : best), activeDays[0])
      : null
  const bestDay =
    perDay.length > 0
      ? perDay.reduce((best, d) => (d.completion > best.completion ? d : best), perDay[0])
      : null

  const daysWithCost = perDay.length || 1
  const dailyAvgSpending = Math.round(spent / daysWithCost)

  return {
    overallPct,
    breakdown,
    totals: {
      placesActual: places.length,
      placesPlanned,
      actsActual,
      actsPlanned,
      distance: trip?.stats?.distanceKm || '—',
      spent,
      budgetTotal,
      dailyAvgSpending,
      travelers: trip?.travelers || 1,
      daysCount: trip?.daysCount || days.length || 1,
    },
    perDay,
    highlights: { priciest, busiest, bestDay },
  }
}
