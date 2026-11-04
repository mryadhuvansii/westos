# Inventory service setup

The owner desk and storefront share the D1 inventory. The stock model is one store: a product contains colours; each colour contains sizes; each colour-size pair has a fixed SKU and its own physical count. The browser bag only reads availability. It never holds stock.

## Owner workflow

Use **Admin → Products** to add colours, their photos, sizes and SKUs. Use **Admin → Inventory** to recount each SKU, reserve stock against a reference, release a cancelled hold, record a sale, or add physically received and inspected sellable returns. A hold lasts 1–60 minutes. Availability excludes live holds; after expiry, it is released automatically. Repeating an operation with the same request ID and same contents has one effect. Reusing that ID for different contents is rejected.

On an older store, press **Upgrade inventory** once. It converts the existing size counts to variants under the product's original colour. It does not seed or reset products. If a historic SKU conflicts with another product, resolve that SKU in the product editor before retrying; counts remain in the old record until conversion succeeds.

## Trusted order service (future connection)

Customer checkout is not connected yet. `/api/internal/inventory` is reserved for the server-side order service. It returns `503` until `WESTOS_INVENTORY_INTERNAL_KEY` is set to a private value of at least 32 characters. Set the same value in the order service's secret store. Never place it in browser code or a `NEXT_PUBLIC_` variable. The endpoint requires `Authorization: Bearer …` and rejects browser-origin headers.

For a server-calculated order, the trusted service can send a hold request:

```http
POST /api/internal/inventory
Authorization: Bearer <private key>
Content-Type: application/json
```

```json
{
  "action": "reserveStock",
  "reference": "WESTOS-ORDER-1042",
  "holdMinutes": 15,
  "lines": [
    {"variantId": "daybreak-straight:black:32", "quantity": 1},
    {"variantId": "daybreak-straight:black:34", "quantity": 1}
  ],
  "requestId": "a7c0a8d9-4c42-4981-94d5-bf5fcbd98512"
}
```

Replace both example variant IDs with the saved product, colour ID and size. Keep the same request ID and exact request body when retrying an uncertain network request. A successful reply contains `{ "reservationId": "…" }`. An insufficient or changed stock result is a conflict; do not submit only part of a multi-SKU order.

When an approved order is cancelled, call `releaseStock` with its `reservationId`, a reason and a new stable `requestId`. Only after the order service decides that the order is accepted as sold should it call `commitStock` with the reservation ID and request ID. A commit deducts physical units exactly once. For an expired hold, try a fresh hold; do not force a deduction. If payment arrives late and stock is gone, send the order to availability/refund review.

The private endpoint supports `reserveStock`, `releaseStock`, `commitStock`, and `returnStock`. Returns require a committed reservation, its exact `variantId`, a positive quantity, a reason and `inspected: true`; quantity cannot exceed the unreturned sold units. Returning stock does not create a payment refund.

The owner page can find any saved sale or hold by its complete reference. The activity feed shows the latest 100 changes; the inventory page shows the latest 100 references plus exact reference lookup. Reference lookup avoids dropping old returns from the working owner flow. The browser bag is still a preview only, and inventory sales do not verify or collect payment.
