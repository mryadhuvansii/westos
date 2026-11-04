# YouPI integration setup

The WESTOS payment integration is prepared for the gateway source in `../youpi-reference` at commit **`556bd43`**. The gateway is not hosted, there are no configured merchant credentials, and no live funds have been used. Payments remain disabled by default. This document is a setup and handoff guide, not confirmation that payments are ready for production.

## Deployment shape

```text
WESTOS storefront + owner admin (Sites Worker, D1 + R2)
  -> separate WESTOS payment bridge (native Node HTTP + SQLite)
  -> your hosted YouPI API and checkout portal

Trusted WESTOS order backend -> authenticated checkout registration
YouPI signed webhook -> payment bridge -> durable payment ledger
Future order/fulfillment consumer <- verified ledger outcome
```

Sites hosts the storefront and owner admin server with D1/R2. The native Node/SQLite payment bridge remains a separate service and is not bundled into the Worker. Use Node.js **24.22.1 or later** for the deployment; this is also the reviewed upstream gateway's declared minimum. Host the gateway separately using its installation/deployment documentation after addressing the findings below.

The storefront checkout is still a sample journey. It does not calculate a trusted final total, reserve stock, register an order, or start payment. A trusted WESTOS order backend must implement those steps before it can give a customer an approved payment handoff.

## Receiving UPI setting

The owner admin stores the intended receiving UPI, initially **vijay@upi**, under Settings → Receiving UPI. Changes persist in D1, but do not call the gateway, alter its active receiving account, enable payments or verify bank ownership. When YouPI is hosted, configure the dedicated merchant's matching receiving account through the gateway administration tools. Avoid replacing an account while it has in-flight payment sessions. The gateway's active merchant account, not the storefront setting, determines the actual payment destination.

## Configuration

Copy `.env.example` to `.env.local` in this folder and supply real deployment values when ready. `.env.local` is ignored by Git. Do not put secrets in `NEXT_PUBLIC_` variables, browser code, public build output, or a chat message.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_WESTOS_API_URL` | Public URL of the WESTOS payment bridge, embedded at frontend build time. Leave empty for the standalone preview. |
| `WESTOS_PAYMENTS_ENABLED` | Defaults to `false`. Keep disabled until the deployment and verification steps are complete. |
| `WESTOS_STOREFRONT_ORIGIN` | Exact frontend origin, without a path. Used for allowed browser origins, handoff, and return URLs. |
| `WESTOS_PAYMENT_PORT` | Bridge listener port; default `8787`. It binds to `127.0.0.1`. |
| `WESTOS_PAYMENT_DB` | Durable SQLite path; default `.local/payments.sqlite`. Keep it private and back it up. |
| `WESTOS_CHECKOUT_INTERNAL_KEY` | Server-only key shared with the trusted order backend; at least 32 random URL-safe characters. |
| `YOUPI_API_URL` | Bare origin of your hosted YouPI API. |
| `YOUPI_CHECKOUT_ORIGIN` | Bare origin of your hosted YouPI checkout portal. Redirects are checked against it. |
| `YOUPI_MERCHANT_ID` | UUID of a dedicated WESTOS merchant. Use a non-default merchant, not the seeded demo merchant. |
| `YOUPI_MERCHANT_KEY` | Backend-only API credential for that merchant. |
| `YOUPI_WEBHOOK_SECRET` | Backend-only webhook signing secret for that merchant; at least 32 characters. |

The localhost URLs in `.env.example` are development placeholders, not deployed services. Use HTTPS for deployed API and checkout origins. The bridge binds locally; place it behind a properly configured HTTPS reverse proxy and restrict the internal registration route to the order backend. Match the frontend origin exactly, including port in local development.

Create and configure the dedicated merchant in YouPI, including its receiving account, valid API credential, webhook secret, and webhook URL:

```text
https://<your-bridge-host>/v1/payments/webhook
```

Set the gateway's own API and checkout runtime URLs to your deployed services. Do not reuse the default merchant's permissive demo integration. Secrets belong in the server's environment or secret store. `YOUPI_MERCHANT_KEY` and `YOUPI_WEBHOOK_SECRET` have separate roles even if an upstream installation has a legacy credential arrangement; verify the dedicated merchant's actual credentials.

Run the bridge from this folder:

```sh
npm run payments
```

This runs `server/payment-api.ts` with `.env.local` and Node's native TypeScript support. Rebuild and redeploy the frontend after changing `NEXT_PUBLIC_WESTOS_API_URL`:

```sh
npm run check
npm run build
```

## Trusted checkout handoff

1. The WESTOS order backend authenticates the customer or guest checkout, validates product variants and stock, calculates the final price, GST, discounts, and shipping, and reserves inventory. It owns the immutable order total and approval expiry.
2. That backend calls `POST /internal/checkouts` with `Authorization: Bearer <WESTOS_CHECKOUT_INTERNAL_KEY>`. This is a server-to-server request, not a browser request. Send exactly:

   ```json
   {
     "orderId": "WESTOS-APPROVED-ORDER-ID",
     "amountPaise": 189900,
     "expiresAt": 1790000000000
   }
   ```

   The values above illustrate the shape only. Use the actual server-calculated integer amount in paise and a future Unix timestamp in milliseconds. The example timestamp is not a usable approval expiry. No client-supplied cart total is authoritative.
3. A successful response includes `orderId`, an unpredictable `accessToken`, and `handoffUrl`. The backend gives that URL only to the customer entitled to pay the order. Store or return it securely: duplicate registration does not reissue the token.
4. The handoff URL has this form: `/payment/#orderId=...&token=...`. The payment page moves the per-order bearer token into session storage and removes the fragment from the visible URL. Treat the handoff URL and token as credentials; do not log or share them.
5. The payment page starts the payment using only the approved order ID and bearer token. The bridge loads the amount from its private ledger, creates a UPI session with `Idempotency-Key: <orderId>`, verifies the response identity and exact amount, and returns an allowlisted checkout URL.
6. The gateway returns the customer to `/payment/?return=1`. That redirect does not prove payment. The frontend reads the authenticated durable payment status while the bridge waits for a verified reconciliation webhook.

## Bridge routes

| Route | Authorization and purpose |
| --- | --- |
| `GET /v1/payments/config` | Reports the configured provider and whether the bridge is enabled. |
| `POST /internal/checkouts` | Internal backend bearer key; registers `orderId`, integer `amountPaise`, and future numeric `expiresAt`. Rejects browser-origin requests. |
| `POST /v1/payments/session` | Per-order bearer token; body is only `{ "orderId": "..." }`. Creates or reuses that order's approved attempt. |
| `GET /v1/payments/:orderId` | Per-order bearer token; reads durable status and, where available, gateway status. |
| `POST /v1/payments/webhook` | Validates the gateway's timestamped HMAC signature over the raw body and matching event headers, then records the authenticated receipt. |

When disabled, payment routes return `503 PAYMENTS_NOT_READY`; the configuration route remains readable. The browser never receives merchant or internal checkout keys. The bridge does not accept browser amounts, taxes, shipping prices, or coupon adjustments.

## What counts as paid

A WESTOS order becomes `paid` only after a verified webhook has all of the following:

- `event: RECONCILED`, `method: UPI`, `currency: INR`, and consistent settlement state.
- The exact expected order ID, gateway payment ID, and amount in integer paise.
- A valid 12-digit UTR that is not already assigned to another order.
- A valid timestamped signature, matching signed headers, and a durably recorded delivery ID.

`OBSERVED_SUCCESS` means an alert was observed and remains pending. `SUCCESS` from COD or a counter collection is not proof of a paid UPI order. A QR scan, browser callback, payment screenshot, or redirect cannot mark an order paid.

At this upstream revision, reconciliation requires an operator to import a downloaded **bank-statement CSV** and match receiving account, amount, and reference. There is no automatic bank API or scheduled statement pull. Plan an operational process for reconciliation and exceptions before enabling customer orders.

The gateway status lookup omits the UTR needed for the durable receipt. The bridge checks returned identity and amount but does not promote an order to `paid` from a status GET; it needs the verified webhook. Duplicate deliveries are recorded idempotently, a paid order cannot be downgraded, and a UTR cannot pay two orders.

## Upstream findings that block activation

These are static source-review findings against `556bd43`, not a claim that a hosted gateway was penetrated or certified. The reference checkout was not modified as part of this storefront integration.

| Finding | Source and required repair |
| --- | --- |
| Generic observer intake has an authentication gap | `apps/payment-api/src/auth-guard.js` permits an observer-level request with an `X-Device-Id` to continue. `routes/pollers.routes.js` checks that the supplied device ID exists and is active on `/api/v1/pollers/events`, but does not prove possession of a device secret/signature on that generic path. Require authenticated device possession and validate the resolved merchant/account binding before processing the observation. |
| First webhook dispatch and durable outbox handling conflict | `packages/core/src/webhook-engine.js` inserts a delivery before a later transaction checks for an existing delivery. The transaction can find the just-inserted row and return before sending or cleaning the outbox. Consolidate creation/claim/cleanup into one durable path, then test initial delivery and retries across crashes. |
| Recovery contains an unresolved symbol and inconsistent historical handling | `recoverMissingDeliveries()` calls `isTerminalStatus` without importing or defining it, and scans legacy terminal rows despite the newer outbox approach. Repair recovery, define the intended historical behavior, and verify boot recovery, exhausted retries, duplicate delivery, and missing-webhook configuration recovery. |

The WESTOS bridge's stricter receipt rules do not repair the upstream gateway. Keep production payment activation blocked until these issues are fixed and independently reviewed, and the complete flow has passed controlled integration tests.

## Remaining integration work

- Deploy and configure the gateway, its checkout portal, dedicated merchant, receiving account, observer setup, and the HTTPS bridge. Confirm the upstream project's license and deployment requirements.
- Build the trusted order service and use its final amount and stock reservation to register checkout approvals. The sample storefront cannot supply this trust boundary.
- Add an idempotent order/fulfillment consumer or transactional outbox. The bridge records payment outcomes; it does not automatically fulfill an order, release stock, send notifications, or issue refunds.
- The single-store inventory service now supports holds, cancellation, stock sale and inspected returns (see `INVENTORY_SETUP.md`). It is not wired to this bridge. Use stable request IDs when a future order consumer calls it. If a verified payment arrives after its hold expires, do not force a stock deduction: attempt a fresh hold and send unavailable orders to fulfillment/refund review. Stock-sale status is not payment confirmation; restocking a physical return does not issue a refund.
- Keep one bridge process for the current SQLite/request-coalescing design. Multiple replicas require a shared durable coordination/lease strategy. Each approval allows one gateway attempt; a different attempt needs a new order ID and an order-service retry policy.
- Test signed webhooks, exact amount/identity rejection, reconciliation, cancellation, expiry, restart recovery, duplicate delivery, manual-review handling, and missing/late notifications with the repaired hosted gateway. The local runnable checks use simulated responses and do not establish live readiness.

Upstream references, all under `../youpi-reference/docs/`: `INSTALLATION.md`, `DEPLOYMENT.md`, `CONFIGURATION.md`, `OBSERVERS_SETUP.md`, and `MERCHANT_INTEGRATION.md`. No live payment or hosting action is required to inspect this integration.
