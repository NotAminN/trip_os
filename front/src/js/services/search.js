/**
 * Global search across the user's trips/places/activities/notes plus public
 * destinations. Results are grouped exactly like the backend contract.
 */

import { apiFetch } from './api.js'

export const searchService = {
  async search(query) {
    const q = String(query || '').trim()
    if (!q) {
      return {
        query: '',
        counts: { trips: 0, places: 0, activities: 0, notes: 0, destinations: 0 },
        trips: [],
        places: [],
        activities: [],
        notes: [],
        destinations: [],
      }
    }
    return apiFetch(`/search/?q=${encodeURIComponent(q)}`)
  },
}
