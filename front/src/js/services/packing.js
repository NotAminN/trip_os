/**
 * Packing checklist service backed by the Django REST API.
 *
 * Frontend category keys (clothes/docs/tech/care/...) are mapped to the
 * backend's canonical set (clothing/documents/electronics/health/...).
 * Checking an item is optimistic: the UI flips instantly, PATCH follows,
 * failures roll back and surface a toast.
 */

import { apiFetch } from './api.js'
import { toast } from '../components/toast.js'
import { tripService } from './trips.js'

const itemsByTrip = new Map() // tripId -> [mappedItem]

const FE_TO_BE = {
  clothes: 'clothing',
  docs: 'documents',
  tech: 'electronics',
  care: 'health',
  personal: 'personal',
  travel: 'travel',
  other: 'other',
}

const BE_TO_FE = {
  clothing: 'clothes',
  documents: 'docs',
  electronics: 'tech',
  health: 'care',
  personal: 'personal',
  travel: 'travel',
  other: 'other',
}

function mapItem(raw, tripId) {
  return {
    id: raw.id,
    tripId,
    name: raw.name,
    quantity: raw.quantity ?? 1,
    category: BE_TO_FE[raw.category] || 'other',
    done: Boolean(raw.is_packed),
  }
}

function computeSummary(tripId) {
  const items = itemsByTrip.get(Number(tripId)) || []
  if (!items.length) return null
  const done = items.filter((item) => item.done).length
  return {
    done,
    total: items.length,
    percent: Math.round((done / items.length) * 100),
  }
}

function syncTripStats(tripId) {
  const trip = tripService.getById(tripId)
  const summary = computeSummary(tripId)
  if (trip && summary) trip.packing = { done: summary.done, total: summary.total }
}

async function fetchAll(tripId) {
  const data = await apiFetch(`/trips/${Number(tripId)}/packing/?page_size=100`)
  const rows = Array.isArray(data) ? data : data.results || []
  itemsByTrip.set(Number(tripId), rows.map((row) => mapItem(row, Number(tripId))))
  syncTripStats(tripId)
}

export const packingService = {
  async ensureLoaded(tripId) {
    if (!tripId || this.isLoaded(tripId)) return
    try {
      await fetchAll(Number(tripId))
    } catch (error) {
      console.error('packing load failed', error)
      toast.error?.('دریافت چک‌لیست ناموفق بود.')
    }
  },

  isLoaded(tripId) {
    return itemsByTrip.has(Number(tripId))
  },

  async reload(tripId) {
    if (!tripId) return
    await fetchAll(Number(tripId))
  },

  listByTrip(tripId) {
    return [...(itemsByTrip.get(Number(tripId)) || [])]
  },

  getById(id) {
    for (const items of itemsByTrip.values()) {
      const found = items.find((item) => item.id === Number(id))
      if (found) return found
    }
    return null
  },

  /** POST /trips/{tripId}/packing/ — optimistic insert, never throws. */
  create(draft) {
    const tripId = Number(draft.tripId)
    const items = itemsByTrip.get(tripId) || []

    const optimistic = {
      id: `temp-pk-${Date.now().toString(36)}`,
      tripId,
      name: draft.name,
      quantity: draft.quantity ?? 1,
      category: draft.category || 'other',
      done: false,
      _pending: true,
    }
    items.unshift(optimistic)
    itemsByTrip.set(tripId, items)

    return apiFetch(`/trips/${tripId}/packing/`, {
      method: 'POST',
      body: {
        name: draft.name,
        quantity: Math.max(1, Number(draft.quantity) || 1),
        category: FE_TO_BE[draft.category] || 'other',
      },
    })
      .then((created) => {
        Object.assign(optimistic, mapItem(created, tripId), { _pending: false })
        syncTripStats(tripId)
        return optimistic
      })
      .catch((error) => {
        itemsByTrip.set(
          tripId,
          items.filter((item) => item !== optimistic),
        )
        toast.error?.('افزودن آیتم ناموفق بود.')
        throw error
      })
  },

  /** PATCH /packing/{id}/ — optimistic update with rollback. */
  update(id, patch) {
    const existing = this.getById(id)
    if (!existing) return Promise.resolve(null)

    const snapshot = { ...existing }
    Object.assign(existing, patch)

    const body = {}
    if ('name' in patch) body.name = patch.name
    if ('quantity' in patch) body.quantity = Math.max(1, Number(patch.quantity) || 1)
    if ('category' in patch) body.category = FE_TO_BE[patch.category] || 'other'
    if ('done' in patch) body.is_packed = Boolean(patch.done)

    return apiFetch(`/packing/${Number(existing.id)}/`, { method: 'PATCH', body })
      .then(() => {
        syncTripStats(existing.tripId)
        return existing
      })
      .catch((error) => {
        Object.assign(existing, snapshot)
        toast.error?.('ذخیرهٔ آیتم ناموفق بود.')
        throw error
      })
  },

  /** Check/uncheck — optimistic flip then PATCH is_packed. */
  toggleDone(id) {
    const item = this.getById(id)
    if (!item) return Promise.resolve(null)
    return this.update(id, { done: !item.done })
  },

  /** DELETE /packing/{id}/ — optimistic removal. */
  remove(id) {
    const existing = this.getById(id)
    if (!existing) return Promise.resolve()

    const items = itemsByTrip.get(existing.tripId) || []
    const index = items.findIndex((item) => item.id === existing.id)
    if (index >= 0) items.splice(index, 1)

    return apiFetch(`/packing/${Number(existing.id)}/`, { method: 'DELETE' })
      .then(() => void syncTripStats(existing.tripId))
      .catch((error) => {
        if (index >= 0) items.splice(index, 0, existing)
        toast.error?.('حذف آیتم ناموفق بود.')
        throw error
      })
  },

  /** Local summary matching the legacy signature. */
  summary(tripId) {
    return computeSummary(tripId)
  },

  summaryOrFallback(trip) {
    return this.summary(trip.id) || trip.packing || { done: 0, total: 0, percent: 0 }
  },
}
