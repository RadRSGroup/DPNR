#!/usr/bin/env node
// Hebrew Localization Slice D (docs/HEBREW_LOCALIZATION_PLAN.md §7's "CI
// guard against silent partial translation"): diffs the key sets of
// messages/en.json and messages/he.json and fails if they don't match
// exactly. next-intl falls back silently to the raw key (or throws in dev,
// depending on config) on a missing message — a key present in one locale
// and not the other is exactly the kind of gap that ships unnoticed
// without an explicit check like this one.
//
// Unlike check-rtl-classes.mjs's debt ratchet, this has no baseline: every
// key must exist in both files, full stop, from the moment it's added —
// there's no equivalent of "pre-existing, fix it later" for a translation
// that's simply missing outright.
//
// Run: node scripts/check-i18n-parity.mjs

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MESSAGES_DIR = path.join(__dirname, '..', 'messages')

function flattenKeys(obj, prefix = '', out = new Set()) {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      flattenKeys(value, fullKey, out)
    } else {
      out.add(fullKey)
    }
  }
  return out
}

const en = JSON.parse(readFileSync(path.join(MESSAGES_DIR, 'en.json'), 'utf8'))
const he = JSON.parse(readFileSync(path.join(MESSAGES_DIR, 'he.json'), 'utf8'))

const enKeys = flattenKeys(en)
const heKeys = flattenKeys(he)

const missingInHe = [...enKeys].filter((k) => !heKeys.has(k)).sort()
const missingInEn = [...heKeys].filter((k) => !enKeys.has(k)).sort()

if (missingInHe.length === 0 && missingInEn.length === 0) {
  console.log(`i18n parity check passed: ${enKeys.size} keys, en.json and he.json match exactly.`)
  process.exit(0)
}

console.error('i18n parity check failed: messages/en.json and messages/he.json have different key sets.\n')
if (missingInHe.length > 0) {
  console.error(`Missing in he.json (${missingInHe.length}):`)
  for (const k of missingInHe) console.error(`  ${k}`)
}
if (missingInEn.length > 0) {
  console.error(`Missing in en.json (${missingInEn.length}):`)
  for (const k of missingInEn) console.error(`  ${k}`)
}
process.exit(1)
