import { toJalaali, toGregorian, jalaaliMonthLength } from '../src/js/utils/jalali.js'

const fmt = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  timeZone: 'UTC',
})

let failures = 0
let count = 0

const start = new Date(Date.UTC(1925, 2, 22))
const end = new Date(Date.UTC(2075, 11, 31))

for (let d = new Date(start); d <= end; d = new Date(d.getTime() + 86400000)) {
  const gy = d.getUTCFullYear()
  const gm = d.getUTCMonth() + 1
  const gd = d.getUTCDate()

  const j = toJalaali(gy, gm, gd)
  const g = toGregorian(j.jy, j.jm, j.jd)
  count += 1

  const roundTrip =
    g.gy === gy &&
    g.gm === gm &&
    g.gd === gd

  if (!roundTrip) {
    failures += 1
    console.error(`roundtrip failed: ${gy}-${gm}-${gd} -> ${j.jy}/${j.jm}/${j.jd} -> ${g.gy}-${g.gm}-${g.gd}`)
    if (failures > 5) break
    continue
  }

  const parts = fmt.formatToParts(d).reduce((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = Number(p.value)
    return acc
  }, {})

  if (parts.year !== j.jy || parts.month !== j.jm || parts.day !== j.jd) {
    failures += 1
    console.error(
      `intl mismatch: ${gy}-${gm}-${gd} ours=${j.jy}/${j.jm}/${j.jd} intl=${parts.year}/${parts.month}/${parts.day}`,
    )
    if (failures > 5) break
  }
}

for (let jy = 1330; jy <= 1450; jy += 1) {
  for (let jm = 1; jm <= 12; jm += 1) {
    const len = jalaaliMonthLength(jy, jm)
    const nextJm = jm === 12 ? 1 : jm + 1
    const nextJy = jm === 12 ? jy + 1 : jy
    const gStart = toGregorian(jy, jm, 1)
    const gNext = toGregorian(nextJy, nextJm, 1)
    const days =
      Math.round(
        (new Date(gNext.gy, gNext.gm - 1, gNext.gd) - new Date(gStart.gy, gStart.gm - 1, gStart.gd)) /
          86400000,
      )
    if (days !== len) {
      failures += 1
      console.error(`month length mismatch: ${jy}/${jm} claimed=${len} actual=${days}`)
    }
  }
}

if (failures === 0) {
  console.log(`OK: ${count} days verified against Intl persian calendar; month lengths verified 1330-1450.`)
} else {
  console.log(`FAILED with ${failures} errors.`)
  process.exit(1)
}
