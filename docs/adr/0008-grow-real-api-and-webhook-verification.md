# ADR 0008 — Grow's real API shape, and webhook verification without a signature

**Status:** Accepted (2026-08-25)

**Supersedes:** ADR 0003's "Payment provider for Credits" section, specifically its framing of `apps/web/src/lib/grow.ts`/`webhooks/grow/route.ts` as "the starting point... not a throwaway." That code (and `packages/shared-types/src/api/webhooks.ts`'s `GrowWebhookEventSchema`, `dashboard-twin-credits.ts`'s `CreditsPurchaseRequest/ResponseSchema`) was written before anyone had read Grow's real API docs — it's pre-migration, Supabase-based, targets a fabricated endpoint (`https://api.grow.co.il/v1/checkout/sessions`) that doesn't exist, and assumes a client-tokenized/synchronous purchase model Grow's real API doesn't support. ADR 0003's decision to keep Grow as the provider stands; everything else about *how* to integrate with it is corrected here.

## What Grow's real API actually looks like

Read directly from `developers.grow.business` (formerly `grow-il.readme.io`, Grow was formerly branded Meshulam) during this session — an Israeli payment gateway with no public sandbox access of our own yet, so this is public-docs research, not a live-tested integration.

- **Checkout initiation**: `POST /api/light/server/1.0/CreatePaymentLink` (sandbox host: `sandboxapi.grow.link`). Auth is `x-api-key` header plus `userId`/`pageCode` merchant identifiers (not a Bearer secret key). Body is `multipart/form-data`, not JSON. Takes `products[data][0][name/price/vatType]`, `notifyUrl` (server-to-server webhook target), `successUrl` (browser redirect after payment), and up to 9 opaque `cField1`–`cField9` custom fields that Grow echoes back verbatim in the webhook.
- **Webhook**: delivered to `notifyUrl` with `data.transactionId`, `data.transactionToken`, `data.sum`, `data.status`/`data.statusCode`, payer info, and the echoed custom fields.
- **No HMAC/signature exists.** Confirmed by a second, targeted search specifically for Grow/Meshulam webhook signature verification — nothing surfaced beyond generic third-party "how HMAC webhooks work" articles. Grow's only built-in acknowledgment mechanism is `POST /api/light/server/1.0/approveTransaction`, which the receiver calls after the webhook, echoing back the received fields — explicitly documented as not gating the transaction itself ("the transaction will be processed even if the ApproveTransaction request is not executed or fails").

## Decision: purchaseId-echo correlation, PLUS mandatory human review before any credit is granted

Since the provider has no signature scheme, a server-generated, per-purchase random `purchaseId` (`randomUUID()`) is passed as `cField1` at checkout-initiation time (with the user's own id as `cField2`, since nothing else in the webhook payload identifies which of our users it belongs to), and the webhook only proceeds if a matching `PendingPurchaseItem` it itself wrote exists with status `pending`, additionally checking the webhook's `sum` against that item's own snapshotted `expectedPriceMinorUnits`.

**This alone is NOT sufficient and does not close ADR 0003's "forged payment event" risk.** A security-review pass caught the real gap during this session: `purchaseId`/`userId` correlation only proves a webhook call references a purchase this backend actually initiated — it does not prove the payment happened. A genuine, legitimate user can call `POST /v1/credits/purchase` themselves, receive a real `purchaseId`, never actually pay, then POST directly to `/v1/webhooks/payment` with their own real `purchaseId`/`userId`, a `sum` matching the plan price they already know, and a plausible status value — and nothing described above would catch it, since neither `CreatePaymentLink` nor `approveTransaction` (the only two Grow endpoints found in public docs) let the receiver independently confirm a transaction's status against Grow's own systems. `approveTransaction` is explicitly documented as not gating the transaction either way.

**Actual decision, given no verification endpoint was found**: `credits/grow-webhook.ts` never calls `grantCredits`. A payload that passes every check above only moves the `PendingPurchaseItem` to `awaiting_review`, storing Grow's claimed `transactionId`/`transactionToken` unverified. `infra/cdk/scripts/approve-pending-purchase.ts` is the only path that actually grants credits — run manually, by a human, after they've independently confirmed the transaction in Grow's own merchant dashboard (which a forger cannot fake, unlike a webhook payload). This closes the gap through human-in-the-loop review, not automated verification, and is explicitly a stopgap: it doesn't scale past a handful of beta purchases and should be replaced the moment either (a) Grow support confirms a real transaction-status-verification endpoint exists (ask directly — this ADR's research was public-docs-only and may have missed one), or (b) some other automatable confirmation mechanism is found.

**Consequence:** this flow is NOT launch-ready for real, unattended purchase volume as built. It is safe to deploy (the unauthenticated route can only ever move a `PendingPurchaseItem` into a review queue, never grant credits on its own), but every real purchase needs a human to manually run the approval script until the verification-endpoint question is resolved.

## What's still genuinely unconfirmed

No real sandbox credentials existed during this session (the user will contact Grow support separately to obtain them). The following are informed guesses from public docs, each flagged in code with a comment and defensive handling (a clear thrown error on a shape mismatch, not a silent wrong-field read), and MUST be corrected against a real sandbox transaction before this is trusted with real money:
- The exact response field name for the checkout page URL (not detailed in the public reference page).
- The webhook's actual content-type (JSON vs. form-encoded — the reference page didn't state it).
- The exact success status value/code in `data.status`/`data.statusCode`.
- Whether `price`/`sum` are major or minor currency units.
- The real production base URL (public docs only show sandbox hosts).

## Consequence for existing code

- `apps/web/src/lib/grow.ts`, `apps/web/src/app/api/webhooks/grow/route.ts`, `apps/web/src/app/api/checkout/route.ts` are deleted (Session 18) rather than kept as reference — they're Supabase-era, target a fictional endpoint, and every other pre-migration Next.js API route in this project was deleted once its `/v1` Lambda equivalent existed, not kept around.
- `CreditsPurchaseRequestSchema`/`CreditsPurchaseResponseSchema` and `GrowWebhookEventSchema`/`PaymentWebhookResponseSchema` are corrected in place (same file, same exported names where reasonable) to match the real checkout-link/webhook flow instead of the fictional tokenized/synchronous one.
