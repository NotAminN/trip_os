/**
 * Notes service backed by the Django REST API.
 * Notes can be trip-level or scoped to a day/place; `pinned` and `tone`
 * remain local UI preferences (permitted non-critical UI state).
 */

import { apiFetch } from './api.js'
import { toast } from '../components/toast.js'
import { loadState, saveState } from '../utils/storage.js'

const byTrip = new Map() // tripId -> [mappedNote]
const PINNED_KEY = 'pinned-note-ids'
const TONES_KEY = 'note-tones'

const pinnedIds = new Set(loadState(PINNED_KEY, []))
const tones = loadState(TONES_KEY, {})

function persistPinned() {
  saveState(PINNED_KEY, Array.from(pinnedIds))
}

function mapNote(raw) {
  return {
    id: raw.id,
    tripId: raw.trip,
    title: raw.title || '',
    text: raw.content,
    content: raw.content,
    dayId: raw.day ?? null,
    placeId: raw.place ?? null,
    createdBy: raw.created_by || null,
    createdAt: raw.created_at,
    pinned: pinnedIds.has(raw.id),
    tone: tones[raw.id] || 'sky',
  }
}

async function fetchAll(tripId) {
  const data = await apiFetch(`/trips/${Number(tripId)}/notes/?page_size=100`)
  const rows = Array.isArray(data) ? data : data.results || []
  byTrip.set(Number(tripId), rows.map(mapNote))
}

export const notesService = {
  async ensureLoaded(tripId) {
    if (!tripId || this.isLoaded(tripId)) return
    try {
      await fetchAll(Number(tripId))
    } catch (error) {
      console.error('notes load failed', error)
      toast.error?.('دریافت یادداشت‌ها ناموفق بود.')
    }
  },

  isLoaded(tripId) {
    return byTrip.has(Number(tripId))
  },

  listByTrip(tripId) {
    return (byTrip.get(Number(tripId)) || [])
      .slice()
      .sort((a, b) => Number(b.pinned || 0) - Number(a.pinned || 0))
  },

  getById(id) {
    for (const items of byTrip.values()) {
      const found = items.find((note) => note.id === Number(id))
      if (found) return found
    }
    return null
  },

  /** POST /trips/{tripId}/notes/ — optimistic insert. */
  create(draft) {
    const tripId = Number(draft.tripId)
    const items = byTrip.get(tripId) || []

    const optimistic = {
      id: `temp-note-${Date.now().toString(36)}`,
      tripId,
      title: draft.title || '',
      text: draft.content ?? draft.text ?? '',
      content: draft.content ?? draft.text ?? '',
      dayId: draft.dayId ?? null,
      placeId: draft.placeId ?? null,
      createdAt: new Date().toISOString(),
      pinned: false,
      tone: draft.tone || 'sky',
      _pending: true,
    }
    items.unshift(optimistic)
    byTrip.set(tripId, items)
    if (optimistic.tone !== 'sky') {
      tones[optimistic.id] = optimistic.tone
      saveState(TONES_KEY, tones)
    }

    return apiFetch(`/trips/${tripId}/notes/`, {
      method: 'POST',
      body: {
        title: optimistic.title,
        content: optimistic.content,
        day: draft.dayId ?? undefined,
        place: draft.placeId ?? undefined,
      },
    })
      .then((created) => {
        Object.assign(optimistic, mapNote(created), {
          pinned: pinnedIds.has(created.id),
          tone: tones[created.id] || optimistic.tone,
          _pending: false,
        })
        delete tones[optimistic.id]
        if (tones[created.id] === undefined && optimistic.tone !== 'sky') {
          tones[created.id] = optimistic.tone
          saveState(TONES_KEY, tones)
        }
        return optimistic
      })
      .catch((error) => {
        byTrip.set(
          tripId,
          items.filter((item) => item !== optimistic),
        )
        toast.error?.('ثبت یادداشت ناموفق بود.')
        throw error
      })
  },

  /** PATCH /notes/{id}/ — optimistic with rollback. */
  update(id, patch) {
    const existing = this.getById(id)
    if (!existing) return Promise.resolve(null)

    const snapshot = { ...existing }
    Object.assign(existing, patch)

    const body = {}
    if ('title' in patch) body.title = patch.title
    if ('content' in patch || 'text' in patch) body.content = patch.content ?? patch.text

    return apiFetch(`/notes/${Number(existing.id)}/`, { method: 'PATCH', body }).catch(
      (error) => {
        Object.assign(existing, snapshot)
        toast.error?.('ذخیرهٔ یادداشت ناموفق بود.')
        throw error
      },
    )
  },

  /** Pinning is a UI preference stored locally (no backend field). */
  togglePinned(id) {
    const note = this.getById(id)
    if (!note) return null
    note.pinned = !note.pinned
    if (note.pinned) pinnedIds.add(note.id)
    else pinnedIds.delete(note.id)
    persistPinned()
    return note
  },

  /** DELETE /notes/{id}/ — optimistic removal. */
  remove(id) {
    const existing = this.getById(id)
    if (!existing) return Promise.resolve()

    const items = byTrip.get(existing.tripId) || []
    const index = items.findIndex((note) => note.id === existing.id)
    if (index >= 0) items.splice(index, 1)

    return apiFetch(`/notes/${Number(existing.id)}/`, { method: 'DELETE' }).catch(
      (error) => {
        if (index >= 0) items.splice(index, 0, existing)
        toast.error?.('حذف یادداشت ناموفق بود.')
        throw error
      },
    )
  },
}
