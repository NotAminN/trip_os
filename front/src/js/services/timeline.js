/**
 * Timeline service backed by the Django REST API.
 *
 * Days come from /trips/{id}/days/ and activities from /trips/{id}/activities/.
 * Mutations update the local snapshot immediately (optimistic UI) and are
 * persisted through the API; drag & drop uses the transactional reorder
 * endpoint so the order survives page refreshes.
 */

import { apiFetch } from './api.js'
import { placeService } from './places.js'
import { toast } from '../components/toast.js'

const cacheByTrip = new Map() // tripId -> [day]

function toFa(n) {
  const fa = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
  return String(n).replace(/\d/g, (digit) => fa[Number(digit)])
}

export function timeToMinutes(time) {
  const [h, m] = String(time || '0:0').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function durationLabel(minutes) {
  if (!minutes) return '—'
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours && rest) return `${toFa(hours)} ساعت و ${toFa(rest)} دقیقه`
  if (hours) return `${toFa(hours)} ساعت`
  return `${toFa(minutes)} دقیقه`
}

function mapActivity(raw) {
  const placeName =
    (raw.place && placeService.getById(raw.place)?.name) || raw.place_name || ''
  return {
    id: raw.id,
    dayId: raw.day,
    time: raw.start_time ? String(raw.start_time).slice(0, 5) : '',
    title: raw.title,
    place: placeName,
    placeId: raw.place ?? null,
    category: raw.category,
    duration: durationLabel(raw.duration_minutes),
    durationMinutes: raw.duration_minutes ?? null,
    cost: Number(raw.cost) || 0,
    notes: raw.description || '',
    done: Boolean(raw.completed),
    position: raw.position ?? 0,
    _raw: raw,
  }
}

function recalcDay(day) {
  const total = day.activities.length
  day.cost = day.activities.reduce((sum, a) => sum + (Number(a.cost) || 0), 0)
  day.completion = total
    ? Math.round((day.activities.filter((a) => a.done).length / total) * 100)
    : 0
}

async function fetchAll(tripId) {
  const [daysData, activitiesData] = await Promise.all([
    apiFetch(`/trips/${tripId}/days/`),
    apiFetch(`/trips/${tripId}/activities/?page_size=100`),
  ])

  const activityRows = Array.isArray(activitiesData)
    ? activitiesData
    : activitiesData.results || []

  const days = daysData.map((raw, index) => {
    const day = {
      id: raw.id,
      number: raw.day_number,
      title: raw.title || `روز ${toFa(raw.day_number)}`,
      date: raw.date || '',
      weather: null,
      cost: 0,
      completion: 0,
      activities: [],
    }
    day.activities = activityRows
      .filter((row) => row.day === raw.id)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map(mapActivity)
      .map((mapped, order) => ({ ...mapped, position: order }))
    recalcDay(day)
    void index
    return day
  })

  cacheByTrip.set(Number(tripId), days)
}

/** Persist the full order of one day via the transactional endpoint. */
async function persistOrder(tripId, day) {
  await apiFetch(`/trips/${Number(tripId)}/timeline/reorder/`, {
    method: 'PATCH',
    body: {
      kind: 'activities',
      day_id: day.id,
      items: day.activities.map((activity, index) => ({
        id: activity.id,
        position: index,
      })),
    },
  })
}

export const timelineService = {
  async ensureLoaded(tripId) {
    if (!tripId || this.isLoaded(tripId)) return
    try {
      await fetchAll(Number(tripId))
    } catch (error) {
      console.error('timeline load failed', error)
      toast.error?.('دریافت برنامهٔ سفر ناموفق بود.')
    }
  },

  isLoaded(tripId) {
    return cacheByTrip.has(Number(tripId))
  },

  getDays(trip) {
    if (!trip) return []
    return cacheByTrip.get(Number(trip.id)) || []
  },

  /** Kept for compatibility; the backend generates day shells now. */
  async generateDayShells(tripId) {
    await this.ensureLoaded(tripId)
    return this.getDays({ id: tripId })
  },

  moveActivity(tripId, fromDayId, activityId, toDayId, index) {
    const days = this.getDays({ id: tripId })
    const fromDay = days.find((d) => d.id === fromDayId)
    const toDay = days.find((d) => d.id === toDayId)
    if (!fromDay || !toDay) return days

    const actIndex = fromDay.activities.findIndex((a) => a.id === activityId)
    if (actIndex < 0) return days
    const [activity] = fromDay.activities.splice(actIndex, 1)

    let insertAt = index
    if (fromDay === toDay && actIndex < insertAt) insertAt -= 1
    insertAt = Math.max(0, Math.min(insertAt, toDay.activities.length))
    toDay.activities.splice(insertAt, 0, activity)

    recalcDay(fromDay)
    if (fromDay !== toDay) recalcDay(toDay)

    // Persist both affected days' orders (cross-day moves included).
    persistOrder(tripId, toDay).catch((error) => {
      console.error('reorder failed', error)
      toast.error?.('ذخیرهٔ ترتیب ناموفق بود؛ پس از رفرش برمی‌گردد.')
    })

    return days
  },

  nudgeActivity(tripId, dayId, activityId, delta) {
    const days = this.getDays({ id: tripId })
    const day = days.find((d) => d.id === dayId)
    if (!day) return days
    const i = day.activities.findIndex((a) => a.id === activityId)
    const j = i + delta
    if (i < 0 || j < 0 || j >= day.activities.length) return days
    ;[day.activities[i], day.activities[j]] = [day.activities[j], day.activities[i]]
    persistOrder(tripId, day).catch(() => toast.error?.('ذخیرهٔ ترتیب ناموفق بود.'))
    return days
  },

  toggleDone(tripId, dayId, activityId) {
    const days = this.getDays({ id: tripId })
    const day = days.find((d) => d.id === dayId)
    const activity = day?.activities.find((a) => a.id === activityId)
    if (!activity) return days

    activity.done = !activity.done
    recalcDay(day)

    apiFetch(`/activities/${Number(activityId)}/`, {
      method: 'PATCH',
      body: { completed: activity.done },
    }).catch(() => {
      activity.done = !activity.done
      recalcDay(day)
      toast.error?.('ثبت وضعیت فعالیت ناموفق بود.')
    })

    return days
  },

  addActivity(tripId, dayId, draft) {
    const days = this.getDays({ id: tripId })
    const day = days.find((d) => d.id === dayId)
    if (!day) return Promise.resolve(days)

    const matchedPlace = placeService.findByName(tripId, draft.place)
    const payload = {
      title: draft.title,
      category: draft.category || 'other',
      description: draft.notes || '',
      start_time: draft.time ? `${draft.time}:00`.slice(0, 8) : null,
      end_time: null,
      duration_minutes:
        draft.durationMinutes ??
        (typeof draft.duration === 'number' ? draft.duration : null),
      cost: Math.max(0, Number(draft.cost) || 0),
      completed: false,
      day: dayId,
      place: matchedPlace?.id ?? null,
    }

    // Optimistic insert.
    const optimistic = {
      id: `temp-${Date.now().toString(36)}`,
      done: false,
      notes: payload.description,
      place: draft.place || '',
      ...draft,
      _pending: true,
    }
    const insertIndex = day.activities.findIndex(
      (a) => timeToMinutes(a.time) > timeToMinutes(optimistic.time),
    )
    if (insertIndex < 0) day.activities.push(optimistic)
    else day.activities.splice(insertAtSafe(insertIndex, day), 0, optimistic)
    recalcDay(day)

    return apiFetch(`/trips/${Number(tripId)}/activities/`, {
      method: 'POST',
      body: payload,
    })
      .then((created) => {
        Object.assign(optimistic, mapActivity(created), { _pending: false })
        recalcDay(day)
        return days
      })
      .catch((error) => {
        day.activities = day.activities.filter((a) => a !== optimistic)
        recalcDay(day)
        toast.error?.('افزودن فعالیت ناموفق بود.')
        throw error
      })
  },

  updateActivity(tripId, dayId, activityId, patch) {
    const days = this.getDays({ id: tripId })
    const day = days.find((d) => d.id === dayId)
    const activity = day?.activities.find((a) => a.id === activityId)
    if (!activity) return Promise.resolve(days)

    Object.assign(activity, patch)
    day.activities.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time))
    recalcDay(day)

    const body = {}
    if ('title' in patch) body.title = patch.title
    if ('description' in patch || 'notes' in patch) body.description = patch.description ?? patch.notes
    if ('time' in patch && patch.time) body.start_time = `${patch.time}:00`.slice(0, 8)
    if ('category' in patch) body.category = patch.category
    if ('cost' in patch) body.cost = Math.max(0, Number(patch.cost) || 0)
    if ('durationMinutes' in patch) body.duration_minutes = patch.durationMinutes

    return apiFetch(`/activities/${Number(activityId)}/`, { method: 'PATCH', body })
      .then((updated) => Object.assign(activity, mapActivity(updated)))
      .catch((error) => {
        toast.error?.('ذخیرهٔ فعالیت ناموفق بود.')
        throw error
      })
  },

  removeActivity(tripId, dayId, activityId) {
    const days = this.getDays({ id: tripId })
    const day = days.find((d) => d.id === dayId)
    if (!day) return Promise.resolve(days)
    day.activities = day.activities.filter((a) => a.id !== activityId)
    recalcDay(day)

    return apiFetch(`/activities/${Number(activityId)}/`, { method: 'DELETE' }).catch(
      (error) => {
        toast.error?.('حذف فعالیت ناموفق بود.')
        throw error
      },
    )
  },
}

function insertAtSafe(index, day) {
  return Math.max(0, Math.min(index, day.activities.length))
}
