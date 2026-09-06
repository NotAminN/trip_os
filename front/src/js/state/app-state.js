import { loadState, saveState } from '../utils/storage.js'

const listeners = new Set()

const STORAGE_KEYS = {
  currentTripId: 'current-trip-id',
  sidebarCollapsed: 'sidebar-collapsed',
  notificationsRead: 'notifications-read',
  currency: 'currency',
  displayName: 'display-name',
  motionReduced: 'motion-reduced',
  hideNotifDot: 'notif-dot-hidden',
}

const DEFAULTS = {
  currentTripId: 'istanbul-summer',
  sidebarCollapsed: false,
  notificationsRead: false,
  currency: 'IRT',
  displayName: '',
  motionReduced: false,
  hideNotifDot: false,
}

const state = {}
Object.entries(STORAGE_KEYS).forEach(([key, storageKey]) => {
  state[key] = loadState(storageKey, DEFAULTS[key])
})

export function getState() {
  return state
}

export function setState(patch) {
  Object.entries(patch).forEach(([key, value]) => {
    state[key] = value
    const storageKey = STORAGE_KEYS[key]
    if (storageKey) saveState(storageKey, value)
  })
  listeners.forEach((fn) => fn(state))
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
