const breaks = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394,
  2456, 3178,
]

const div = (a, b) => ~~(a / b)
const mod = (a, b) => a - ~~(a / b) * b

function jalCal(jy) {
  const bl = breaks.length
  const gy = jy + 621
  let leapJ = -14
  let jp = breaks[0]
  let jump = 0

  if (jy < jp || jy >= breaks[bl - 1]) {
    throw new RangeError(`سال شمسی خارج از محدوده پشتیبانی: ${jy}`)
  }

  for (let i = 1; i < bl; i += 1) {
    const jm = breaks[i]
    jump = jm - jp
    if (jy < jm) break
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4)
    jp = jm
  }

  let n = jy - jp
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4)
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150
  const march = 20 + leapJ - leapG

  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33
  let leap = mod(mod(n + 1, 33) - 1, 4)
  if (leap === -1) leap = 4

  return { leap, gy, march }
}

function g2d(gy, gm, gd) {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752
  return d
}

function d2g(jdn) {
  let j = 4 * jdn + 139361631
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908
  const i = div(mod(j, 1461), 4) * 5 + 308
  const gd = div(mod(i, 153), 5) + 1
  const gm = mod(div(i, 153), 12) + 1
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6)
  return { gy, gm, gd }
}

export function toJalaali(gy, gm, gd) {
  return d2j(g2d(gy, gm, gd))
}

export function toGregorian(jy, jm, jd) {
  return d2g(j2d(jy, jm, jd))
}

function j2d(jy, jm, jd) {
  const r = jalCal(jy)
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1
}

function d2j(jdn) {
  const gy = d2g(jdn).gy
  let jy = gy - 621
  const r = jalCal(jy)
  const jdn1f = g2d(gy, 3, r.march)
  let k = jdn - jdn1f

  if (k >= 0) {
    if (k <= 185) {
      return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 }
    }
    k -= 186
  } else {
    jy -= 1
    k += 179
    if (r.leap === 1) k += 1
  }

  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 }
}

export function isLeapJalaaliYear(jy) {
  return jalCal(jy).leap === 0
}

export function jalaaliMonthLength(jy, jm) {
  if (jm <= 6) return 31
  if (jm <= 11) return 30
  return isLeapJalaaliYear(jy) ? 30 : 29
}

export function dateToJalaali(date) {
  return toJalaali(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

export function jalaaliToDate(jy, jm, jd) {
  const g = toGregorian(jy, jm, jd)
  return new Date(g.gy, g.gm - 1, g.gd)
}

export function todayJalaali() {
  return dateToJalaali(new Date())
}

export function jalaaliToISO(jy, jm, jd) {
  const g = toGregorian(jy, jm, jd)
  const mm = String(g.gm).padStart(2, '0')
  const dd = String(g.gd).padStart(2, '0')
  return `${g.gy}-${mm}-${dd}`
}
