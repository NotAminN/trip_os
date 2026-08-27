/**
 * Notifications service backed by /api/notifications/.
 * Users only ever receive their own rows (enforced server-side).
 */

import { apiFetch } from './api.js'

let cache = []
let loaded = false

export const notificationsService = {
  async ensureLoaded() {
    if (loaded) return
    try {
      const data = await apiFetch('/notifications/?page_size=20')
      cache = data.results || []
      loaded = true
    } catch (error) {
      console.error('notifications load failed', error)
    }
  },

  reset() {
    cache = []
    loaded = false
  },

  list() {
    return [...cache]
  },

  unreadCount() {
    return cache.filter((notification) => !notification.is_read).length
  },

  async markRead(id) {
    const updated = await apiFetch(`/notifications/${Number(id)}/read/`, { method: 'PATCH' })
    cache = cache.map((n) => (n.id === Number(id) ? updated : n))
    return updated
  },

  async markAllRead() {
    await apiFetch('/notifications/read-all/', { method: 'POST', body: {} })
    cache = cache.map((n) => ({ ...n, is_read: true }))
    return true
  },
}
