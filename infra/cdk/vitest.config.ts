import { defineConfig } from 'vitest/config'

/**
 * Security review 2026-09-14 (DPNR-12) — this project's first backend
 * Lambda test suite; `infra/cdk` had zero committed tests of any kind
 * before this (every prior session's own verification was a throwaway,
 * uncommitted in-memory-DynamoDB-mock script, per docs/AGENT_LOG.md's own
 * convention — real, but reinvented and discarded every time). Same
 * "vitest scoped to one package" pattern apps/web already established
 * (apps/web/vitest.config.ts, ADR 0009) rather than a monorepo-wide
 * runner neither package asked for.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['lambda/**/*.test.ts'],
    // Every handler reads its table name(s) from process.env at MODULE
    // load time (`const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as
    // string`) — `test.env` sets these before any test file's static
    // imports evaluate, which a plain `process.env.X = ...` inside a test
    // file cannot reliably do (import hoisting runs before that line).
    env: {
      APPLICATION_TABLE_NAME: 'dpnr-application-test',
      SESSION_TICKETS_TABLE_NAME: 'dpnr-session-tickets-test',
      PROMPT_REGISTRY_TABLE_NAME: 'dpnr-prompt-registry-test',
    },
  },
})
