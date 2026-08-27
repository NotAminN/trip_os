/**
 * Central HTTP layer for the Trip OS API.
 *
 * Responsibilities: base URL, Authorization header, JSON handling, timeouts,
 * normalized errors, and single-flight token refresh with one retry.
 */

// Defaults to a same-origin relative path so the frontend works behind any
// server/proxy without code changes. Override with VITE_API_URL at build time
// if the API is hosted on a different origin (e.g. https://api.example.com/api).
const BASE_URL = import.meta.env?.VITE_API_URL || '/api'
const ACCESS_KEY = 'tripos-access-token'
const REFRESH_KEY = 'tripos-refresh-token'
const SESSION_EXPIRED_EVENT = 'tripos:session-expired'

export class ApiError extends Error {
  constructor(message, status = 0, payload = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_KEY)
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY)
  },
  save({ access, refresh }) {
    if (access) localStorage.setItem(ACCESS_KEY, access)
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

/** Human-readable message from DRF error payloads. */
function extractMessage(payload, status) {
  if (!payload) {
    return { message: DEFAULT_MESSAGES[status] || 'خطای غیرمنتظره رخ داد.', fieldErrors: null }
  }
  if (typeof payload.detail === 'string') {
    return { message: payload.detail, fieldErrors: null }
  }
  if (typeof payload === 'object') {
    const firstField = Object.keys(payload)[0]
    if (firstField) {
      const value = payload[firstField]
      const text = Array.isArray(value) ? value[0] : String(value)
      return { message: text, fieldErrors: payload }
    }
  }
  return { message: DEFAULT_MESSAGES[status] || 'خطای غیرمنتظره رخ داد.', fieldErrors: null }
}

const DEFAULT_MESSAGES = {
  400: 'اطلاعات ارسالی معتبر نیست.',
  401: 'اعتبارسنجی لازم است.',
  403: 'اجازهٔ انجام این کار را ندارید.',
  404: 'منبع موردنظر پیدا نشد.',
  500: 'خطای سرور؛ بعداً تلاش کنید.',
  503: 'اتصال به سرور برقرار نشد.',
}

let refreshInFlight = null

async function refreshAccessToken() {
  if (!tokenStore.refresh) return false
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await fetch(`${BASE_URL}/auth/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: tokenStore.refresh }),
        })
        if (!response.ok) return false
        const data = await response.json()
        tokenStore.save(data)
        return true
      } catch {
        return false
      } finally {
        setTimeout(() => (refreshInFlight = null), 0)
      }
    })()
  }
  return refreshInFlight
}

function expireSession() {
  tokenStore.clear()
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
}

/**
 * Perform an authenticated API request.
 * @param {string} path Path beginning with "/" relative to the API base URL.
 */
export async function apiFetch(path, options = {}) {
  const { method = 'GET', body, headers = {}, timeoutMs = 15000, isRetry = false } = options

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  const requestHeaders = { Accept: 'application/json', ...headers }
  const accessToken = tokenStore.access
  if (accessToken) requestHeaders.Authorization = `Bearer ${accessToken}`
  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders['Content-Type'] = 'application/json'
  }

  let response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (error) {
    clearTimeout(timer)
    if (error.name === 'AbortError') {
      throw new ApiError('پاسخی از سرور دریافت نشد (timeout).', 503)
    }
    throw new ApiError('اتصال به سرور برقرار نشد.', 0)
  }
  clearTimeout(timer)

  if (response.status === 401 && !isRetry && path !== '/auth/login/' && path !== '/auth/register/') {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      return apiFetch(path, { ...options, isRetry: true })
    }
    expireSession()
  }

  let payload = null
  if (response.status !== 204) {
    try {
      payload = await response.json()
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    const { message, fieldErrors } = extractMessage(payload, response.status)
    if (!response.headers.get('content-type')?.includes('application/json')) {
      throw new ApiError(DEFAULT_MESSAGES[response.status] || 'خطای ارتباط با سرور.', response.status)
    }
    throw new ApiError(message, response.status, fieldErrors ?? payload)
  }

  return payload
}

export const API_BASE_URL = BASE_URL
