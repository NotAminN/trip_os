import { formatNumber, toPersianDigits } from './formatters.js'
import { BASE_CURRENCY, convertFromToman, CURRENCIES } from './currency.js'

export { formatPercent } from './formatters.js'

export { CURRENCIES, BASE_CURRENCY }

export function formatMoney(amountToman, code = BASE_CURRENCY) {
  const currency = CURRENCIES[code] || CURRENCIES[BASE_CURRENCY]
  const value = convertFromToman(amountToman, currency.code)
  const hasFraction = Math.round(value * 100) % 100 !== 0
  return `${formatNumber(value, {
    maximumFractionDigits: hasFraction ? 2 : 0,
  })} ${currency.symbol}`
}
