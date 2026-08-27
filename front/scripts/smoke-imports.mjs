import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = join(process.cwd(), 'src', 'js')
const EXCLUDE = new Set(['main.js', 'app-main.js'])

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return walk(full)
    return full.endsWith('.js') ? [full] : []
  })
}

const files = walk(ROOT).filter((file) => !EXCLUDE.has(relative(ROOT, file).replaceAll('\\', '/')))

let failed = 0
for (const file of files) {
  try {
    await import(pathToFileURL(file).href)
  } catch (error) {
    failed += 1
    console.error(`IMPORT FAILED: ${relative(process.cwd(), file)}\n  ${error.message}`)
  }
}

if (failed === 0) {
  console.log(`OK: ${files.length} modules imported cleanly (browser-only entrypoints excluded).`)
} else {
  console.log(`FAILED: ${failed} module(s).`)
  process.exit(1)
}
