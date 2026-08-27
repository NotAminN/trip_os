export const CONDITIONS = {
  sunny: { label: 'آفتابی', icon: 'sun' },
  partly: { label: 'کمی ابری', icon: 'cloudSun' },
  cloudy: { label: 'ابری', icon: 'cloud' },
  rainy: { label: 'بارانی', icon: 'rain' },
}

const WEATHER_DATA = {
  'istanbul-summer': {
    city: 'استانبول',
    current: {
      temp: '۲۱°',
      feels: '۲۰°',
      cond: 'partly',
      high: '۲۴°',
      low: '۱۵°',
      wind: '۱۸ km/h',
      humidity: '۵۸٪',
      uv: 'متوسط',
      sunrise: '۰۶:۳۴',
      sunset: '۱۹:۲۲',
    },
    hourly: [
      { time: '۰۶:۰۰', temp: '۱۵°', cond: 'partly', pop: '۱۰٪' },
      { time: '۰۹:۰۰', temp: '۱۸°', cond: 'sunny', pop: '۰٪' },
      { time: '۱۲:۰۰', temp: '۲۲°', cond: 'sunny', pop: '۰٪' },
      { time: '۱۵:۰۰', temp: '۲۴°', cond: 'partly', pop: '۵٪' },
      { time: '۱۸:۰۰', temp: '۲۲°', cond: 'cloudy', pop: '۲۰٪' },
      { time: '۲۱:۰۰', temp: '۱۸°', cond: 'cloudy', pop: '۳۰٪' },
      { time: '۲۴:۰۰', temp: '۱۶°', cond: 'rainy', pop: '۴۵٪' },
    ],
    daily: [
      { dayId: 'd1', label: 'روز اول', date: 'چهارشنبه ۲۴ شهریور', high: 21, low: 15, cond: 'sunny', pop: 5 },
      { dayId: 'd2', label: 'روز دوم', date: 'پنج‌شنبه ۲۵ شهریور', high: 23, low: 16, cond: 'sunny', pop: 0 },
      { dayId: 'd3', label: 'روز سوم', date: 'جمعه ۲۶ شهریور', high: 22, low: 17, cond: 'partly', pop: 15 },
      { dayId: 'd4', label: 'روز چهارم', date: 'شنبه ۲۷ شهریور', high: 19, low: 15, cond: 'rainy', pop: 70 },
      { dayId: 'd5', label: 'روز پنجم', date: 'یک‌شنبه ۲۸ شهریور', high: 24, low: 18, cond: 'sunny', pop: 0 },
      { dayId: 'd6', label: 'روز ششم', date: 'دوشنبه ۲۹ شهریور', high: 22, low: 16, cond: 'partly', pop: 20 },
    ],
  },
}

export function getWeatherForTrip(tripId) {
  return WEATHER_DATA[tripId] || null
}
