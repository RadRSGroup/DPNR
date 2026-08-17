# infra/cdk

Placeholder. The actual CDK app (stacks for Cognito, API Gateway + Lambda, DynamoDB, Bedrock access, EventBridge, KMS, Prompt Registry/Session Tickets tables) is Phase 0 work per `docs/MVP_ARCHITECTURE.md` §7 and has not been written yet — see `docs/AGENT_LOG.md` for status and the AWS account setup prerequisite in `docs/AWS_SETUP.md`.

Do not scaffold CDK stacks here casually to "make progress" — Phase 0 needs the AWS account/credentials in place first (see `docs/AWS_SETUP.md`), and the stack layout should be designed deliberately in one focused session against the data model in `MVP_ARCHITECTURE.md` §3, not grown ad hoc.
