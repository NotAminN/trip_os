/**
 * Places service backed by the Django REST API.
 * Optimistic local updates + API persistence; the server is the truth.
 */

import { apiFetch } from './api.js'
import { toast } from '../components/toast.js'

const cacheByTrip = new Map() // tripId -> [mappedPlace]

function pseudoCoords(lat, lng) {
  // The stylized map canvas expects percentage positions; derive them from
  // real coordinates so markers land in roughly correct relative spots.
  if (lat == null || lng == null) return { x: 50, y: 50 }
  const x = Math.min(94, Math.max(6, ((Number(lng) + 180) / 360) * 100 * 1.4))
  const y = Math.min(92, Math.max(8, ((90 - Number(lat)) / 180) * 100 * 2.2))
  return { x: Math.round(x), y: Math.round(y) }
}

function mapPlace(raw, tripId) {
  const { x, y } = pseudoCoords(raw.latitude, raw.longitude)
  return {
    id: raw.id,
    tripId,
    name: raw.name,
    category: raw.category,
    address: raw.address || '',
    note: raw.notes || '',
    description: raw.description || '',
    estimatedCost: Number(raw.estimated_cost) || 0,
    currency: raw.currency || 'IRR',
    latitude: raw.latitude != null ? Number(raw.latitude) : null,
    longitude: raw.longitude != null ? Number(raw.longitude) : null,
    day: raw.day ?? null,
    dayNumber: raw.day_details?.day_number ?? null,
    position: raw.position ?? 0,
    startTime: raw.start_time,
    endTime: raw.end_time,
    x,
    y,
    order: raw.position ?? 0,
    activityRef: null,
  }
}

async function fetchAll(tripId) {
  const data = await apiFetch(`/trips/${tripId}/places/?page_size=100`)
  const rows = Array.isArray(data) ? data : data.results || []
  cacheByTrip.set(tripId, rows.map((row) => mapPlace(row, tripId)))
}

export const placeService = {
  /** Load places of a trip from the backend (once per trip per session). */
  async ensureLoaded(tripId) {
    if (!tripId || this.isLoaded(tripId)) return
    try {
      await fetchAll(Number(tripId))
    } catch (error) {
      console.error('places load failed', error)
      toast.error?.('دریافت مکان‌ها ناموفق بود.')
    }
  },

  isLoaded(tripId) {
    return cacheByTrip.has(Number(tripId))
  },

  listByTrip(tripId) {
    return [...(cacheByTrip.get(Number(tripId)) || [])]
  },

  getById(id) {
    for (const items of cacheByTrip.values()) {
      const found = items.find((place) => place.id === Number(id))
      if (found) return found
    }
    return null
  },

  findByName(tripId, name) {
    const needle = String(name || '').trim()
    if (!needle) return null
    const items = cacheByTrip.get(Number(tripId)) || []
    return items.find((place) => place.name === needle) || null
  },

  /** POST /trips/{tripId}/places/ — resolves with the mapped place. */
  async create(tripId, draft) {
    const payload = {
      name: draft.name,
      category: draft.category || 'other',
      address: draft.address || '',
      notes: draft.note || draft.notes || '',
      description: draft.description || '',
      estimated_cost: Math.max(0, Number(draft.cost ?? draft.estimatedCost ?? 0)),
      latitude: draft.latitude ?? null,
      longitude: draft.longitude ?? null,
      start_time: draft.startTime || null,
      end_time: draft.endTime || null,
      duration_minutes: draft.durationMinutes ?? null,
      day: draft.day ?? undefined,
    }

    const created = await apiFetch(`/trips/${Number(tripId)}/places/`, {
      method: 'POST',
      body: payload,
    })
    const mapped = mapPlace(created, Number(tripId))
    const items = cacheByTrip.get(Number(tripId)) || []
    items.push(mapped)
    cacheByTrip.set(Number(tripId), items)
    return mapped
  },

  /** PATCH /places/{id}/ — optimistic update with rollback on failure. */
  async update(id, patch) {
    const existing = this.getById(id)
    if (!existing) return null

    const snapshot = { ...existing }
    Object.assign(existing, {
      name: patch.name ?? existing.name,
      category: patch.category ?? existing.category,
      address: patch.address ?? existing.address,
      note: patch.note ?? patch.notes ?? existing.note,
      estimatedCost: patch.cost ?? patch.estimated_cost ?? existing.estimatedCost,
      startTime: patch.start_time ?? patch.startTime ?? existing.startTime,
    })

    try {
      await apiFetch(`/places/${Number(id)}/`, { method: 'PATCH', body: patch })
      return existing
    } catch (error) {
      const items = cacheByTrip.get(existing.tripId) || []
      const index = items.findIndex((place) => place.id === existing.id)
      if (index >= 0) items[index] = snapshot
      toast.error?.('ذخیرهٔ تغییرات ناموفق بود.')
      throw error
    }
  },

  /** DELETE /places/{id}/ — optimistic removal. */
  async remove(id) {
    const existing = this.getById(id)
    if (!existing) return

    const items = cacheByTrip.get(existing.tripId) || []
    const index = items.findIndex((place) => place.id === existing.id)
    if (index >= 0) items.splice(index, 1)

    try {
      await apiFetch(`/places/${Number(id)}/`, { method: 'DELETE' })
    } catch (error) {
      if (index >= 0) items.splice(index, 0, existing)
      toast.error?.('حذف مکان ناموفق بود.')
      throw error
    }
  },
}
