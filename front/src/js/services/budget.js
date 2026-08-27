/**
 * Budget/expenses service backed by the Django REST API.
 *
 * The backend owns every money calculation (/trips/{id}/budget/); this module
 * caches expenses + the authoritative summary and mirrors spent values onto
 * the cached trip objects so headers/cards render live numbers.
 */

import { apiFetch } from './api.js'
import { toast } from '../components/toast.js'
import { tripService } from './trips.js'

const expensesByTrip = new Map() // tripId -> [mappedExpense]
const summaryByTrip = new Map() // tripId -> /budget/ payload

function mapExpense(raw) {
  return {
    id: raw.id,
    tripId: raw.trip,
    title: raw.title,
    category: raw.category,
    amount: Number(raw.amount) || 0,
    currency: raw.currency || 'IRR',
    description: raw.description || '',
    expenseDate: raw.expense_date,
    dayId: raw.day ?? null,
    createdBy: raw.created_by || null,
  }
}

function syncTripStats(tripId) {
  const trip = tripService.getById(tripId)
  const summary = summaryByTrip.get(Number(tripId))
  if (trip && summary) {
    trip.budget.spent = summary.spent
    trip.budget.remaining = summary.remaining
    trip.budget.percentage = summary.percentage
  }
}

async function refreshSummary(tripId) {
  try {
    const summary = await apiFetch(`/trips/${Number(tripId)}/budget/`)
    summaryByTrip.set(Number(tripId), summary)
    syncTripStats(tripId)
  } catch (error) {
    console.error('budget refresh failed', error)
  }
}

async function fetchAll(tripId) {
  const [expensesData] = await Promise.all([
    apiFetch(`/trips/${Number(tripId)}/expenses/?page_size=100`),
    refreshSummary(tripId),
  ])
  const rows = Array.isArray(expensesData) ? expensesData : expensesData.results || []
  expensesByTrip.set(Number(tripId), rows.map(mapExpense))
}

export const budgetService = {
  async ensureLoaded(tripId) {
    if (!tripId || this.isLoaded(tripId)) return
    try {
      await fetchAll(Number(tripId))
    } catch (error) {
      console.error('expenses load failed', error)
      toast.error?.('دریافت هزینه‌ها ناموفق بود.')
    }
  },

  isLoaded(tripId) {
    return expensesByTrip.has(Number(tripId))
  },

  /** Authoritative summary from the backend when loaded. */
  getSummary(tripId) {
    return summaryByTrip.get(Number(tripId)) || null
  },

  listByTrip(tripId) {
    return [...(expensesByTrip.get(Number(tripId)) || [])]
  },

  getById(id) {
    for (const items of expensesByTrip.values()) {
      const found = items.find((expense) => expense.id === Number(id))
      if (found) return found
    }
    return null
  },

  /** POST /trips/{tripId}/expenses/ — optimistic insert, never throws. */
  create(draft) {
    const tripId = Number(draft.tripId)
    const items = expensesByTrip.get(tripId) || []

    const optimistic = {
      id: `temp-exp-${Date.now().toString(36)}`,
      tripId,
      title: draft.title,
      category: draft.category || 'food',
      amount: Number(draft.amount) || 0,
      currency: 'IRR',
      description: draft.description || '',
      expenseDate: draft.date || null,
      dayId: draft.dayId ?? null,
      _pending: true,
    }
    items.unshift(optimistic)
    expensesByTrip.set(tripId, items)

    const payload = {
      title: draft.title,
      amount: Math.max(1, Number(draft.amount) || 0),
      category: draft.category || 'food',
      description: draft.description || '',
      day: draft.dayId != null && !String(draft.dayId).startsWith('temp') ? draft.dayId : undefined,
      expense_date: draft.date || undefined,
    }

    return apiFetch(`/trips/${tripId}/expenses/`, { method: 'POST', body: payload })
      .then(async (created) => {
        Object.assign(optimistic, mapExpense(created), { _pending: false })
        await refreshSummary(tripId)
        return optimistic
      })
      .catch((error) => {
        expensesByTrip.set(
          tripId,
          items.filter((item) => item !== optimistic),
        )
        toast.error?.('ثبت هزینه ناموفق بود.')
        throw error
      })
  },

  /** PATCH /expenses/{id}/ — optimistic with rollback, never throws. */
  update(id, patch) {
    const existing = this.getById(id)
    if (!existing) return Promise.resolve(null)

    const snapshot = { ...existing }
    Object.assign(existing, {
      title: patch.title ?? existing.title,
      category: patch.category ?? existing.category,
      amount: patch.amount != null ? Number(patch.amount) : existing.amount,
      description: patch.description ?? existing.description,
    })

    const body = {}
    if ('title' in patch) body.title = patch.title
    if ('category' in patch) body.category = patch.category
    if ('amount' in patch) body.amount = Math.max(1, Number(patch.amount) || 0)
    if ('description' in patch) body.description = patch.description

    return apiFetch(`/expenses/${Number(existing.id)}/`, { method: 'PATCH', body })
      .then(async () => {
        await refreshSummary(existing.tripId)
        return existing
      })
      .catch((error) => {
        const items = expensesByTrip.get(existing.tripId) || []
        const index = items.findIndex((item) => item.id === existing.id)
        if (index >= 0) items[index] = snapshot
        toast.error?.('ذخیرهٔ هزینه ناموفق بود.')
        throw error
      })
  },

  /** DELETE /expenses/{id}/ — optimistic removal, never throws. */
  remove(id) {
    const existing = this.getById(id)
    if (!existing) return Promise.resolve()

    const items = expensesByTrip.get(existing.tripId) || []
    const index = items.findIndex((item) => item.id === existing.id)
    if (index >= 0) items.splice(index, 1)

    return apiFetch(`/expenses/${Number(existing.id)}/`, { method: 'DELETE' })
      .then(() => refreshSummary(existing.tripId))
      .catch((error) => {
        if (index >= 0) items.splice(index, 0, existing)
        toast.error?.('حذف هزینه ناموفق بود.')
        throw error
      })
  },
}

/** Spent total: prefers the backend summary, falls back to a local sum. */
export function getSpent(tripId) {
  const summary = summaryByTrip.get(Number(tripId))
  if (summary) return summary.spent

  const items = expensesByTrip.get(Number(tripId))
  if (!items) return null
  return items.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0)
}

export function getSpentOrFallback(trip) {
  return getSpent(trip.id) ?? trip.budget?.spent ?? 0
}
