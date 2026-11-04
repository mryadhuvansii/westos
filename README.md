# WESTOS storefront and owner desk

WESTOS has a denim-room storefront and a server-backed owner admin panel. The rail keeps the Garuda-inspired dark showroom design, with original generated garment imagery. The requested UI UX Pro Max skill guides the interface.

**Current delivery status:** the admin and single-store inventory update is being validated locally. Publishing is pending repository access approval; the previously published static storefront remains online. The source described below is the new server-backed version.

Products, colour-size stock, reservations, stock sales, inspected returns and settings use shared D1 storage; uploaded photos use R2. Customer orders, customer authentication, fulfillment and live payments are still unavailable. The eight starter products are samples and begin with **zero stock**. This phase manages one store/warehouse.

## Owner operations

See [ADMIN_GUIDE.md](ADMIN_GUIDE.md) for the Hindi/Roman operating guide. After this update is published, open `/admin/` and sign in with the site's owner ChatGPT account. There is no default admin password.

The owner email is configured privately as `WESTOS_OWNER_EMAIL` in Sites runtime settings. The first authorized **Set up store management** action locks admin access to that platform user's stable ID. Later visitors cannot become the owner by using the same email with a different identity. No arbitrary first-user enrollment is allowed. Preserve the site's current owner-private audience.

- **Products:** add/edit name, price, MRP, fit, description and visibility. One product supports multiple colours, up to six photos per colour and independent colour-size SKUs. New addresses work without rebuilding; saved addresses and existing SKUs remain fixed.
- **Inventory:** see physical, reserved and available quantities per SKU. Recount with a reason; reserve several SKUs together; release cancellations; record a stock sale once; receive inspected partial returns. Expired holds stop reducing availability automatically. Conflicting counts and overselling are rejected. Recording a stock sale does not confirm payment.
- **Photos:** JPEG, PNG and WebP uploads, maximum 5 MB. SVG and external image URLs are not accepted.
- **Settings:** receiving UPI defaults to `vijay@upi`; this stores the intended destination only and does not change or activate YouPI. Buyback defaults off; its switch controls program information, promotions and the preliminary checklist. It cannot enable claims, credits or discounts.
- **Activity:** the last 100 changes are shown; the database retains the history.

Changes survive browser/device changes. The storefront refreshes shared data on focus and every 30 seconds while visible. Reload for an immediate fresh view. The bag and wishlist still belong to the current browser. The bag keeps colours separate; zero available stock prevents adding that variant. The bag never reserves inventory. Existing stores use the admin's one-time **Upgrade inventory** action, which preserves old stock under the original colour.

## Run locally

Use Node.js 24.22.1 or later before deploying the separately hosted YouPI gateway. Local validation in this environment used Node 24.21.0 successfully.

```sh
npm install
npm run build
```

On the first local setup, apply the schema once (do not replay an already-applied migration):

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_crazy_lester.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_lyrical_micromax.sql
npm run dev
```

The portable preview defaults to `http://127.0.0.1:5173`. To choose port 3100, use `npm run dev -- --port 3100 --hostname 127.0.0.1`. Open `/admin/`, sign in with the **local development identity** (`seedy@sites.test`), then set up store management. This identity is simulated only in the development build; it is not a production admin account or password.

Local D1/R2 data in `.wrangler/state` is separate from hosted data and is never packaged. The test quantities, uploaded image and archived QA product created during verification remain local only.

## Verify and publish

```sh
npm run check
npm run build
```

`check` covers TypeScript, colour-aware commerce rules, inventory transitions and retry safety, payment adapter/ledger/API invariants, owner authorization, conflicting saves, settings validation and upload boundaries. Payment tests use a mock gateway and loopback HTTP, not real funds.

Optional integration check while the local development server is running:

```sh
node tests/admin-http.test.mjs http://127.0.0.1:3100
```

This check refuses non-loopback hosts, creates an archived QA product and a photo locally, and restores the original settings. It checks identity rejection, two colours sharing one size, holds, cancellation, stock sale, bounded returns, repeated requests, a new detail page without rebuild, image round-trip and buyback visibility. It is not a browser interaction test. The browser rail self-check remains in `tests/rail.browser.js`.

The app now uses the supported Sites Vinext/Cloudflare Worker build rather than a static Next export. `dist/` is generated; `.openai/hosting.json` retains the existing Site ID and declares `DB`/`BUCKET`. The Sites publishing workflow provisions hosted storage and applies the schema-only Drizzle migrations. Seed sample records are created only by the authorized setup action. Build dependencies support this hosting/runtime change; no UI library or gateway SDK was added.

Production requires the `WESTOS_OWNER_EMAIL` runtime secret before the initial owner setup. Published admin routes enforce identity on every request; write routes also enforce same-origin requests. Do not proxy to the app with untrusted authenticated-user headers.

`npm start` previews the built Worker locally, without the development sign-in simulation. `npm run dev` is the intended interactive admin preview.

## Payments

The native Node payment bridge remains a **separate service**; the Worker does not run its Node SQLite server. `npm run payments` starts it in disabled mode unless configured. The selected YouPI gateway still needs hosting, merchant setup and the fixes described in [PAYMENT_SETUP.md](PAYMENT_SETUP.md). Saving a UPI ID in the owner desk cannot verify bank ownership or configure that absent gateway.

The checkout is a sample four-step journey. No final trusted order total, tax/shipping calculation or order submission is implemented. Its last button stays disabled. Inventory reservations are implemented separately and have not been connected to customer checkout or payment receipts. The payment handoff accepts only future server-approved orders; no direct UPI payment link or client-side paid flag was added. See [INVENTORY_SETUP.md](INVENTORY_SETUP.md) for the private stock integration contract.

## Source map

| Area | Files |
| --- | --- |
| Owner desk and guide | `app/admin/`, `components/admin-panel.tsx`, `ADMIN_GUIDE.md` |
| Shared products/settings and authorization | `lib/operations.ts`, `server/store-data.ts`, `app/api/` |
| Storage schema | `db/schema.ts`, `drizzle/` |
| Stock-aware bag and shared refresh | `lib/cart.ts`, `components/store.tsx` |
| Initial sample products only | `lib/catalog.ts` |
| Main showroom | `app/room.css`, `components/denim-room.tsx` |
| Payment bridge/ledger/adapter | `server/payment-api.ts`, `server/payment-ledger.ts`, `server/youpi.ts` |
| Generated imagery | `public/images/`, `IMAGE_SOURCES.md` |

After initialization, editing `lib/catalog.ts` does not overwrite the database: use the admin panel. Catalog cards open the product photo page, which shows pictures for the selected colour. Tapping a pair in the Denim Room opens a rotatable front/side/back 3D-style fit illustration in its saved wash and fit. Arrow buttons and the slider also work without dragging. This is an illustration, not a scan of that exact garment; product-accurate photographic 360° viewing still needs real turntable photos or a garment model.

## Remaining live-store work

Approve actual products and policies; implement customer/order backend, server-calculated tax/shipping/discounts, order history, fulfillment, customer return/refund workflows and real buyback claims. Connect approved orders and verified payment outcomes to the stock operations. Staff roles, independent admin MFA policy, multi-warehouse movements, order notifications and true 3D product models are outside this inventory phase.

Original scope: the five `WESTOS_*.md` documents in the parent directory. YouPI source reviewed at `../youpi-reference`, commit `556bd43`; it was not deployed or modified. See the gateway setup findings before accepting money.
