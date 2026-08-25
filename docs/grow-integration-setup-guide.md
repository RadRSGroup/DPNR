# Setting up the Grow payment integration

A practical, step-by-step guide to taking the Grow integration built in Session 18 (`docs/adr/0008-grow-real-api-and-webhook-verification.md`) from "code exists" to "real purchases work." The code was written entirely from Grow's public docs (`developers.grow.business`) with no sandbox access — every step below either confirms an assumption the code currently only guesses at, or turns on a piece that's deliberately not wired up yet (pricing, production credentials).

Do these roughly in order — each step either unblocks the next one or catches a wrong assumption before it costs you real money.

---

## 1. Get a Grow account and sandbox credentials

- Contact Grow's support team (the public docs repeatedly say "contact support to enable/obtain" — there's no self-service signup for API access). Ask specifically for:
  - **Sandbox** `userId`, `pageCode`, and `x-api-key` for `CreatePaymentLink`.
  - Confirmation of the **exact sandbox base URL** — public docs showed four slightly different sandbox hosts (`sandboxapi.grow.link`, `sandbox.meshulam.co.il`, `growdevcms.inmanage.com`, and an `http://` variant of the first); ask which one is current/canonical.
  - The **production base URL** — public docs only ever showed sandbox hosts. `infra/cdk/lib/api-stack.ts` currently guesses `https://api.grow.link` for production; this needs a real answer before you ever deploy with `isProduction: true`.
- **While you have them on the line, also ask**: *"Is there a server-to-server endpoint to independently check a transaction's status by `transactionId`, separate from the webhook notification?"* This is the single most important open question from ADR 0008 — public docs only surfaced `CreatePaymentLink` and `approveTransaction` (which explicitly doesn't gate anything), and the code currently works around that gap with a manual human-review step (`infra/cdk/scripts/approve-pending-purchase.ts`) that doesn't scale. If such an endpoint exists, that script should be rewritten to call it automatically instead of requiring a human to check Grow's dashboard by hand.

## 2. Store the credentials

Once you have real sandbox credentials, create the secret CDK already references (it deploys fine without this existing — it only fails if a Lambda actually tries to read it):

```bash
aws secretsmanager create-secret --name dpnr/grow-credentials --secret-string '{"apiKey":"YOUR_KEY","userId":"YOUR_USER_ID","pageCode":"YOUR_PAGE_CODE"}'
```

Never paste the real key into a chat with an agent, a commit, or `.env` files — this is the only place it should live.

## 3. Confirm the `CreatePaymentLink` response shape

`infra/cdk/lambda/credits/initiate-purchase.ts` guesses the checkout-URL field is `data.paymentPageLink` (falls back to `paymentPageUrl`/`url`). Test this directly against the sandbox, bypassing the app entirely, so a wrong guess doesn't hide behind other error handling:

```bash
curl -X POST https://sandboxapi.grow.link/api/light/server/1.0/CreatePaymentLink \
  -H "x-api-key: YOUR_SANDBOX_KEY" \
  -F "userId=YOUR_USER_ID" -F "pageCode=YOUR_PAGE_CODE" \
  -F "paymentLinkType=2" -F "isActive=1" -F "title=Test Pack" \
  -F "paymentTypes[0][type]=payments" -F "paymentTypes[0][payments][paymentsPaymentNum]=1" \
  -F "products[data][0][name]=Test Pack" -F "products[data][0][price]=1" -F "products[data][0][vatType]=1"
```

Read the real response JSON and check the field name against what `initiate-purchase.ts` expects (search for `paymentPageLink` in that file). Update the code if it's different — the handler already throws a clear `grow_response_unrecognized` error naming this exact possibility, so you'll know immediately if it's wrong rather than getting a silent `undefined`.

**Also confirm right here**: is `products[data][0][price]` in whole ILS or agorot (minor units)? The code currently passes `priceMinorUnits` straight through unconverted — a wrong guess here either overcharges or undercharges by 100x. Compare the price you sent against what the resulting checkout page actually displays.

## 4. Run one real sandbox transaction and inspect the webhook

Before touching the deployed app, get one real transaction through the sandbox checkout page yourself (a test card, if Grow's sandbox supports one — ask support). Point `notifyUrl` at a temporary tool like [webhook.site](https://webhook.site) instead of the real deployed endpoint for this first look, so you can read the raw payload before any parsing code touches it.

Confirm, and update `packages/shared-types/src/api/webhooks.ts`'s `GrowWebhookPayloadSchema` / `infra/cdk/lambda/credits/grow-webhook.ts` if any of these differ:
- **Content-type**: is the webhook body JSON or form-encoded? (`grow-webhook.ts`'s `parseWebhookBody` tries JSON first, falls back to a guessed form-decode.)
- **The real success status value**: the code checks for the Hebrew string `"שולם"`, `"paid"`, or `statusCode` `"1"`/`"0"` — see `isSuccessStatus()` in `grow-webhook.ts`. Update it to whatever the real payload actually contains.
- **Does `cField1`/`cField2` actually round-trip?** These carry `purchaseId`/`userId` — confirm they come back exactly as sent, not renamed or nested differently (e.g. `customFields.cField1` instead of a top-level `cField1`).

## 5. Point the real webhook at the deployed endpoint and test end to end

Once step 4's assumptions are corrected in code (redeploy: `cd infra/cdk && npx cdk deploy Dpnr-Api`), re-run a real sandbox transaction with `notifyUrl` set to the real deployed URL:

```
https://q8prwf7sxb.execute-api.us-east-1.amazonaws.com/v1/webhooks/payment
```

You'll need a real signed-in user to call `POST /v1/credits/purchase` first (there's no frontend button wired up yet — see step 7) to get a real `purchaseId`, and a real `PlanItem` in the catalog to purchase (see step 6). Check CloudWatch Logs for `GrowWebhookFn` to confirm the payload parsed correctly and the item moved to `awaiting_review`.

Then run the manual approval:

```bash
cd infra/cdk
npx ts-node --prefer-ts-exts scripts/approve-pending-purchase.ts --userId <cognito-sub> --purchaseId <the-purchase-id>
```

Without `--confirm` this only prints what it would do — check the printed claimed transaction details against Grow's own merchant dashboard for that same transaction before re-running with `--confirm` to actually grant the credits. This manual step is deliberate (see ADR 0008) until step 1's verification-endpoint question is answered.

## 6. Decide real pack pricing and seed it

`packages/shared-types/src/dynamo/global-tables.ts`'s `PlanItemSchema` already supports a `credit_pack` (name, credit count, price in minor units, currency). Nothing is seeded yet — this is a product decision, not a technical one. Once you've decided (e.g. "500 credits for ₪49"), add entries to `infra/cdk/scripts/plans.seed.ts` and run:

```bash
cd infra/cdk
npx ts-node --prefer-ts-exts scripts/seed-plans-catalog.ts
```

## 7. Wire up the frontend

`apps/web/src/lib/api/v1-client.ts` already has `initiatePurchase(planId)` ready to call, but nothing in the UI calls it yet — `/pricing`'s buttons are still "coming soon" copy. Once step 6 has real plans, that page needs real buttons that call `initiatePurchase()` and redirect the browser to the returned `paymentPageUrl`.

## 8. Before going to production

- Confirm the real production base URL (step 1) and update `growBaseUrl` in `infra/cdk/lib/api-stack.ts` — it's currently a guess.
- Update `api-stack.ts`'s CORS `allowOrigins` (currently `http://localhost:3000` only) once a real deployed frontend origin exists — same pre-existing backlog item as everything else that needs this.
- Revisit the manual-review step (step 1's key question) — shipping a paid product where every purchase needs a human to manually check a dashboard and run a script doesn't scale past a handful of beta users.
- A full `security-review` pass on the finished, real-credentialed flow — the one done in Session 18 was against a public-docs-only, uncredentialed implementation; re-review once real transactions are flowing.
