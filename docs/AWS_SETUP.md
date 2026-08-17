# AWS Account Setup — Runbook

No AWS account exists for this project yet. I (the agent) cannot create an AWS account, enter billing/payment details, or handle your account credentials directly — those are steps only you can do. This doc is the step-by-step guide; follow it in order, and tell the agent when you hit each ✅ checkpoint so it can verify and continue.

## 1. Create the AWS account (you do this)

1. Go to https://aws.amazon.com/ and create an account if you don't have one. You'll need an email, a payment method, and phone verification.
2. Immediately enable **MFA on the root account** (IAM → root user → Security credentials → Assign MFA device). The root user should never be used for day-to-day work after this — it's for account-level tasks only (billing, closing the account, etc.).
3. Set up a **budget alert** so a mistake doesn't turn into a surprise bill: Billing → Budgets → Create budget → Cost budget → set a monthly threshold (e.g. $20 for early dev — the load-based cost model in `MVP_ARCHITECTURE.md` §8 puts the fixed floor around $16–17/month once the VPC endpoints are deployed) → set an alert at 80% and 100%.

**✅ Checkpoint:** account exists, root MFA enabled, budget alert set.

## 2. Create a working IAM identity (you do this)

Do not use root credentials for CDK/CLI work. Create an IAM user for this project:

1. IAM → Users → Create user. Name it something like `dpnr-dev`.
2. Attach `AdministratorAccess` for now (day-to-day least-privilege policies can be tightened later once the actual resource set is known — CDK needs broad permissions to create Cognito pools, DynamoDB tables, Lambda, API Gateway, IAM roles, etc., and hand-scoping this before anything exists tends to just cause friction without real security benefit yet).
3. Create **access keys** for this user (IAM → Users → `dpnr-dev` → Security credentials → Create access key → "Command Line Interface (CLI)" use case).
4. **Do not paste the secret access key into chat with the agent.** Configure it directly in your own terminal instead (next step).

**✅ Checkpoint:** IAM user created with access keys generated (keep the values somewhere safe — the secret key is shown only once).

## 3. Configure the AWS CLI locally (you do this, in your own terminal)

1. Install the AWS CLI if not already present: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
2. In your own terminal (not through the agent), run:
   ```
   aws configure
   ```
   and paste in the access key ID, secret access key, a default region, and output format (`json`) when prompted.
3. **Region:** the migration plan's cost model assumed `eu-north-1` (Stockholm). Before locking this in, verify that Amazon Bedrock's Claude models are actually available in whatever region you pick — Bedrock's regional model availability changes over time and should be checked against the current AWS docs (https://docs.aws.amazon.com/bedrock/latest/userguide/models-regions.html) rather than assumed from the migration plan, which may be stale by the time Phase 0 actually runs.

**✅ Checkpoint:** tell the agent you've run `aws configure`. It will verify with a read-only command:
```bash
aws sts get-caller-identity
```
This confirms the CLI can authenticate without ever exposing your secret key to the agent.

## 4. Request Bedrock model access (you do this, once per account)

Amazon Bedrock requires explicit model access requests before first use, even with full IAM permissions:

1. Console → Amazon Bedrock → Model access → Request access to the Claude model(s) you intend to use (Converse API).
2. This is usually instant for Anthropic models but can take a review cycle for some accounts/regions — do this early so it's not a blocker later.

**✅ Checkpoint:** Claude model access shows "Access granted" in the Bedrock console.

## 5. Install the CDK CLI and bootstrap (agent can help, but confirm before deploying)

Once steps 1–4 are done:

```bash
npm install -g aws-cdk
cdk bootstrap aws://<ACCOUNT_ID>/<REGION>
```

`cdk bootstrap` creates a small set of real AWS resources (an S3 bucket and IAM roles CDK uses to stage deployment assets) — low cost, but still real infrastructure. **The agent will ask for explicit confirmation before running `cdk bootstrap` or any `cdk deploy`, even after credentials are configured** — these are the kind of actions that are easy to do but require explicit go-ahead per session, since it involves real AWS resources and account interaction, not just committing code.

## Ongoing cost hygiene

- Keep the AWS Budgets alert from step 1 active for the life of the project.
- Every new AWS service adopted into the "core path" (per `MVP_ARCHITECTURE.md`'s zero-egress VPC guardrail, inherited from the migration plan) should be checked for a VPC endpoint in the chosen region before being wired in — see `AGENT_LOG.md` guardrails.
- Re-run the load-based cost model (`aws-migration-plan.html` §12, or its successor once rebuilt for the whole product) whenever a new component goes live, rather than assuming the original Decision-Room-only estimate still holds.
