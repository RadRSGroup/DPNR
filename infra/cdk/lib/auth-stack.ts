import { CfnOutput, Duration, RemovalPolicy, SecretValue, Stack, StackProps } from 'aws-cdk-lib'
import * as acm from 'aws-cdk-lib/aws-certificatemanager'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs'
import { Runtime } from 'aws-cdk-lib/aws-lambda'
import * as path from 'path'
import { Construct } from 'constructs'

export interface AuthStackProps extends StackProps {
  applicationTable: dynamodb.Table
  isProduction?: boolean
}

/**
 * Cognito user pool + triggers (migration plan §4.2, §10 Phase 2).
 *
 * Consent state deliberately lives ONLY in the application table's
 * PROFILE item (single source of truth), not duplicated as a Cognito
 * custom attribute — the migration plan's original wording ("Cognito
 * custom attribute + pre-token-generation trigger") would have created
 * two places consent could drift out of sync. The pre-token-generation
 * trigger reads DynamoDB directly instead — see docs/adr/0004-consent-claim-source-of-truth.md.
 *
 * Google sign-in (Session 83): a Cognito domain (`dpnr-auth`), the Google
 * identity provider (client id/secret from Secrets Manager
 * `dpnr/google-oauth`, created by the user; GCP project
 * `decision-room-498917`, client "DPNR Web (Cognito)") and the
 * authorization-code flow on the existing web client. The web app skips the
 * hosted UI (`identity_provider=Google`) and handles `/auth/callback`
 * itself. Keys stay password-derived: a Google account sets a DPNR password
 * once (user decision, "password after Google").
 */
export class AuthStack extends Stack {
  public readonly userPool: cognito.UserPool
  public readonly userPoolClient: cognito.UserPoolClient

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props)

    const removalPolicy = props.isProduction ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY
    const sharedLambdaProps = {
      runtime: Runtime.NODEJS_24_X,
      bundling: { minify: true, sourceMap: true },
      environment: {
        APPLICATION_TABLE_NAME: props.applicationTable.tableName,
      },
    }

    const postConfirmationFn = new lambda.NodejsFunction(this, 'PostConfirmationFn', {
      ...sharedLambdaProps,
      entry: path.join(__dirname, '../lambda/auth/post-confirmation.ts'),
      description: 'Creates the app-level PROFILE item after signup confirmation.',
    })
    props.applicationTable.grantWriteData(postConfirmationFn)

    const preTokenGenerationFn = new lambda.NodejsFunction(this, 'PreTokenGenerationFn', {
      ...sharedLambdaProps,
      entry: path.join(__dirname, '../lambda/auth/pre-token-generation.ts'),
      description: 'Injects the custom:consent claim from the PROFILE item into every issued JWT.',
    })
    // Read/write: it also creates the PROFILE for a first Google sign-in,
    // which has no confirmation step (ensure-profile.ts).
    props.applicationTable.grantReadWriteData(preTokenGenerationFn)

    const preSignUpFn = new lambda.NodejsFunction(this, 'PreSignUpFn', {
      ...sharedLambdaProps,
      entry: path.join(__dirname, '../lambda/auth/pre-signup.ts'),
      description: 'Links a first Google sign-in to the existing account with the same verified email.',
    })
    // The pool's own ARN would be a circular reference (the pool names this
    // function as its trigger), so scope to this account's pools in-region.
    preSignUpFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['cognito-idp:ListUsers', 'cognito-idp:AdminLinkProviderForUser'],
      resources: [this.formatArn({ service: 'cognito-idp', resource: 'userpool', resourceName: '*' })],
    }))

    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'dpnr-users',
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: false },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      lambdaTriggers: {
        preSignUp: preSignUpFn,
        postConfirmation: postConfirmationFn,
        preTokenGeneration: preTokenGenerationFn,
      },
      // Security review 2026-09-14 (DPNR-11) — this pool had no MFA option
      // of any kind before this. OPTIONAL, not REQUIRED: flipping to
      // REQUIRED would break every already-confirmed account's next sign-in
      // with no enrollment step to fall back to, and this is additive/
      // non-breaking for everyone who doesn't opt in. TOTP only, no SMS —
      // avoids a per-message SNS cost and SMS's own weaker security
      // properties for a feature nobody asked to have provisioned yet.
      // Disclosed gap: this only turns MFA on at the Cognito pool level —
      // no "set up an authenticator app" UI exists anywhere in apps/web,
      // so real user adoption needs a separate frontend slice.
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: { sms: false, otp: true },
      removalPolicy,
      // Slice 6: every login lives here and Cognito has no backup/restore —
      // a deleted pool can't be brought back, and every user would lose
      // access (their data is keyed on this pool's `sub`). Same gate as the
      // tables' deletion protection.
      deletionProtection: props.isProduction,
    })

    this.userPool.addDomain('Domain', {
      cognitoDomain: { domainPrefix: 'dpnr-auth' },
    })

    // Custom sign-in domain (Session 83): Google's brand verification needs
    // every consent-screen domain to be one DPNR owns, and amazoncognito.com
    // can't be. Certificate requested in us-east-1 and validated by DNS in
    // Squarespace; the `auth` CNAME points at the output below.
    const authDomain = this.userPool.addDomain('CustomDomain', {
      customDomain: {
        domainName: 'auth.be-dpnr.com',
        certificate: acm.Certificate.fromCertificateArn(
          this,
          'AuthDomainCert',
          'arn:aws:acm:us-east-1:346866989957:certificate/0ece8433-5f47-4f09-a14f-d8e5a93a0aa1',
        ),
      },
    })
    new CfnOutput(this, 'AuthDomainCnameTarget', {
      value: authDomain.cloudFrontEndpoint,
      description: 'Squarespace DNS: CNAME auth.be-dpnr.com -> this value',
    })

    const googleSecret = 'dpnr/google-oauth'
    const google = new cognito.UserPoolIdentityProviderGoogle(this, 'Google', {
      userPool: this.userPool,
      // The client id isn't secret; it lives next to the secret so both
      // come from one place. Resolved by CloudFormation at deploy time.
      clientId: SecretValue.secretsManager(googleSecret, { jsonField: 'clientId' }).unsafeUnwrap(),
      clientSecretValue: SecretValue.secretsManager(googleSecret, { jsonField: 'clientSecret' }),
      scopes: ['openid', 'email', 'profile'],
      attributeMapping: {
        email: cognito.ProviderAttribute.GOOGLE_EMAIL,
        emailVerified: cognito.ProviderAttribute.GOOGLE_EMAIL_VERIFIED,
      },
    })

    const webOrigins = ['http://localhost:3000', 'https://dpnr-mvp.onrender.com', 'https://app.be-dpnr.com']

    this.userPoolClient = this.userPool.addClient('WebClient', {
      generateSecret: false,
      authFlows: { userSrp: true },
      // Authorization code + PKCE only (no implicit flow), for the Google
      // redirect. Email/password sign-in still uses SRP directly.
      oAuth: {
        flows: { authorizationCodeGrant: true },
        // COGNITO_ADMIN lets a Google-issued access token call the user's own
        // Cognito APIs (change password on a linked account, delete account).
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE, cognito.OAuthScope.COGNITO_ADMIN],
        callbackUrls: webOrigins.map((o) => `${o}/auth/callback`),
        logoutUrls: webOrigins.map((o) => `${o}/login`),
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
        cognito.UserPoolClientIdentityProvider.GOOGLE,
      ],
      accessTokenValidity: Duration.hours(1),
      idTokenValidity: Duration.hours(1),
      refreshTokenValidity: Duration.days(30),
    })
    this.userPoolClient.node.addDependency(google)
  }
}
