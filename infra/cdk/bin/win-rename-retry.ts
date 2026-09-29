import { createRequire } from 'node:module'

/**
 * Windows-only fix for the recurring deploy failure
 *   «FailedToBundleAsset» … EPERM: operation not permitted, rename
 *   'cdk.out\bundling-temp-<hash>-building' -> 'cdk.out\bundling-temp-<hash>'
 *
 * aws-cdk-lib's AssetStaging bundles each Lambda into a `-building` folder and
 * then calls fs-extra's synchronous `renameSync`. On Windows that rename fails
 * while anything still holds a just-written file open — usually Defender or
 * the search indexer scanning `index.js.map` — even though the lock clears a
 * moment later. graceful-fs (which fs-extra wraps) retries the async `rename`
 * on Windows, but not `renameSync`, so one busy file killed the whole deploy
 * and the only remedy was re-running it (docs/AGENT_LOG.md, Sessions 74–82).
 *
 * This retries `renameSync` on EPERM/EACCES/EBUSY with a short backoff, up to
 * ~15 s, then rethrows the original error. It patches both Node's `fs` and the
 * exact fs-extra instance aws-cdk-lib resolves. No-op on other platforms.
 * Imported first in bin/dpnr.ts, before any stack is built.
 */
const RETRYABLE = new Set(['EPERM', 'EACCES', 'EBUSY'])
const MAX_WAIT_MS = 15_000

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

type RenameSync = (oldPath: string, newPath: string) => void

function withRetry(original: RenameSync): RenameSync {
  const patched: RenameSync = (oldPath, newPath) => {
    const start = Date.now()
    let delay = 50
    for (;;) {
      try {
        return original(oldPath, newPath)
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code
        if (!code || !RETRYABLE.has(code) || Date.now() - start > MAX_WAIT_MS) throw err
        sleepSync(delay)
        delay = Math.min(delay * 2, 1000)
      }
    }
  }
  ;(patched as { __dpnrRenameRetry?: true }).__dpnrRenameRetry = true
  return patched
}

function patch(mod: { renameSync?: RenameSync } | undefined): void {
  if (!mod?.renameSync || (mod.renameSync as { __dpnrRenameRetry?: true }).__dpnrRenameRetry) return
  mod.renameSync = withRetry(mod.renameSync.bind(mod))
}

if (process.platform === 'win32') {
  const req = createRequire(__filename)
  patch(req('fs'))
  try {
    // The fs-extra copy aws-cdk-lib itself loads (it may be nested under aws-cdk-lib).
    patch(createRequire(req.resolve('aws-cdk-lib'))('fs-extra'))
  } catch {
    // aws-cdk-lib moved off fs-extra: the Node fs patch above still applies.
  }
}
