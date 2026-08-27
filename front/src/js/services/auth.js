/**
 * Authentication service — register / login / logout / current user.
 * Tokens are persisted in localStorage via the api.js token store.
 */

import { ApiError, apiFetch, tokenStore } from './api.js'

const USER_KEY = 'tripos-user'
const SESSION_EVENT = 'tripos:session-expired'

let cachedUser = null
try {
  cachedUser = JSON.parse(localStorage.getItem(USER_KEY) || 'null')
} catch {
  cachedUser = null
}

const listeners = new Set()

function setUser(user) {
  cachedUser = user
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
  else localStorage.removeItem(USER_KEY)
  listeners.forEach((fn) => fn(cachedUser))
}

export const authService = {
  getUser() {
    return cachedUser
  },

  isAuthenticated() {
    return Boolean(tokenStore.access || tokenStore.refresh)
  },

  onChange(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },

  async login(email, password) {
    const data = await apiFetch('/auth/login/', {
      method: 'POST',
      body: { email, password },
    })
    tokenStore.save(data)
    setUser(data.user)
    return data.user
  },

  async register({ email, username, first_name = '', last_name = '', password, password_confirm }) {
    const data = await apiFetch('/auth/register/', {
      method: 'POST',
      body: { email, username, first_name, last_name, password, password_confirm },
    })
    tokenStore.save(data)
    setUser(data.user)
    return data.user
  },

  async me() {
    if (!this.isAuthenticated()) return null
    try {
      const user = await apiFetch('/users/me/')
      setUser(user)
      return user
    } catch (error) {
      if (error instanceof ApiError && error.status === 0) throw error // server offline
      return null
    }
  },

  async logout() {
    try {
      await apiFetch('/auth/logout/', { method: 'POST', body: { refresh: tokenStore.refresh } })
    } catch {
      // Token may already be invalid; clearing locally is what matters.
    }
    setUser(null)
    tokenStore.clear()
  },
}

/** Resolve once a valid session exists; shows nothing by itself. */
export function waitForValidSession(ensureSessionUi) {
  return (async () => {
    if (!authService.isAuthenticated()) {
      await ensureSessionUi()
      return authService.getUser()
    }
    const user = await authService.me()
    if (!user) {
      await ensureSessionUi()
    }
    return authService.getUser()
  })()
}

if (typeof window !== 'undefined') {
  window.addEventListener(SESSION_EVENT, () => {
    setUser(null)
  })
}
