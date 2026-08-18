import { Stack, StackProps } from 'aws-cdk-lib'
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2'
import * as authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers'
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs'
import { Runtime } from 'aws-cdk-lib/aws-lambda'
import { CfnOutput } from 'aws-cdk-lib'
import * as path from 'path'
import { Construct } from 'constructs'

export interface ApiStackProps extends StackProps {
  userPool: cognito.UserPool
  userPoolClient: cognito.UserPoolClient
}

/**
 * `/v1` API Gateway (HTTP API, not REST API — cheaper, and its built-in
 * JWT authorizer is a direct match for "Cognito JWT authorizer" per
 * migration plan §3/§4.2, with no need for a custom Lambda authorizer).
 *
 * Phase 0 scope: only the unauthenticated health route. Everything else
 * in MVP_ARCHITECTURE.md §4 (companion, dashboard, twin, rooms, library,
 * credits, ...) gets added as each is actually built — this stack exists
 * to prove the Cognito → API Gateway wiring works end to end, not to
 * pre-declare routes with no handlers behind them.
 *
 * NOTE: the built-in HTTP API JWT authorizer validates the token
 * (signature, issuer, audience, expiry) but does not itself enforce the
 * `custom:consent` claim — HttpJwtAuthorizer has no claim-matching rules
 * beyond issuer/audience. Consent enforcement happens inside each
 * authenticated handler by reading `event.requestContext.authorizer.jwt.claims`,
 * per the "per-handler check completes the story" principle
 * (MVP_ARCHITECTURE.md §3, ADR 0004) — do not assume adding a route here
 * is sufficient without that check once real handlers exist.
 */
export class ApiStack extends Stack {
  public readonly httpApi: apigwv2.HttpApi
  /** Attach this to `authorizer:` on the first real authenticated route — see the class doc comment above. */
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

    new CfnOutput(this, 'ApiUrl', { value: this.httpApi.apiEndpoint })
  }
}
