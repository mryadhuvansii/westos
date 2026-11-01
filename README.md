# WESTOS storefront

A responsive denim storefront built from the WESTOS specification files in the parent folder. The visual direction uses warm paper, deep blue, generous editorial typography, and AI-generated denim campaign imagery, with the requested [UI UX Pro Max skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) guiding the interface.

This delivery is a working frontend and a prepared YouPI payment integration. It is **not the complete commerce platform** described by the specifications. The catalog is sample data, ordering is unavailable, and payments are disabled by default. No gateway has been hosted or tested with live funds.

## Run locally

Use Node.js **24.22.1 or later** to cover the native payment bridge and the reviewed YouPI gateway's declared requirement.

From this folder:

```sh
npm install
npm run dev
```

Open `http://127.0.0.1:3000`. The payment bridge is separate and optional for browsing the storefront:

```sh
npm run payments
```

Without configuration, the bridge runs on `http://127.0.0.1:8787` in disabled mode. Its payment operations return `503 PAYMENTS_NOT_READY`. See [PAYMENT_SETUP.md](PAYMENT_SETUP.md) before configuring it.

## Included

- Homepage, searchable and filterable catalog, product pages, size selection, and fit guide.
- Shopping bag and saved pieces persisted in the current browser, with input validation when restoring saved data.
- A four-step checkout preview. Address details stay in memory while the page is mounted; no real order is submitted.
- Brand story, help, customer account preview, and an illustrative jeans buyback eligibility checker.
- Responsive layouts, keyboard focus states, native FAQ disclosure controls, accessible labels, and reduced-motion support.
- A separate payment handoff page, YouPI adapter, authenticated native Node payment bridge, and a durable SQLite payment ledger. These require a trusted order backend and a configured gateway before use.

## Verify and build

```sh
npm run check
npm run build
```

`check` runs TypeScript validation and small runnable checks for commerce logic, YouPI contracts and webhook verification, payment-ledger invariants, and API authorization. Gateway responses in these checks are simulated; they are not live gateway certification.

`build` exports the frontend to `out/`. Sites or another static host serves that directory. Static hosting does **not** run `server/payment-api.ts`, store private secrets, or host YouPI. Deploy the payment bridge and gateway separately. Use `npm run dev` for local development; this project has no `npm start` command.

The only frontend runtime dependencies are Next.js, React, and React DOM. The payment bridge uses native Node HTTP, crypto, and SQLite APIs; it adds no gateway SDK or HTTP framework.

## Where to make changes

| Area | Files |
| --- | --- |
| Sample products, prices, fits, images | `lib/catalog.ts` |
| Cart rules and browser persistence | `lib/cart.ts`, `components/store.tsx` |
| Main visual system and homepage | `app/globals.css`, `app/page.tsx` |
| Secondary shopping pages | `components/`, `app/secondary.css` |
| Story, fit guide, help | `app/story/`, `app/fit-guide/`, `app/help/`, `app/editorial.css` |
| Payment configuration and setup | `.env.example`, `PAYMENT_SETUP.md` |
| Payment adapter, API, and ledger | `server/` |
| Generated imagery and prompts | `public/images/`, `IMAGE_SOURCES.md` |

Browser storage is a convenience for this preview; it is not an inventory reservation, customer account, price authority, or payment authorization. The payment API accepts amounts only from an authenticated server-side checkout registration.

## Work still required for a live store

Replace sample catalog data with approved products, real images and size charts, inventory, and final prices. Implement the authenticated customer/order backend, server-calculated GST, shipping and coupon rules, stock reservations, order history, and fulfillment. Confirm delivery/return policies, customer support details, and buyback terms. Admin operations, warehouse management, live notifications, real 3D product assets, and the other platform modules in the source specifications are not implemented here.

Payment activation additionally depends on repairing and reviewing the identified upstream authentication and webhook-recovery issues, deploying YouPI and the bridge, connecting the trusted order service, and testing reconciliation and fulfillment end to end. See the specific findings and handoff contract in [PAYMENT_SETUP.md](PAYMENT_SETUP.md).

## Source material

The scope originates in `../WESTOS_MASTER_SPECIFICATION.md`, `../WESTOS_MODULE_MAP.md`, `../WESTOS_ARCHITECTURE_DECISIONS.md`, `../WESTOS_IMPLEMENTATION_ROADMAP.md`, and `../WESTOS_OPEN_DECISIONS.md`. Those documents describe the broader platform and unresolved business decisions; this frontend does not resolve them by inventing rules.

The gateway reference is `../youpi-reference` at commit `556bd43`. It was reviewed as source, not deployed. The image prompts and provenance are recorded in [IMAGE_SOURCES.md](IMAGE_SOURCES.md).
