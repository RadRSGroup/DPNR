#!/usr/bin/env node
// Hebrew Localization Slice C (docs/HEBREW_LOCALIZATION_PLAN.md §5/§8): a
// debt-ratchet check, not a full-repo ban. Tailwind's *physical* directional
// utilities (pl-/pr-/ml-/mr-/left-/right-/text-left/text-right/border-l-/
// border-r-/rounded-{t,b}{l,r}-/float-left/float-right) don't flip under
// dir="rtl" the way their logical equivalents (ps-/pe-/ms-/me-/start-/end-/
// text-start/text-end/border-s-/border-e-/rounded-{s,e}-*) do. Slice C only
// migrated the app shell (components/layout, components/shared, components/
// ui, the two [locale] layout.tsx files) — most page-level screens still use
// physical classes and that's expected, fixed slice-by-slice as each screen
// gets touched (per the plan's own "don't attempt this as one pass"
// discipline). So this script doesn't fail on existing debt; it fails only
// if a file's physical-class count goes UP relative to the checked-in
// baseline, or a brand-new file introduces any with no baseline entry —
// "don't let it silently regrow," not "fix everything today."
//
// Run: node scripts/check-rtl-classes.mjs
// To accept a deliberate new baseline (e.g. after migrating a file, or a
// legitimate new physical-direction use — rare, e.g. a fixed-corner badge
// that should stay put in either language): re-run with UPDATE_RTL_BASELINE=1.

import { readFileSync, writeFileSync } from 'node:fs'
import { readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC_ROOT = path.join(__dirname, '..', 'src')
const BASELINE_PATH = path.join(__dirname, 'rtl-baseline.json')

// One token per physical-direction utility family, matched as a class-name
// boundary (start of string, whitespace, or the opening quote/backtick that
// precedes a className value) so we don't false-positive on unrelated
// tokens (e.g. "leftover", a CSS var name, or `border-l` matching inside a
// longer unrelated word).
const PHYSICAL_PATTERN =
  /(^|[\s"'`])(pl-|pr-|ml-|mr-|left-|right-|text-left\b|text-right\b|border-l-|border-r-|border-l\b|border-r\b|rounded-tl-|rounded-tr-|rounded-bl-|rounded-br-|rounded-l-|rounded-r-|float-left\b|float-right\b|clear-left\b|clear-right\b)/g

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next') continue
    const full = path.join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      walk(full, out)
    } else if (/\.(tsx|ts)$/.test(entry) && !entry.endsWith('.d.ts')) {
      out.push(full)
    }
  }
  return out
}

// Only scan actual className values, not prose (comments/strings elsewhere
// in the file can legitimately contain words like "left-to-right").
// Covers className="...", className={'...'}, and className={`...`}
// (including template literals with ${...} interpolation — the interpolated
// JS itself is very unlikely to accidentally contain one of our tokens).
const CLASSNAME_VALUE_PATTERN = /className\s*=\s*(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\}|\{'([^']*)'\})/g

function countViolations(filePath) {
  const text = readFileSync(filePath, 'utf8')
  let total = 0
  for (const m of text.matchAll(CLASSNAME_VALUE_PATTERN)) {
    const value = m[1] ?? m[2] ?? m[3] ?? m[4] ?? ''
    const hits = value.match(PHYSICAL_PATTERN)
    if (hits) total += hits.length
  }
  return total
}

function relKey(filePath) {
  return path.relative(path.join(__dirname, '..'), filePath).split(path.sep).join('/')
}

const files = walk(SRC_ROOT)
const current = {}
for (const f of files) {
  const n = countViolations(f)
  if (n > 0) current[relKey(f)] = n
}

if (process.env.UPDATE_RTL_BASELINE) {
  writeFileSync(BASELINE_PATH, JSON.stringify(current, null, 2) + '\n')
  console.log(`rtl-baseline.json updated: ${Object.keys(current).length} files with physical-direction classes.`)
  process.exit(0)
}

const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))

let hasRegression = false
const regressions = []
for (const [file, count] of Object.entries(current)) {
  const baselineCount = baseline[file] ?? 0
  if (count > baselineCount) {
    hasRegression = true
    regressions.push(`  ${file}: ${count} physical-direction classes (baseline: ${baselineCount})`)
  }
}

const improved = Object.keys(baseline).filter((f) => (current[f] ?? 0) < baseline[f])

if (hasRegression) {
  console.error('RTL check failed: new physical-direction Tailwind classes found beyond the tracked baseline.\n')
  console.error(regressions.join('\n'))
  console.error(
    '\nUse logical equivalents instead (ps-/pe-, ms-/me-, start-/end-, text-start/text-end, border-s-/border-e-, rounded-s-*/rounded-e-*).' +
      '\nSee docs/HEBREW_LOCALIZATION_PLAN.md §5. If this addition is deliberate (rare — e.g. a fixed-corner element that should not' +
      '\nmirror in RTL), re-run with UPDATE_RTL_BASELINE=1 and explain why in the commit.'
  )
  process.exit(1)
}

if (improved.length > 0) {
  console.log(
    `RTL check passed. ${improved.length} file(s) improved beyond baseline (run with UPDATE_RTL_BASELINE=1 to tighten it):`
  )
  for (const f of improved) console.log(`  ${f}: ${baseline[f]} -> ${current[f] ?? 0}`)
} else {
  console.log('RTL check passed: no new physical-direction classes beyond the tracked baseline.')
}
