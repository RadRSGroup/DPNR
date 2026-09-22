#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib'
import { DataStack } from '../lib/data-stack'
import { AuthStack } from '../lib/auth-stack'
import { ApiStack } from '../lib/api-stack'

const app = new cdk.App()

// No "production" environment exists yet — see docs/AGENT_LOG.md. This
// flag exists so flipping it later doesn't require touching every stack.
const isProduction = app.node.tryGetContext('isProduction') === true

// Security review 2026-09-14 (DPNR-06) — see ApiStackProps.safetyAlertEmail's
// own doc comment for why this is context, not a hardcoded value.
const safetyAlertEmail = app.node.tryGetContext('safetyAlertEmail') as string | undefined

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
})
