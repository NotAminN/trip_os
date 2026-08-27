/**
 * Weather service backed by /api/trips/{id}/weather/.
 * Today the backend serves stored forecasts; swapping in a live provider
 * later changes nothing here.
 */

import { apiFetch } from './api.js'
import { toast } from '../components/toast.js'

const byTrip = new Map() // tripId -> [mappedForecast]

const CONDITION_LABELS = {
  sunny: 'آفتابی',
  partly_cloudy: 'نیمه‌ابری',
  cloudy: 'ابری',
  rain: 'بارانی',
  thunderstorm: 'رعدوبرق',
  snow: 'برفی',
  windy: 'بادی',
  fog: 'مه‌آلود',
}

function toFa(n) {
  const fa = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
  return String(n).replace(/\d/g, (digit) => fa[Number(digit)])
}

function mapForecast(raw) {
  const high = raw.temperature_high
  const low = raw.temperature_low
  return {
    id: raw.id,
    date: raw.date,
    dayId: raw.day ?? null,
    condition: raw.condition,
    cond: CONDITION_LABELS[raw.condition] || raw.condition,
    temp: `${toFa(high)}°`,
    high: `${toFa(high)}°`,
    low: `${toFa(low)}°`,
    temperatureHigh: high,
    temperatureLow: low,
    windKmh: raw.wind_speed,
    humidity: raw.humidity,
    sunrise: raw.sunrise,
    sunset: raw.sunset,
    _raw: raw,
  }
}

export const weatherService = {
  async ensureLoaded(tripId) {
    if (!tripId || this.isLoaded(tripId)) return
    try {
      const rows = await apiFetch(`/trips/${Number(tripId)}/weather/`)
      byTrip.set(Number(tripId), (Array.isArray(rows) ? rows : []).map(mapForecast))
    } catch (error) {
      console.error('weather load failed', error)
      toast.error?.('دریافت آب‌وهوا ناموفق بود.')
    }
  },

  isLoaded(tripId) {
    return byTrip.has(Number(tripId))
  },

  /** Sync accessor over the cached forecast (legacy signature kept). */
  getForTrip(tripId) {
    return [...(byTrip.get(Number(tripId)) || [])]
  },
}
