const PREFIX = 'trip-os:'

function isStorageAvailable() {
  try {
    const probe = '__trip_os_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

const storageAvailable = typeof window !== 'undefined' ? isStorageAvailable() : false
const memoryStore = new Map()

export function loadState(key, fallback = null) {
  if (!storageAvailable) return memoryStore.has(key) ? memoryStore.get(key) : fallback
  try {
    const raw = window.localStorage.getItem(PREFIX + key)
    return raw === null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function saveState(key, value) {
  if (!storageAvailable) {
    memoryStore.set(key, value)
    return value
  }
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    memoryStore.set(key, value)
  }
  return value
}

export function removeState(key) {
  if (!storageAvailable) {
    memoryStore.delete(key)
    return
  }
  try {
    window.localStorage.removeItem(PREFIX + key)
  } catch {
    memoryStore.delete(key)
  }
}

export const isPersistent = () => storageAvailable
