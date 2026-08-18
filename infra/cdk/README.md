# infra/cdk

AWS CDK app for the DPNR platform. Phase 0 status (see `docs/AGENT_LOG.md` for the authoritative current state):

- **Built:** `Dpnr-Data` (DynamoDB: application, prompt registry, session tickets, library catalog, plans catalog tables + the session-tickets KMS key), `Dpnr-Auth` (Cognito user pool, email/password only, post-confirmation + pre-token-generation triggers), `Dpnr-Api` (HTTP API with a Cognito JWT authorizer construct ready to attach, one unauthenticated `GET /v1/health` route wired end to end).
- **Not built:** every product route in `MVP_ARCHITECTURE.md` §4 beyond health, Google OAuth federation (needs external Google Cloud OAuth credentials first), the zero-egress VPC network isolation from the migration plan (defer until a Lambda actually needs to call Bedrock or another external-ish service — no point locking down network egress before anything makes an egress call), Bedrock access, EventBridge pipelines, the Prompt Registry Lambda logic.
- **Not deployed anywhere.** No AWS account/credentials exist for this project yet — see `docs/AWS_SETUP.md`. `cdk synth` works locally without credentials (no environment-specific context lookups in these stacks); `cdk bootstrap`/`cdk deploy` need an account and explicit go-ahead each time per `docs/AGENT_LOG.md`'s guardrails.

```bash
npm run typecheck   # from this directory, or via the shared-types build first if types changed
npm run synth        # cdk synth — safe without AWS credentials
```

`cdk synth` prints a benign, non-blocking warning about cross-stack-reference strength (`Construct-Annotations::@aws-cdk/core:crossStackReferencesDefaultStrong`). The context flag with that exact name is already set in `cdk.json` and doesn't clear it — this looks like a newer CDK annotation-acknowledgment mechanism (`cdk flags --unstable=flags`) rather than a plain context setting. The actual behavior it's warning about ("strong" references) is already the safe default in effect, so this is cosmetic — don't spend a session chasing it further unless it starts blocking something real.

Add new stacks/routes deliberately, matching the data model in `docs/MVP_ARCHITECTURE.md` §3 — don't grow this ad hoc per feature without checking it against that doc first.
