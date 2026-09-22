import type { IAspect } from 'aws-cdk-lib'
import type { IConstruct } from 'constructs'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as logs from 'aws-cdk-lib/aws-logs'

/**
 * Security review 2026-09-14 (DPNR-11) — every one of this project's ~55
 * Lambda functions had X-Ray tracing off and an auto-created, NEVER-EXPIRE
 * CloudWatch log group (Lambda's own default whenever neither `tracing`
 * nor `logGroup`/`logRetention` is passed at creation) before this. About a
 * fifth of api-stack.ts's call sites don't spread the shared props object
 * at all (they need a bespoke `environment`), so adding this to the shared
 * prop objects alone would have silently missed them — a stack-wide Aspect
 * instead makes this a real invariant every current AND future Lambda
 * inherits automatically, not a per-call-site convention someone has to
 * remember to copy.
 *
 * Setting `tracingConfig` via the L1 escape hatch (rather than the
 * `tracing` prop at construction, which this Aspect runs too late to set)
 * means the IAM write access X-Ray needs has to be granted here too —
 * `Function`'s own constructor only adds it when `tracing` is passed at
 * construction time.
 *
 * `logs.LogRetention` (the exact construct the now-deprecated `logRetention`
 * prop uses internally) manages one small custom-resource Lambda PER STACK,
 * not one per function — `ensureSingletonLogRetentionFunction` in
 * aws-cdk-lib's own source keys it off a fixed logical ID on the Stack and
 * reuses it. That singleton's own backing resource is a plain `Construct`,
 * not a `lambda.Function`, so this Aspect never re-visits or double-wraps
 * it — confirmed by reading aws-cdk-lib's source before relying on this,
 * not assumed.
 */
export class LambdaObservabilityAspect implements IAspect {
  constructor(private readonly retention: logs.RetentionDays = logs.RetentionDays.ONE_MONTH) {}

  visit(node: IConstruct): void {
    if (!(node instanceof lambda.Function)) return

    const cfnFunction = node.node.defaultChild as lambda.CfnFunction
    cfnFunction.tracingConfig = { mode: 'Active' }
    node.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['xray:PutTraceSegments', 'xray:PutTelemetryRecords'],
        resources: ['*'],
      })
    )

    new logs.LogRetention(node, 'LogRetention', {
      // `Function` has no public `logGroupName` in this CDK version — this
      // is Lambda's own fixed, undocumented-but-stable naming convention
      // (matches what the `.logGroup` getter and the deprecated
      // `logRetention` prop both derive internally).
      logGroupName: `/aws/lambda/${node.functionName}`,
      retention: this.retention,
    })
  }
}
