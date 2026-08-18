import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
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
 * Google OAuth federation is NOT configured yet — it needs a Google
 * Cloud Console project and OAuth client credentials, which is another
 * external-account setup step like AWS itself. Email/password only for
 * now; add the identity provider once those credentials exist.
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
    props.applicationTable.grantReadData(preTokenGenerationFn)

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
        postConfirmation: postConfirmationFn,
        preTokenGeneration: preTokenGenerationFn,
      },
      removalPolicy,
    })

    this.userPoolClient = this.userPool.addClient('WebClient', {
      generateSecret: false,
      authFlows: { userSrp: true },
      accessTokenValidity: Duration.hours(1),
      idTokenValidity: Duration.hours(1),
      refreshTokenValidity: Duration.days(30),
    })
  }
}
