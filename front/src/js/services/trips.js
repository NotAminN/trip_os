/**
 * Trip service backed by the Django REST API.
 *
 * Data flows: Frontend -> apiFetch -> Django -> PostgreSQL -> JSON -> cache.
 * Accessors (list/getById/getCurrent) read a local snapshot that is filled
 * from the API at boot and updated after every mutation — the API remains
 * the single source of truth.
 */

import { apiFetch } from './api.js'
import { getState } from '../state/app-state.js'

let tripsCache = []
let loaded = false

const STATUS_LABELS = {
  planning: 'برنامه‌ریزی',
  active: 'در سفر',
  completed: 'انجام‌شده',
  archived: 'بایگانی',
}

const COVER_THEMES = [
  ['#DCEEFF', '#4D8FD8', 'city'],
  ['#E4F6EC', '#2FA36B', 'nature'],
  ['#FFF1DC', '#E8A13C', 'desert'],
  ['#F3E8FF', '#7C5CBF', 'mountain'],
]

/** Map an API trip object to the shape the UI consumes. */
function mapTrip(raw) {
  const [coverFrom, coverTo, coverScene] =
    COVER_THEMES[raw.id % COVER_THEMES.length]

  return {
    id: raw.id,
    _raw: raw,
    title: raw.title,
    destination: raw.destination,
    country: raw.country,
    description: raw.description || '',
    startDate: raw.start_date,
    endDate: raw.end_date,
    dates: `${raw.start_date} تا ${raw.end_date}`,
    daysCount: raw.days_count ?? 0,
    travelers: raw.travelers_count,
    status: raw.status === 'active' ? 'active' : raw.status === 'completed' ? 'done' : 'planned',
    statusLabel: STATUS_LABELS[raw.status] || raw.status,
    myRole: raw.my_role || null,
    progress: null,
    coverFrom,
    coverTo,
    coverScene,
    budget: {
      total: Number(raw.budget) || 0,
      spent: null, // authoritative value comes from /budget/
    },
    stats: { places: 0, activities: 0, distanceKm: '—' },
    packing: { done: 0, total: 0 },
    weather: null,
    upcoming: null,
    days: [],
  }
}

async function fetchAll() {
  const data = await apiFetch('/trips/')
  const rows = Array.isArray(data) ? data : data.results || []
  tripsCache = rows.map(mapTrip)
}

function toIsoDate(value) {
  if (!value) return undefined
  if (typeof value === 'string') return value.slice(0, 10)
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const pad = (n) => String(n).padStart(2, '0')
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
  }
  return undefined
}

export const tripService = {
  /** Fetch trips from the backend once per session. */
  async ensureLoaded() {
    if (loaded) return
    await fetchAll()
    loaded = true
  },

  /** Force a refresh from the backend (after mutations elsewhere). */
  async reload() {
    await fetchAll()
    loaded = true
    return this.list()
  },

  list() {
    return [...tripsCache]
  },

  getById(id) {
    const numeric = Number(id)
    return (
      tripsCache.find((trip) => trip.id === numeric || trip.id === id) || null
    )
  },

  getCurrent() {
    const currentId = getState().currentTripId
    return (
      tripsCache.find((trip) => trip.id === currentId) ||
      tripsCache.find((trip) => trip.id === Number(currentId)) ||
      tripsCache[0] ||
      null
    )
  },

  /**
   * Create a trip via POST /trips/ (backend generates the owner member +
   * calendar days automatically). Resolves with the mapped created trip.
   */
  async create(tripDraft) {
    const payload = {
      title: tripDraft.title,
      destination: tripDraft.destination,
      country: tripDraft.country || '',
      start_date: toIsoDate(tripDraft.startDate),
      end_date: toIsoDate(tripDraft.endDate),
      travelers_count: tripDraft.travelers ?? 1,
      budget: Math.max(0, Number(tripDraft?.budget?.total ?? tripDraft.budget ?? 0)),
    }

    const created = await apiFetch('/trips/', { method: 'POST', body: payload })
    const mapped = mapTrip(created)
    mapped.coverFrom = tripDraft.coverFrom ?? mapped.coverFrom
    mapped.coverTo = tripDraft.coverTo ?? mapped.coverTo
    mapped.coverScene = tripDraft.coverScene ?? mapped.coverScene

    tripsCache.unshift(mapped)
    return mapped
  },

  /** Optimistic delete; cache is updated immediately, API call follows. */
  async remove(id) {
    const numeric = Number(id)
    tripsCache = tripsCache.filter((trip) => trip.id !== numeric)
    try {
      await apiFetch(`/trips/${numeric}/`, { method: 'DELETE' })
      return true
    } catch (error) {
      console.error('trip delete failed', error)
      await fetchAll().catch(() => {})
      throw error
    }
  },

  /** Backwards-compatible alias used by older call sites. */
  async delete(id) {
    return this.remove(id)
  },
}
