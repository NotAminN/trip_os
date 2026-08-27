export const BASE_CURRENCY = 'IRT'

export const CURRENCIES = {
  IRT: { code: 'IRT', symbol: 'تومان', name: 'تومان', tomanPerUnit: 1 },
  USD: { code: 'USD', symbol: '$', name: 'دلار', tomanPerUnit: 89000 },
  EUR: { code: 'EUR', symbol: '€', name: 'یورو', tomanPerUnit: 103000 },
  GBP: { code: 'GBP', symbol: '£', name: 'پوند', tomanPerUnit: 118000 },
}

export function convertFromToman(amountToman, code = BASE_CURRENCY) {
  const currency = CURRENCIES[code] || CURRENCIES[BASE_CURRENCY]
  return (Number(amountToman) || 0) / currency.tomanPerUnit
}

export function convertToToman(amount, code = BASE_CURRENCY) {
  const currency = CURRENCIES[code] || CURRENCIES[BASE_CURRENCY]
  return (Number(amount) || 0) * currency.tomanPerUnit
}
