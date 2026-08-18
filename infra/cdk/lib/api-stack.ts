import { Stack, StackProps } from 'aws-cdk-lib'
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2'
import * as authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers'
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs'
import { Runtime } from 'aws-cdk-lib/aws-lambda'
import { CfnOutput } from 'aws-cdk-lib'
import * as path from 'path'
import { Construct } from 'constructs'

export interface ApiStackProps extends StackProps {
  userPool: cognito.UserPool
  userPoolClient: cognito.UserPoolClient
  applicationTable: dynamodb.Table
  isProduction?: boolean
}

/**
 * `/v1` API Gateway (HTTP API, not REST API — cheaper, and its built-in
 * JWT authorizer is a direct match for "Cognito JWT authorizer" per
 * migration plan §3/§4.2, with no need for a custom Lambda authorizer).
 *
 * As of Session 5, the first real authenticated routes exist: Companion
 * (message + context) and Dashboard. Everything else in
 * MVP_ARCHITECTURE.md §4 (twin, rooms, library, credits, ...) gets added
 * as each is actually built — this stack's job is to only declare routes
 * with a real handler behind them, never to pre-declare the full surface.
 *
 * NOTE: the built-in HTTP API JWT authorizer validates the token
 * (signature, issuer, audience, expiry) but does not itself enforce the
 * `custom:consent` claim — HttpJwtAuthorizer has no claim-matching rules
 * beyond issuer/audience. Consent enforcement happens inside each
 * authenticated handler by reading `event.requestContext.authorizer.jwt.claims`,
 * per the "per-handler check completes the story" principle
 * (MVP_ARCHITECTURE.md §3, ADR 0004) — see lambda/lib/consent.ts, used by
 * the Companion message handler (not the read-only ones — see its doc
 * comment on why).
 *
 * All handlers below use lambda/lib/crypto-stub.ts for any `[ENCRYPTED]`
 * field — NOT real encryption yet, see that file's doc comment. `isProduction`
 * gates `PLAINTEXT_CRYPTO_STUB_ACK` off, so a real-data deploy fails loudly
 * instead of silently shipping plaintext.
 */
export class ApiStack extends Stack {
  public readonly httpApi: apigwv2.HttpApi
  /** Attach this to `authorizer:` on any authenticated route. */
  public readonly cognitoAuthorizer: authorizers.HttpJwtAuthorizer

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props)

    this.cognitoAuthorizer = new authorizers.HttpJwtAuthorizer(
      'CognitoAuthorizer',
      `https://cognito-idp.${this.region}.amazonaws.com/${props.userPool.userPoolId}`,
      { jwtAudience: [props.userPoolClient.userPoolClientId] }
    )

    this.httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
      apiName: 'dpnr-v1',
      description: 'DPNR /v1 API — see MVP_ARCHITECTURE.md §4 for the full planned surface.',
    })

    const healthFn = new lambda.NodejsFunction(this, 'HealthFn', {
      runtime: Runtime.NODEJS_24_X,
      entry: path.join(__dirname, '../lambda/health/handler.ts'),
      bundling: { minify: true, sourceMap: true },
      description: 'Unauthenticated GET /v1/health — proves the API Gateway wiring works.',
    })

    this.httpApi.addRoutes({
      path: '/v1/health',
      methods: [apigwv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('HealthIntegration', healthFn),
      // deliberately no authorizer — this route exists to prove the pipe
      // works even before Cognito is set up correctly end to end.
    })

    const sharedProductLambdaProps = {
      runtime: Runtime.NODEJS_24_X,
      bundling: { minify: true, sourceMap: true },
      environment: {
        APPLICATION_TABLE_NAME: props.applicationTable.tableName,
        // See lambda/lib/crypto-stub.ts — deliberately 'false' in production
        // so a real deploy fails loudly instead of silently storing plaintext.
        PLAINTEXT_CRYPTO_STUB_ACK: props.isProduction ? 'false' : 'true',
      },
    }

    const dashboardFn = new lambda.NodejsFunction(this, 'DashboardFn', {
      ...sharedProductLambdaProps,
      entry: path.join(__dirname, '../lambda/dashboard/handler.ts'),
      description: 'GET /v1/dashboard — aggregate read (roadmap + credits + continuity cue).',
    })
    props.applicationTable.grantReadData(dashboardFn)

    const companionMessageFn = new lambda.NodejsFunction(this, 'CompanionMessageFn', {
      ...sharedProductLambdaProps,
      entry: path.join(__dirname, '../lambda/companion/message.ts'),
      description: 'POST /v1/companion/message — chat turn + (stubbed) model call.',
    })
    props.applicationTable.grantReadWriteData(companionMessageFn)

    const companionContextFn = new lambda.NodejsFunction(this, 'CompanionContextFn', {
      ...sharedProductLambdaProps,
      entry: path.join(__dirname, '../lambda/companion/context.ts'),
      description: 'GET /v1/companion/context — recent turns for resuming a chat.',
    })
    props.applicationTable.grantReadData(companionContextFn)

    this.httpApi.addRoutes({
      path: '/v1/dashboard',
      methods: [apigwv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('DashboardIntegration', dashboardFn),
      authorizer: this.cognitoAuthorizer,
    })

    this.httpApi.addRoutes({
      path: '/v1/companion/message',
      methods: [apigwv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('CompanionMessageIntegration', companionMessageFn),
      authorizer: this.cognitoAuthorizer,
    })

    this.httpApi.addRoutes({
      path: '/v1/companion/context',
      methods: [apigwv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('CompanionContextIntegration', companionContextFn),
      authorizer: this.cognitoAuthorizer,
    })

    new CfnOutput(this, 'ApiUrl', { value: this.httpApi.apiEndpoint })
  }
}
