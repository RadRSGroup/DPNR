import { Stack, StackProps, Duration } from 'aws-cdk-lib'
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2'
import * as authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers'
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs'
import { Runtime } from 'aws-cdk-lib/aws-lambda'
import * as events from 'aws-cdk-lib/aws-events'
import * as targets from 'aws-cdk-lib/aws-events-targets'
import * as sns from 'aws-cdk-lib/aws-sns'
import { CfnOutput } from 'aws-cdk-lib'
import * as path from 'path'
import { Construct } from 'constructs'

/**
 * The one Bedrock model every seeded Prompt Registry entry currently uses
 * (infra/cdk/scripts/seed-prompt-registry.ts) — a real, on-demand-invokable
 * inference-profile id, confirmed via a live `converse` call in Session 6
 * part 3 (docs/AGENT_LOG.md). If a future prompt is seeded against a
 * different model, extend the resources below rather than widening them
 * to a blanket wildcard.
 */
const BEDROCK_INFERENCE_PROFILE_ID = 'us.anthropic.claude-sonnet-4-5-20250929-v1:0'
const BEDROCK_FOUNDATION_MODEL_ID = 'anthropic.claude-sonnet-4-5-20250929-v1:0'
/** The `us.` prefix is a cross-region inference profile spanning these three regions — Bedrock requires the underlying foundation-model ARNs be authorized too, not just the profile ARN itself. */
const BEDROCK_INFERENCE_PROFILE_REGIONS = ['us-east-1', 'us-east-2', 'us-west-2']

export interface ApiStackProps extends StackProps {
  userPool: cognito.UserPool
  userPoolClient: cognito.UserPoolClient
  applicationTable: dynamodb.Table
  promptRegistryTable: dynamodb.Table
  libraryCatalogTable: dynamodb.Table
  plansCatalogTable: dynamodb.Table
  isProduction?: boolean
}

/**
 * `/v1` API Gateway (HTTP API, not REST API — cheaper, and its built-in
 * JWT authorizer is a direct match for "Cognito JWT authorizer" per
 * migration plan §3/§4.2, with no need for a custom Lambda authorizer).
 *
 * As of Session 5, the first real authenticated routes exist: Companion
 * (message + context), Dashboard, and the Rooms flow-engine (Decision
 * Room's command endpoint + full read — Mirror Room shares the same
 * command Lambda's step-map mechanism but has no registered flow
 * definition yet, see lambda/rooms/command.ts). Everything else in
 * MVP_ARCHITECTURE.md §4 (twin, library, credits, ...) gets added as each
 * is actually built — this stack's job is to only declare routes with a
 * real handler behind them, never to pre-declare the full surface.
 *
 * NOTE: the built-in HTTP API JWT authorizer validates the token
 * (signature, issuer, audience, expiry) but does not itself enforce the
 * `custom:consent` claim — HttpJwtAuthorizer has no claim-matching rules
 * beyond issuer/audience. Consent enforcement happens inside each
 * authenticated handler by reading `event.requestContext.authorizer.jwt.claims`,
 * per the "per-handler check completes the story" principle
 * (MVP_ARCHITECTURE.md §3, ADR 0004) — see lambda/lib/consent.ts, used by
 * the Companion message handler and the Rooms command handler (not the
 * read-only ones — see consent.ts's own doc comment on why). `UserConsentFn`
 * below is the write path that actually satisfies the gate — until it
 * existed, no code path could ever set `PROFILE.consentedAt` on the new
 * backend, so every consent-gated handler 403'd unconditionally for any
 * real signup (docs/PHASE_AUDIT.md §2.2/§4.1/§4.2).
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
      // apps/web calls this API directly from the browser (a different
      // origin), which needs a real CORS preflight response — found the
      // hard way during Session 7's alignment-work verification (the
      // consent endpoint 100% worked server-side but every browser call
      // was silently blocked pre-flight). localhost:3000 is dev-only;
      // add the real deployed frontend origin here once one exists.
      corsPreflight: {
        allowOrigins: ['http://localhost:3000'],
        allowMethods: [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.PUT,
          apigwv2.CorsHttpMethod.DELETE,
        ],
        allowHeaders: ['authorization', 'content-type'],
      },
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

    /**
     * Grants a Lambda permission to call Bedrock Converse for the one model
     * every Prompt Registry entry is seeded against — used by any function
     * that calls lib/model-call.ts (currently roomsCommandFn and
     * libraryTopicDetailFn). Both the inference-profile ARN and the
     * underlying foundation-model ARNs (across the profile's regions) need
     * authorizing — Bedrock evaluates IAM against the actual invoked
     * resource, which for a cross-region inference profile can be either.
     */
    const grantBedrockConverse = (fn: lambda.NodejsFunction) => {
      fn.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
          resources: [
            `arn:aws:bedrock:${this.region}:${this.account}:inference-profile/${BEDROCK_INFERENCE_PROFILE_ID}`,
            ...BEDROCK_INFERENCE_PROFILE_REGIONS.map(
              (region) => `arn:aws:bedrock:${region}::foundation-model/${BEDROCK_FOUNDATION_MODEL_ID}`
            ),
          ],
        })
      )
    }

    // Every product Lambda defaults to the Lambda-wide 3s timeout unless
    // overridden — fine for pure DynamoDB reads/writes, but a real Bedrock
    // Converse call will not complete in 3s. 29s stays under the HTTP API
    // integration's own ~30s ceiling so a slow model call surfaces as a
    // real Lambda timeout, not a swallowed Gateway timeout.
    const bedrockCallTimeout = Duration.seconds(29)

    // Safety alert topic (Session 29, ADR 0012 decision #3) — a live alert
    // on a real `immediate_danger` detection, since there is no other
    // crisis-response backstop during the current founder-only internal-
    // testing phase (ADR 0007). Deliberately NO email subscription declared
    // here, matching the AWS Budgets alert precedent (Session 4): a real
    // person's email address isn't committed into version-controlled
    // infrastructure code. Subscribe an address post-deploy via
    // `aws sns subscribe --topic-arn <this topic's ARN> --protocol email
    // --notification-endpoint <address>` (confirmation email required
    // before it activates) — see docs/AGENT_LOG.md Session 29 for the
    // exact command once run.
    const safetyAlertTopic = new sns.Topic(this, 'SafetyAlertTopic', {
      topicName: 'dpnr-safety-alerts',
      displayName: 'DPNR safety alerts',
    })

    const dashboardFn = new lambda.NodejsFunction(this, 'DashboardFn', {
      ...sharedProductLambdaProps,
      entry: path.join(__dirname, '../lambda/dashboard/handler.ts'),
      description: 'GET /v1/dashboard — aggregate read (roadmap + credits + continuity cue).',
    })
    props.applicationTable.grantReadData(dashboardFn)

    const companionMessageFn = new lambda.NodejsFunction(this, 'CompanionMessageFn', {
      ...sharedProductLambdaProps,
      timeout: bedrockCallTimeout,
      entry: path.join(__dirname, '../lambda/companion/message.ts'),
      environment: {
        ...sharedProductLambdaProps.environment,
        PROMPT_REGISTRY_TABLE_NAME: props.promptRegistryTable.tableName,
        LIBRARY_CATALOG_TABLE_NAME: props.libraryCatalogTable.tableName,
        SAFETY_ALERT_TOPIC_ARN: safetyAlertTopic.topicArn,
      },
      description: 'POST /v1/companion/message — chat turn + real Bedrock call with topic-routing directive.',
    })
    props.applicationTable.grantReadWriteData(companionMessageFn)
    props.promptRegistryTable.grantReadData(companionMessageFn)
    props.libraryCatalogTable.grantReadData(companionMessageFn)
    grantBedrockConverse(companionMessageFn)
    safetyAlertTopic.grantPublish(companionMessageFn)

    const companionContextFn = new lambda.NodejsFunction(this, 'CompanionContextFn', {
      ...sharedProductLambdaProps,
      // Session 14: this now sometimes calls Bedrock (a synthesized
      // "welcome back" opener, see context.ts's CONTINUATION_GAP_HOURS) and
      // writes the result back — same timeout/env/grant shape as
      // companionMessageFn above, not a pure read anymore.
      timeout: bedrockCallTimeout,
      entry: path.join(__dirname, '../lambda/companion/context.ts'),
      environment: {
        ...sharedProductLambdaProps.environment,
        PROMPT_REGISTRY_TABLE_NAME: props.promptRegistryTable.tableName,
      },
      description: 'GET /v1/companion/context — recent turns for resuming a chat; may synthesize a real continuation.',
    })
    props.applicationTable.grantReadWriteData(companionContextFn)
    props.promptRegistryTable.grantReadData(companionContextFn)
    grantBedrockConverse(companionContextFn)

    const userConsentFn = new lambda.NodejsFunction(this, 'UserConsentFn', {
      ...sharedProductLambdaProps,
      entry: path.join(__dirname, '../lambda/account/consent.ts'),
      description: 'POST /v1/user/consent — grants consent on the PROFILE item (the write path the consent gate needs).',
    })
    props.applicationTable.grantReadWriteData(userConsentFn)

    const userExportFn = new lambda.NodejsFunction(this, 'UserExportFn', {
      ...sharedProductLambdaProps,
      entry: path.join(__dirname, '../lambda/account/export.ts'),
      description: 'GET /v1/user/export — GDPR data export, the whole USER#<id> partition decrypted.',
    })
    props.applicationTable.grantReadData(userExportFn)

    const accountDeleteFn = new lambda.NodejsFunction(this, 'AccountDeleteFn', {
      ...sharedProductLambdaProps,
      entry: path.join(__dirname, '../lambda/account/delete.ts'),
      description: 'DELETE /v1/account — deletes the whole USER#<id> partition (Cognito identity deleted client-side, see delete.ts).',
    })
    props.applicationTable.grantReadWriteData(accountDeleteFn)

    const twinListFn = new lambda.NodejsFunction(this, 'TwinListFn', {
      ...sharedProductLambdaProps,
      entry: path.join(__dirname, '../lambda/twin/list.ts'),
      description: 'GET /v1/twin — every Digital Twin signal the caller has, any status.',
    })
    props.applicationTable.grantReadData(twinListFn)

    const twinConfirmFn = new lambda.NodejsFunction(this, 'TwinConfirmFn', {
      ...sharedProductLambdaProps,
      // Bumped from the plain shared props (Session 16) — confirming a
      // signal now also runs the Roadmap-revision check inline
      // (lib/roadmap-revision.ts), which may call Bedrock, same "compute
      // after the triggering action" choice already made for Twin
      // extraction itself.
      timeout: bedrockCallTimeout,
      environment: {
        ...sharedProductLambdaProps.environment,
        PROMPT_REGISTRY_TABLE_NAME: props.promptRegistryTable.tableName,
      },
      entry: path.join(__dirname, '../lambda/twin/confirm.ts'),
      description: 'POST /v1/twin/signals/{id}/confirm — also runs the Roadmap-revision check.',
    })
    props.applicationTable.grantReadWriteData(twinConfirmFn)
    props.promptRegistryTable.grantReadData(twinConfirmFn)
    grantBedrockConverse(twinConfirmFn)

    const twinRejectFn = new lambda.NodejsFunction(this, 'TwinRejectFn', {
      ...sharedProductLambdaProps,
      entry: path.join(__dirname, '../lambda/twin/reject.ts'),
      description: 'POST /v1/twin/signals/{id}/reject.',
    })
    props.applicationTable.grantReadWriteData(twinRejectFn)

    const roadmapProposalAcceptFn = new lambda.NodejsFunction(this, 'RoadmapProposalAcceptFn', {
      ...sharedProductLambdaProps,
      entry: path.join(__dirname, '../lambda/roadmap/accept.ts'),
      description: 'POST /v1/roadmap/proposal/accept — a pending Roadmap revision becomes the live Roadmap.',
    })
    props.applicationTable.grantReadWriteData(roadmapProposalAcceptFn)

    const roadmapProposalRejectFn = new lambda.NodejsFunction(this, 'RoadmapProposalRejectFn', {
      ...sharedProductLambdaProps,
      entry: path.join(__dirname, '../lambda/roadmap/reject.ts'),
      description: 'POST /v1/roadmap/proposal/reject — discards a pending Roadmap revision.',
    })
    props.applicationTable.grantReadWriteData(roadmapProposalRejectFn)

    this.httpApi.addRoutes({
      path: '/v1/dashboard',
      methods: [apigwv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('DashboardIntegration', dashboardFn),
      authorizer: this.cognitoAuthorizer,
    })

    this.httpApi.addRoutes({
      path: '/v1/user/consent',
      methods: [apigwv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('UserConsentIntegration', userConsentFn),
      authorizer: this.cognitoAuthorizer,
    })

    this.httpApi.addRoutes({
      path: '/v1/user/export',
      methods: [apigwv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('UserExportIntegration', userExportFn),
      authorizer: this.cognitoAuthorizer,
    })

    this.httpApi.addRoutes({
      path: '/v1/account',
      methods: [apigwv2.HttpMethod.DELETE],
      integration: new integrations.HttpLambdaIntegration('AccountDeleteIntegration', accountDeleteFn),
      authorizer: this.cognitoAuthorizer,
    })

    this.httpApi.addRoutes({
      path: '/v1/twin',
      methods: [apigwv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('TwinListIntegration', twinListFn),
      authorizer: this.cognitoAuthorizer,
    })

    this.httpApi.addRoutes({
      path: '/v1/twin/signals/{id}/confirm',
      methods: [apigwv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('TwinConfirmIntegration', twinConfirmFn),
      authorizer: this.cognitoAuthorizer,
    })

    this.httpApi.addRoutes({
      path: '/v1/twin/signals/{id}/reject',
      methods: [apigwv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('TwinRejectIntegration', twinRejectFn),
      authorizer: this.cognitoAuthorizer,
    })

    this.httpApi.addRoutes({
      path: '/v1/roadmap/proposal/accept',
      methods: [apigwv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('RoadmapProposalAcceptIntegration', roadmapProposalAcceptFn),
      authorizer: this.cognitoAuthorizer,
    })

    this.httpApi.addRoutes({
      path: '/v1/roadmap/proposal/reject',
      methods: [apigwv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('RoadmapProposalRejectIntegration', roadmapProposalRejectFn),
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

    const roomsCommandFn = new lambda.NodejsFunction(this, 'RoomsCommandFn', {
      ...sharedProductLambdaProps,
      timeout: bedrockCallTimeout,
      entry: path.join(__dirname, '../lambda/rooms/command.ts'),
      environment: {
        ...sharedProductLambdaProps.environment,
        PROMPT_REGISTRY_TABLE_NAME: props.promptRegistryTable.tableName,
        SAFETY_ALERT_TOPIC_ARN: safetyAlertTopic.topicArn,
      },
      description: 'POST /v1/rooms/{decision,mirror} — flow-engine command endpoint (one Lambda, dispatches on flowId).',
    })
    props.applicationTable.grantReadWriteData(roomsCommandFn)
    props.promptRegistryTable.grantReadData(roomsCommandFn)
    grantBedrockConverse(roomsCommandFn)
    safetyAlertTopic.grantPublish(roomsCommandFn)

    const decisionFullFn = new lambda.NodejsFunction(this, 'DecisionFullFn', {
      ...sharedProductLambdaProps,
      entry: path.join(__dirname, '../lambda/rooms/decision-full.ts'),
      description: 'GET /v1/rooms/decision/{id}/full — aggregate decrypted read of one decision.',
    })
    props.applicationTable.grantReadData(decisionFullFn)

    const mirrorFullFn = new lambda.NodejsFunction(this, 'MirrorFullFn', {
      ...sharedProductLambdaProps,
      entry: path.join(__dirname, '../lambda/rooms/mirror-full.ts'),
      description: 'GET /v1/rooms/mirror/{id}/full — decrypted read of one Mirror Room session.',
    })
    props.applicationTable.grantReadData(mirrorFullFn)

    const listDecisionsFn = new lambda.NodejsFunction(this, 'ListDecisionsFn', {
      ...sharedProductLambdaProps,
      entry: path.join(__dirname, '../lambda/rooms/list-decisions.ts'),
      description: 'GET /v1/rooms/decisions — summary list, most-recently-created first.',
    })
    props.applicationTable.grantReadData(listDecisionsFn)

    const listMirrorsFn = new lambda.NodejsFunction(this, 'ListMirrorsFn', {
      ...sharedProductLambdaProps,
      entry: path.join(__dirname, '../lambda/rooms/list-mirrors.ts'),
      description: 'GET /v1/rooms/mirrors — summary list, most-recently-created first.',
    })
    props.applicationTable.grantReadData(listMirrorsFn)

    this.httpApi.addRoutes({
      path: '/v1/rooms/decision',
      methods: [apigwv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('RoomsCommandIntegration', roomsCommandFn),
      authorizer: this.cognitoAuthorizer,
    })

    // Same Lambda as above (roomsCommandFn) — one flow-engine function,
    // two routes, dispatch is on `flowId` in the request body, not the URL.
    this.httpApi.addRoutes({
      path: '/v1/rooms/mirror',
      methods: [apigwv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('MirrorRoomsCommandIntegration', roomsCommandFn),
      authorizer: this.cognitoAuthorizer,
    })

    this.httpApi.addRoutes({
      path: '/v1/rooms/decision/{id}/full',
      methods: [apigwv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('DecisionFullIntegration', decisionFullFn),
      authorizer: this.cognitoAuthorizer,
    })

    this.httpApi.addRoutes({
      path: '/v1/rooms/mirror/{id}/full',
      methods: [apigwv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('MirrorFullIntegration', mirrorFullFn),
      authorizer: this.cognitoAuthorizer,
    })

    this.httpApi.addRoutes({
      path: '/v1/rooms/decisions',
      methods: [apigwv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('ListDecisionsIntegration', listDecisionsFn),
      authorizer: this.cognitoAuthorizer,
    })

    this.httpApi.addRoutes({
      path: '/v1/rooms/mirrors',
      methods: [apigwv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('ListMirrorsIntegration', listMirrorsFn),
      authorizer: this.cognitoAuthorizer,
    })

    const libraryTopicsFn = new lambda.NodejsFunction(this, 'LibraryTopicsFn', {
      runtime: Runtime.NODEJS_24_X,
      bundling: { minify: true, sourceMap: true },
      environment: { LIBRARY_CATALOG_TABLE_NAME: props.libraryCatalogTable.tableName },
      entry: path.join(__dirname, '../lambda/library/topics.ts'),
      description: 'GET /v1/library/topics — public catalog listing.',
    })
    props.libraryCatalogTable.grantReadData(libraryTopicsFn)

    const libraryTopicDetailFn = new lambda.NodejsFunction(this, 'LibraryTopicDetailFn', {
      runtime: Runtime.NODEJS_24_X,
      bundling: { minify: true, sourceMap: true },
      timeout: bedrockCallTimeout,
      environment: {
        LIBRARY_CATALOG_TABLE_NAME: props.libraryCatalogTable.tableName,
        APPLICATION_TABLE_NAME: props.applicationTable.tableName,
        PROMPT_REGISTRY_TABLE_NAME: props.promptRegistryTable.tableName,
        // Missing until this session — this handler decrypts confirmed Twin
        // signal content to build the personalized explanation
        // (lib/crypto-stub.ts throws loudly without this), but nothing had
        // exercised that path against a user with confirmed signals before
        // the Digital Twin/Library frontends existed to make it reachable.
        PLAINTEXT_CRYPTO_STUB_ACK: props.isProduction ? 'false' : 'true',
      },
      entry: path.join(__dirname, '../lambda/library/topic-detail.ts'),
      description: 'GET /v1/library/topics/{slug} — topic + personalized explanation from confirmed Twin signals.',
    })
    props.libraryCatalogTable.grantReadData(libraryTopicDetailFn)
    props.applicationTable.grantReadData(libraryTopicDetailFn)
    props.promptRegistryTable.grantReadData(libraryTopicDetailFn)
    grantBedrockConverse(libraryTopicDetailFn)

    const libraryRecommendationsFn = new lambda.NodejsFunction(this, 'LibraryRecommendationsFn', {
      runtime: Runtime.NODEJS_24_X,
      bundling: { minify: true, sourceMap: true },
      environment: {
        LIBRARY_CATALOG_TABLE_NAME: props.libraryCatalogTable.tableName,
        APPLICATION_TABLE_NAME: props.applicationTable.tableName,
      },
      entry: path.join(__dirname, '../lambda/library/recommendations.ts'),
      description: 'GET /v1/library/recommendations — real ranking from confirmed Twin signals (Slice 3).',
    })
    props.libraryCatalogTable.grantReadData(libraryRecommendationsFn)
    props.applicationTable.grantReadData(libraryRecommendationsFn)

    this.httpApi.addRoutes({
      path: '/v1/library/topics',
      methods: [apigwv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('LibraryTopicsIntegration', libraryTopicsFn),
      authorizer: this.cognitoAuthorizer,
    })

    this.httpApi.addRoutes({
      path: '/v1/library/topics/{slug}',
      methods: [apigwv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('LibraryTopicDetailIntegration', libraryTopicDetailFn),
      authorizer: this.cognitoAuthorizer,
    })

    this.httpApi.addRoutes({
      path: '/v1/library/recommendations',
      methods: [apigwv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('LibraryRecommendationsIntegration', libraryRecommendationsFn),
      authorizer: this.cognitoAuthorizer,
    })

    const createCommitmentFn = new lambda.NodejsFunction(this, 'CreateCommitmentFn', {
      ...sharedProductLambdaProps,
      entry: path.join(__dirname, '../lambda/continuity/create-commitment.ts'),
      description: 'POST /v1/commitments.',
    })
    props.applicationTable.grantReadWriteData(createCommitmentFn)

    const listCommitmentsFn = new lambda.NodejsFunction(this, 'ListCommitmentsFn', {
      ...sharedProductLambdaProps,
      entry: path.join(__dirname, '../lambda/continuity/list-commitments.ts'),
      description: 'GET /v1/commitments.',
    })
    props.applicationTable.grantReadData(listCommitmentsFn)

    this.httpApi.addRoutes({
      path: '/v1/commitments',
      methods: [apigwv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('CreateCommitmentIntegration', createCommitmentFn),
      authorizer: this.cognitoAuthorizer,
    })

    this.httpApi.addRoutes({
      path: '/v1/commitments',
      methods: [apigwv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('ListCommitmentsIntegration', listCommitmentsFn),
      authorizer: this.cognitoAuthorizer,
    })

    const completeCommitmentFn = new lambda.NodejsFunction(this, 'CompleteCommitmentFn', {
      ...sharedProductLambdaProps,
      entry: path.join(__dirname, '../lambda/continuity/complete-commitment.ts'),
      description: 'POST /v1/commitments/{commitmentId}/complete — My Wallet "Weekly Goal Achieved" reward.',
    })
    props.applicationTable.grantReadWriteData(completeCommitmentFn)

    this.httpApi.addRoutes({
      path: '/v1/commitments/{commitmentId}/complete',
      methods: [apigwv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('CompleteCommitmentIntegration', completeCommitmentFn),
      authorizer: this.cognitoAuthorizer,
    })

    const getCreditsFn = new lambda.NodejsFunction(this, 'GetCreditsFn', {
      runtime: Runtime.NODEJS_24_X,
      bundling: { minify: true, sourceMap: true },
      environment: { APPLICATION_TABLE_NAME: props.applicationTable.tableName },
      entry: path.join(__dirname, '../lambda/credits/get-credits.ts'),
      description: 'GET /v1/credits — current ledger balance.',
    })
    props.applicationTable.grantReadData(getCreditsFn)

    const listTransactionsFn = new lambda.NodejsFunction(this, 'ListTransactionsFn', {
      runtime: Runtime.NODEJS_24_X,
      bundling: { minify: true, sourceMap: true },
      environment: { APPLICATION_TABLE_NAME: props.applicationTable.tableName },
      entry: path.join(__dirname, '../lambda/credits/list-transactions.ts'),
      description: 'GET /v1/credits/transactions — the real ledger, most-recent first.',
    })
    props.applicationTable.grantReadData(listTransactionsFn)

    const getPlansFn = new lambda.NodejsFunction(this, 'GetPlansFn', {
      runtime: Runtime.NODEJS_24_X,
      bundling: { minify: true, sourceMap: true },
      environment: { PLANS_CATALOG_TABLE_NAME: props.plansCatalogTable.tableName },
      entry: path.join(__dirname, '../lambda/credits/get-plans.ts'),
      description: 'GET /v1/plans — active credit-pack/subscription catalog.',
    })
    props.plansCatalogTable.grantReadData(getPlansFn)

    this.httpApi.addRoutes({
      path: '/v1/credits',
      methods: [apigwv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('GetCreditsIntegration', getCreditsFn),
      authorizer: this.cognitoAuthorizer,
    })

    this.httpApi.addRoutes({
      path: '/v1/credits/transactions',
      methods: [apigwv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('ListTransactionsIntegration', listTransactionsFn),
      authorizer: this.cognitoAuthorizer,
    })

    this.httpApi.addRoutes({
      path: '/v1/plans',
      methods: [apigwv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('GetPlansIntegration', getPlansFn),
      authorizer: this.cognitoAuthorizer,
    })

    /**
     * Grow payment integration (ADR 0008). This project's first third-party
     * API credential, so there's no existing secrets pattern to reuse —
     * Secrets Manager is the standard CDK-idiomatic choice. `fromSecretNameV2`
     * is a lazy reference: it synthesizes/deploys fine even before the named
     * secret actually exists in this account — it only fails at Lambda
     * invocation time. The user creates the real secret manually once real
     * Grow credentials exist (never pasted into agent chat or committed).
     */
    const growCredentialsSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      'GrowCredentialsSecret',
      'dpnr/grow-credentials'
    )
    // Only sandbox hosts are confirmed from Grow's public docs (ADR 0008) —
    // the production hostname is a guess, VERIFY before any real deploy with
    // isProduction: true attempts a real charge.
    const growBaseUrl = props.isProduction ? 'https://api.grow.link' : 'https://sandboxapi.grow.link'

    const initiatePurchaseFn = new lambda.NodejsFunction(this, 'InitiatePurchaseFn', {
      runtime: Runtime.NODEJS_24_X,
      bundling: { minify: true, sourceMap: true },
      environment: {
        APPLICATION_TABLE_NAME: props.applicationTable.tableName,
        PLANS_CATALOG_TABLE_NAME: props.plansCatalogTable.tableName,
        GROW_CREDENTIALS_SECRET_ARN: growCredentialsSecret.secretArn,
        GROW_BASE_URL: growBaseUrl,
        API_BASE_URL: this.httpApi.apiEndpoint,
        // No real deployed frontend origin yet — same caveat this stack's
        // own CORS config already carries; update both together once one exists.
        FRONTEND_BASE_URL: 'http://localhost:3000',
      },
      entry: path.join(__dirname, '../lambda/credits/initiate-purchase.ts'),
      description: 'POST /v1/credits/purchase — initiates a Grow hosted checkout page.',
    })
    props.applicationTable.grantWriteData(initiatePurchaseFn)
    props.plansCatalogTable.grantReadData(initiatePurchaseFn)
    growCredentialsSecret.grantRead(initiatePurchaseFn)

    const growWebhookFn = new lambda.NodejsFunction(this, 'GrowWebhookFn', {
      runtime: Runtime.NODEJS_24_X,
      bundling: { minify: true, sourceMap: true },
      environment: {
        APPLICATION_TABLE_NAME: props.applicationTable.tableName,
        GROW_CREDENTIALS_SECRET_ARN: growCredentialsSecret.secretArn,
        GROW_BASE_URL: growBaseUrl,
      },
      entry: path.join(__dirname, '../lambda/credits/grow-webhook.ts'),
      description: 'POST /v1/webhooks/payment — Grow server-to-server callback, unauthenticated.',
    })
    props.applicationTable.grantReadWriteData(growWebhookFn)
    growCredentialsSecret.grantRead(growWebhookFn)

    this.httpApi.addRoutes({
      path: '/v1/credits/purchase',
      methods: [apigwv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('InitiatePurchaseIntegration', initiatePurchaseFn),
      authorizer: this.cognitoAuthorizer,
    })

    this.httpApi.addRoutes({
      path: '/v1/webhooks/payment',
      methods: [apigwv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('GrowWebhookIntegration', growWebhookFn),
      // deliberately no authorizer — Grow calls this directly, no Cognito
      // JWT exists on a server-to-server callback. Same omission pattern as
      // /v1/health above.
    })

    // Not behind API Gateway — no 30s integration ceiling applies, unlike
    // bedrockCallTimeout above. A batch loop over every consented user
    // (Scan + a Bedrock call each) needs real headroom; 5 minutes is ample
    // at today's real user count (a handful of beta users) and stays well
    // under Lambda's own 15-minute hard ceiling. Revisit (Step Functions Map
    // fan-out, not just a bigger number) once user count actually grows —
    // same scale caveat both composer files' own doc comments flag.
    const compositionBatchTimeout = Duration.minutes(5)

    const composeDailyCardFn = new lambda.NodejsFunction(this, 'ComposeDailyCardFn', {
      ...sharedProductLambdaProps,
      timeout: compositionBatchTimeout,
      entry: path.join(__dirname, '../lambda/continuity/compose-daily-card.ts'),
      environment: {
        ...sharedProductLambdaProps.environment,
        PROMPT_REGISTRY_TABLE_NAME: props.promptRegistryTable.tableName,
      },
      description: 'Scheduled daily — composes DAILYCARD#<date> for every consented user with real material.',
    })
    props.applicationTable.grantReadWriteData(composeDailyCardFn)
    props.promptRegistryTable.grantReadData(composeDailyCardFn)
    grantBedrockConverse(composeDailyCardFn)

    const composeWeeklyRecapFn = new lambda.NodejsFunction(this, 'ComposeWeeklyRecapFn', {
      ...sharedProductLambdaProps,
      timeout: compositionBatchTimeout,
      entry: path.join(__dirname, '../lambda/continuity/compose-weekly-recap.ts'),
      environment: {
        ...sharedProductLambdaProps.environment,
        PROMPT_REGISTRY_TABLE_NAME: props.promptRegistryTable.tableName,
      },
      description: 'Scheduled weekly — composes WEEKLYRECAP#<isoWeek> for every consented user with real material from the last 7 days.',
    })
    props.applicationTable.grantReadWriteData(composeWeeklyRecapFn)
    props.promptRegistryTable.grantReadData(composeWeeklyRecapFn)
    grantBedrockConverse(composeWeeklyRecapFn)

    // No Bedrock call — computeAlignmentScore is plain arithmetic over
    // already-real data, no PROMPT_REGISTRY_TABLE_NAME/grantBedrockConverse
    // needed unlike the two composers above.
    const snapshotAlignmentScoreFn = new lambda.NodejsFunction(this, 'SnapshotAlignmentScoreFn', {
      ...sharedProductLambdaProps,
      timeout: compositionBatchTimeout,
      entry: path.join(__dirname, '../lambda/continuity/snapshot-alignment-score.ts'),
      description: 'Scheduled daily — writes ALIGNMENT#SNAPSHOT#<date> for every consented user with enough data for a real score.',
    })
    props.applicationTable.grantReadWriteData(snapshotAlignmentScoreFn)

    // Plain aws-events.Rule cron, not the newer dedicated EventBridge
    // Scheduler service MVP_ARCHITECTURE.md §6 names — functionally
    // equivalent for a fixed daily/weekly invocation, already part of core
    // aws-cdk-lib (no new dependency, no separate assignment-role setup the
    // dedicated Scheduler service needs). Flagged as a deliberate
    // substitution, not silently done — revisit only if per-user or
    // per-window scheduling (which the dedicated Scheduler service is
    // actually for) becomes a real requirement, e.g. for commitment
    // reminders at a user-chosen reviewDate.
    new events.Rule(this, 'DailyCardScheduleRule', {
      schedule: events.Schedule.cron({ minute: '0', hour: '6' }), // 06:00 UTC daily
      targets: [new targets.LambdaFunction(composeDailyCardFn)],
      description: 'Triggers Daily Card composition once per day.',
    })

    new events.Rule(this, 'WeeklyRecapScheduleRule', {
      schedule: events.Schedule.cron({ minute: '0', hour: '6', weekDay: 'MON' }), // 06:00 UTC every Monday
      targets: [new targets.LambdaFunction(composeWeeklyRecapFn)],
      description: 'Triggers Weekly Recap composition once per week.',
    })

    new events.Rule(this, 'AlignmentScoreSnapshotScheduleRule', {
      schedule: events.Schedule.cron({ minute: '15', hour: '6' }), // 06:15 UTC daily — after the Daily Card run, same window
      targets: [new targets.LambdaFunction(snapshotAlignmentScoreFn)],
      description: 'Triggers Alignment Score snapshot composition once per day.',
    })

    const getDailyCardFn = new lambda.NodejsFunction(this, 'GetDailyCardFn', {
      ...sharedProductLambdaProps,
      entry: path.join(__dirname, '../lambda/continuity/get-daily-card.ts'),
      description: 'GET /v1/daily-card — pure cache hit over what compose-daily-card.ts already wrote.',
    })
    props.applicationTable.grantReadData(getDailyCardFn)

    const getWeeklyRecapFn = new lambda.NodejsFunction(this, 'GetWeeklyRecapFn', {
      ...sharedProductLambdaProps,
      entry: path.join(__dirname, '../lambda/continuity/get-weekly-recap.ts'),
      description: 'GET /v1/weekly-recap — pure cache hit over what compose-weekly-recap.ts already wrote.',
    })
    props.applicationTable.grantReadData(getWeeklyRecapFn)

    const dailyCardFeedbackFn = new lambda.NodejsFunction(this, 'DailyCardFeedbackFn', {
      ...sharedProductLambdaProps,
      entry: path.join(__dirname, '../lambda/continuity/daily-card-feedback.ts'),
      description: 'POST /v1/daily-card/feedback — records dismiss/relevance feedback on today\'s card.',
    })
    props.applicationTable.grantWriteData(dailyCardFeedbackFn)

    this.httpApi.addRoutes({
      path: '/v1/daily-card',
      methods: [apigwv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('GetDailyCardIntegration', getDailyCardFn),
      authorizer: this.cognitoAuthorizer,
    })

    this.httpApi.addRoutes({
      path: '/v1/daily-card/feedback',
      methods: [apigwv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('DailyCardFeedbackIntegration', dailyCardFeedbackFn),
      authorizer: this.cognitoAuthorizer,
    })

    this.httpApi.addRoutes({
      path: '/v1/weekly-recap',
      methods: [apigwv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('GetWeeklyRecapIntegration', getWeeklyRecapFn),
      authorizer: this.cognitoAuthorizer,
    })

    new CfnOutput(this, 'ApiUrl', { value: this.httpApi.apiEndpoint })
    new CfnOutput(this, 'SafetyAlertTopicArn', { value: safetyAlertTopic.topicArn })
  }
}
