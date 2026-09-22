#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib'
import { DataStack } from '../lib/data-stack'
import { AuthStack } from '../lib/auth-stack'
import { ApiStack } from '../lib/api-stack'
import { LambdaObservabilityAspect } from '../lib/lambda-observability-aspect'

const app = new cdk.App()

// No "production" environment exists yet — see docs/AGENT_LOG.md.
//
// Security review 2026-09-14 (DPNR-11) — this used to be `app.node.
// tryGetContext('isProduction') === true`, which silently resolves to
// `false` (DESTROY removal policies, sandbox Grow payment URL, no
// deletion protection) for ANY invocation that forgets to pass the flag —
// including a real production `cdk deploy` run against this same single
// AWS account. Making the flag a required, explicit choice turns "someone
// forgot" into a synth-time failure instead of a silent wrong-direction
// default. `npm run synth`/`diff`/`deploy` (infra/cdk/package.json) default
// this to `false` for routine dev use; a deploy against real user data
// needs `--context isProduction=true` explicitly appended, every time —
// it is deliberately not persisted as a `cdk.json` default, since that
// would just move the same silent-default risk one file over.
// A real, separate bug found while building this check, not hypothetical:
// the CDK CLI always parses `--context key=value` as a STRING ("true"/
// "false"), never a real boolean, no matter what the value looks like —
// confirmed live (`cdk synth --context isProduction=true` prints the
// string "true" back via `cdk context`). The old `=== true` comparison
// this file used to have could therefore NEVER have been satisfied by a
// CLI-passed flag, only by a real `true` literal in `cdk.json`'s own
// `context` block (which this project never set) — meaning `--context
// isProduction=true` would have silently done nothing, every single time,
// for this project's entire history. Confirmed via docs/AGENT_LOG.md that
// this was never actually exercised (isProduction has never been flipped
// at deploy time), so this was a live but never-yet-triggered bug, not a
// past incident. Accepting both the real boolean (a `cdk.json` value) and
// the string (a CLI flag) here closes it properly instead of just moving
// the same mistake into the new required-context check.
const isProductionContext = app.node.tryGetContext('isProduction')
if (isProductionContext !== true && isProductionContext !== false && isProductionContext !== 'true' && isProductionContext !== 'false') {
  throw new Error(
    "Missing required CDK context 'isProduction'. Pass --context isProduction=false for a routine dev " +
      'deploy, or --context isProduction=true once this account is deploying against real user data. ' +
      'See docs/SECURITY_REVIEW_RESPONSE_2026-09-18.md S10 (DPNR-11) and docs/AGENT_LOG.md for why this ' +
      'is no longer an optional flag that quietly defaults to false.'
  )
}
const isProduction = isProductionContext === true || isProductionContext === 'true'

// Security review 2026-09-14 (DPNR-06) — see ApiStackProps.safetyAlertEmail's
// own doc comment for why this is context, not a hardcoded value.
const safetyAlertEmail = app.node.tryGetContext('safetyAlertEmail') as string | undefined

// Security review 2026-09-14 (DPNR-11) — same pattern as safetyAlertEmail,
// for the new 4xx/5xx/safety-fail-open/cost operational alarms below,
// deliberately a separate topic/subscriber from the crisis-response one.
const opsAlertEmail = app.node.tryGetContext('opsAlertEmail') as string | undefined

// Security review 2026-09-14 (DPNR-11) — applies X-Ray tracing + bounded
// CloudWatch log retention to every Lambda across every stack below, see
// lib/lambda-observability-aspect.ts's own doc comment for why this is an
// Aspect rather than a per-function prop.
cdk.Aspects.of(app).add(new LambdaObservabilityAspect())

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
}

const dataStack = new DataStack(app, 'Dpnr-Data', { env, isProduction })

const authStack = new AuthStack(app, 'Dpnr-Auth', {
  env,
  isProduction,
  applicationTable: dataStack.applicationTable,
})

new ApiStack(app, 'Dpnr-Api', {
  env,
  isProduction,
  userPool: authStack.userPool,
  userPoolClient: authStack.userPoolClient,
  applicationTable: dataStack.applicationTable,
  promptRegistryTable: dataStack.promptRegistryTable,
  libraryCatalogTable: dataStack.libraryCatalogTable,
  plansCatalogTable: dataStack.plansCatalogTable,
  sessionTicketsTable: dataStack.sessionTicketsTable,
  sessionTicketsKmsKey: dataStack.sessionTicketsKmsKey,
  avatarsBucket: dataStack.avatarsBucket,
  safetyAlertEmail,
  opsAlertEmail,
})
