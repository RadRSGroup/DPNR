#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib'
import { DataStack } from '../lib/data-stack'
import { AuthStack } from '../lib/auth-stack'
import { ApiStack } from '../lib/api-stack'

const app = new cdk.App()

// No "production" environment exists yet — see docs/AGENT_LOG.md. This
// flag exists so flipping it later doesn't require touching every stack.
const isProduction = app.node.tryGetContext('isProduction') === true

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
  userPool: authStack.userPool,
  userPoolClient: authStack.userPoolClient,
})
