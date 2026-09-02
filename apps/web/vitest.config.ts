import { defineConfig } from 'vitest/config'

/**
 * First test runner in this repo (see docs/adr/0009-crypto-contract-v1.md
 * for why) — deliberately scoped to crypto primitives only. This project's
 * standing verification discipline everywhere else is `tsc`/`eslint`/
 * `next build` clean + a live pass with a throwaway account
 * (docs/AGENT_LOG.md), which is the right tool for API/UI behavior but the
 * wrong one for "does this reproduce an exact byte sequence" — that's what
 * fixed test vectors need, and what vitest is for here.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
