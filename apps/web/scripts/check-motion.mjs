#!/usr/bin/env node
// Motion foundation (docs/MOTION.md): keeps animation on the shared,
// calm vocabulary in src/app/globals.css instead of one-off values. Same
// debt-ratchet shape as check-rtl-classes.mjs — existing uses are recorded
// in motion-baseline.json and may only go down; a file that adds a new one
// fails `npm run lint`.
//
// Flagged:
//   - stock Tailwind `animate-bounce` / `animate-ping` / `animate-pulse`
//     (bouncy or blinky — use `animate-soft-pulse` for "working on it")
//   - arbitrary animations/timings in classNames: `animate-[…]`,
//     `[animation…:…]`, `[transition…:…]`, raw `duration-<n>` / `duration-[…]`
//     (use `duration-(--motion-quick|calm|slow)`), and stock `ease-in/out/
//     in-out/linear` or `ease-[…]` (use `ease-settle` / `ease-breath`)
//   - inline `style` animation/transition properties in .tsx/.ts
//   - `@keyframes` anywhere except src/app/globals.css
// `animate-spin` stays allowed — a spinner is status, not decoration.
//
// Run: node scripts/check-motion.mjs
// Accept a new baseline (after removing debt, or a deliberate, explained
// exception): UPDATE_MOTION_BASELINE=1 node scripts/check-motion.mjs

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APP_ROOT = path.join(__dirname, '..')
const SRC_ROOT = path.join(APP_ROOT, 'src')
const BASELINE_PATH = path.join(__dirname, 'motion-baseline.json')
const GLOBALS_CSS = 'src/app/globals.css'

const CLASS_PATTERN =
  /(^|[\s"'`:])(animate-(?:bounce|ping|pulse)\b|animate-\[|\[(?:animation|transition)[a-z-]*:|duration-\d|duration-\[|ease-(?:in|out|in-out|linear)\b|ease-\[)/g

const CLASSNAME_VALUE_PATTERN = /className\s*=\s*(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\}|\{'([^']*)'\})/g

// Inline style keys (camelCase) like `transition:` or `animationDuration:`.
// Lines that are comments are skipped so prose doesn't count.
const INLINE_STYLE_PATTERN = /\b(?:animation|transition)(?:[A-Z][a-zA-Z]*)?\s*:/g

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next') continue
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(tsx|ts|css)$/.test(entry) && !entry.endsWith('.d.ts')) out.push(full)
  }
  return out
}

function relKey(filePath) {
  return path.relative(APP_ROOT, filePath).split(path.sep).join('/')
}

function isCommentLine(line) {
  const t = line.trim()
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')
}

function countViolations(filePath) {
  const text = readFileSync(filePath, 'utf8')
  const key = relKey(filePath)
  let total = 0

  if (filePath.endsWith('.css')) {
    if (key !== GLOBALS_CSS) total += (text.match(/@keyframes\b/g) ?? []).length
    return total
  }

  for (const m of text.matchAll(CLASSNAME_VALUE_PATTERN)) {
    const value = m[1] ?? m[2] ?? m[3] ?? m[4] ?? ''
    total += (value.match(CLASS_PATTERN) ?? []).length
  }
  for (const line of text.split('\n')) {
    if (isCommentLine(line)) continue
    total += (line.match(INLINE_STYLE_PATTERN) ?? []).length
    total += (line.match(/@keyframes\b/g) ?? []).length
  }
  return total
}

const current = {}
for (const f of walk(SRC_ROOT)) {
  const n = countViolations(f)
  if (n > 0) current[relKey(f)] = n
}

if (process.env.UPDATE_MOTION_BASELINE) {
  writeFileSync(BASELINE_PATH, JSON.stringify(current, null, 2) + '\n')
  console.log(`motion-baseline.json updated: ${Object.keys(current).length} files with off-vocabulary motion.`)
  process.exit(0)
}

const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
const regressions = Object.entries(current)
  .filter(([file, count]) => count > (baseline[file] ?? 0))
  .map(([file, count]) => `  ${file}: ${count} off-vocabulary motion uses (baseline: ${baseline[file] ?? 0})`)
const improved = Object.keys(baseline).filter((f) => (current[f] ?? 0) < baseline[f])

if (regressions.length > 0) {
  console.error('Motion check failed: new animation outside the shared vocabulary.\n')
  console.error(regressions.join('\n'))
  console.error(
    '\nUse the tokens in src/app/globals.css: animate-settle-in / animate-fade-in / animate-soft-pulse,' +
      '\nduration-(--motion-quick|calm|slow), ease-settle / ease-breath. New keyframes go in globals.css @theme.' +
      '\nSee docs/MOTION.md. For a deliberate exception, re-run with UPDATE_MOTION_BASELINE=1 and explain why in the commit.'
  )
  process.exit(1)
}

if (improved.length > 0) {
  console.log(`Motion check passed. ${improved.length} file(s) improved beyond baseline (UPDATE_MOTION_BASELINE=1 to tighten):`)
  for (const f of improved) console.log(`  ${f}: ${baseline[f]} -> ${current[f] ?? 0}`)
} else {
  console.log('Motion check passed: no new off-vocabulary motion beyond the tracked baseline.')
}
