import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as kms from 'aws-cdk-lib/aws-kms'
import { Construct } from 'constructs'

export interface DataStackProps extends StackProps {
  /**
   * Flip to true only for a deployment that will hold real user data.
   * Controls table removal policy — defaults to DESTROY so early dev
   * iteration doesn't accumulate orphaned empty tables. MUST be true
   * before this stack is ever deployed against production, or a stack
   * replacement could silently delete real user data.
   */
  isProduction?: boolean
}

/**
 * DynamoDB tables + KMS key, per MVP_ARCHITECTURE.md §3. One
 * application table (single-table design, per-user partitions) plus
 * three global config-like tables, matching the migration plan's
 * per-table PITR/backup profile decisions exactly — see the comments
 * on each table below for why each one differs.
 */
export class DataStack extends Stack {
  public readonly applicationTable: dynamodb.Table
  public readonly promptRegistryTable: dynamodb.Table
  public readonly sessionTicketsTable: dynamodb.Table
  public readonly libraryCatalogTable: dynamodb.Table
  public readonly plansCatalogTable: dynamodb.Table
  public readonly sessionTicketsKmsKey: kms.Key

  constructor(scope: Construct, id: string, props: DataStackProps = {}) {
    super(scope, id, props)

    const removalPolicy = props.isProduction ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY

    // Application table — every per-user entity (profile, credits, roadmap,
    // Digital Twin signals, sessions, Decision Room, Mirror Room,
    // commitments, Daily Card, Weekly Recap, ...). PITR on: this is the
    // one table GDPR export/erasure and disaster recovery actually care
    // about. No GSIs yet — add one only when a concrete query pattern
    // needs it, not speculatively.
    //
    // `timeToLiveAttribute: 'ttl'` (Session 29, ADR 0012) — enabling TTL is
    // an online, non-replacing DynamoDB operation; every existing item
    // without a `ttl` attribute is completely unaffected and never expires.
    // Added specifically for `SafetyEventItem`'s 90-day retention
    // (packages/shared-types/src/dynamo/safety.ts) — the only item family
    // that sets this attribute today. Any future item type is free to reuse
    // the same `ttl` attribute name for its own expiry.
    this.applicationTable = new dynamodb.Table(this, 'ApplicationTable', {
      tableName: 'dpnr-application',
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      timeToLiveAttribute: 'ttl',
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy,
    })

    // Prompt Registry — separate table, config-like data (migration plan
    // §8.1): few items, read-heavy, written only by the release process
    // and the background pipeline. PITR on for the same reason as any
    // config store: an accidental bad write to a prod prompt shouldn't be
    // unrecoverable.
    this.promptRegistryTable = new dynamodb.Table(this, 'PromptRegistryTable', {
      tableName: 'dpnr-prompt-registry',
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy,
    })

    // Session Tickets — deliberately NO PITR, NO backups, NO streams
    // (migration plan §6.5, §5): a "deleted" ticket must not live on in
    // point-in-time history for 35 days, since that would undermine the
    // "sign-out seals your data immediately" guarantee. TTL is a cleanup
    // backstop only — handler code must still check expiresAt itself.
    this.sessionTicketsTable = new dynamodb.Table(this, 'SessionTicketsTable', {
      tableName: 'dpnr-session-tickets',
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: false },
      timeToLiveAttribute: 'ttl',
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY, // never worth retaining — it holds nothing but live/expired tickets
    })

    // Content Library catalog — config-like, same profile as Prompt Registry.
    this.libraryCatalogTable = new dynamodb.Table(this, 'LibraryCatalogTable', {
      tableName: 'dpnr-library-catalog',
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy,
    })

    // Plans/Packages catalog — kept configurable per spec §Beta Trial,
    // not hard-coded into product logic.
    this.plansCatalogTable = new dynamodb.Table(this, 'PlansCatalogTable', {
      tableName: 'dpnr-plans-catalog',
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy,
    })

    // Dedicated KMS key for session-ticket envelope encryption (migration
    // plan §6.5, §9: "one dedicated key ≈ $1/mo"). Asymmetric (RSA-2048) per
    // ADR 0013 — the client wraps a DEK against this key's public half
    // entirely client-side (GET /v1/session-ticket/public-key), so a
    // Lambda's own kms:Decrypt grant (given where those roles are defined,
    // AuthStack/ApiStack, not here — this stack's job is only "create the
    // key," not "decide who can use it") is the only IAM action ever needed
    // against it. Asymmetric CMKs don't support AWS-managed key rotation —
    // an accepted trade-off, see ADR 0013's Consequences.
    // This construct's logical ID is 'SessionTicketsKeyRsa', not
    // 'SessionTicketsKey' — deliberate, not a typo. Two real CloudFormation/
    // KMS gotchas surfaced migrating the original symmetric key to this
    // asymmetric one (ADR 0013), both worth knowing before touching this
    // block again — full account in docs/AGENT_LOG.md's Session 32 entry:
    // (1) KeySpec is documented as "Update requires: Replacement," but the
    //     AWS::KMS::Key resource provider actually issues an in-place
    //     UpdateKey call and rejects it ("You cannot change the values of
    //     the KeySpec...") instead of replacing the resource — a real
    //     replacement needs a new logical ID for the Key construct, which
    //     is why this one no longer matches the original 'SessionTicketsKey'.
    // (2) KMS also refuses to repoint an existing Alias from a symmetric to
    //     an asymmetric key ("The current CMK and new CMK must both be
    //     symmetric or asymmetric"), and two Alias resources can't share one
    //     name at once — so the actual migration had to be a two-phase
    //     deploy (drop the old alias first, freeing the name; only then
    //     create the new key + a fresh alias). That history is why the
    //     logical ID changed; this block is the resulting steady state, not
    //     something to redo.
    this.sessionTicketsKmsKey = new kms.Key(this, 'SessionTicketsKeyRsa', {
      alias: 'dpnr-session-tickets',
      keySpec: kms.KeySpec.RSA_2048,
      keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
      pendingWindow: Duration.days(7),
      removalPolicy,
    })
  }
}
