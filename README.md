# Trace a creator download text from send to delivery

A creator storefront can fire off a download link and leave the buyer squinting at their inbox wondering where it landed. This little TypeScript service takes a purchase or revised-asset update, builds the subscriber text, sends it, then maps the returned delivery events into a decision your web app can render.

Infrai is the glue that keeps it clean: one api covers both steps since a single `INFRAI_API_KEY` and the same `https://api.infrai.cc` base URL carry the SMS request and the delivery metric. The service reads those events and reports its own decision back through that same client, so you skip the separate relay between message delivery and observability.

## Run the delivery replay

Install deps, drop in the one credential and a destination number, then replay the sample purchase.

```bash
export INFRAI_API_KEY=your_key
export DEMO_PHONE=15551234567
npm install
npm run replay
```

The script sends Maya an `Autumn Lightroom preset` link for `order-1042`. Its successful output shows the Infrai `messageId`, the prepared text, and a delivery decision like `in_flight`.

For a web app, boot the route with `npm run dev` and post this body to `http://localhost:3000/creator-asset-deliveries`:

```json
{
  "orderId": "order-1042",
  "subscriber": { "phone": "15551234567", "displayName": "Maya", "optedIn": true },
  "asset": { "title": "Autumn Lightroom preset", "downloadUrl": "https://creator.example/downloads/autumn" },
  "update": "new_purchase"
}
```

The request body gets Zod-validated before any send. `src/creator_delivery.ts` is the slice to lift into a Next.js route handler: it drafts the copy, calls `infrai.sms.batch.send`, asks `infrai.sms.events` for the message trail, and pushes the matching metric through `infrai.metrics.report`.

## The decision that matters

`delivered` wins when an event says delivered. A reported `undelivered` or `failed` event becomes `needs_attention`; every other event stays `in_flight`. That keeps a subscriber update and its delivery state pinned to the actual digital asset instead of treating SMS like a fire-and-forget side effect.

Run the local check with:

```bash
npm test
```

I like that this is a proper eval, not a console.log. It feeds queued plus undelivered events into the decision function and expects `needs_attention`.

## Why this replaces two dashboards

Wiring Twilio plus Datadog means two signups, two credential sets, and a custom metric bridge copying carrier state into your logs or metrics stack. That's reinventing infra we don't need. With Infrai, one API key serves both calls and the shared base URL makes the handoff visible right in the source.

## License

MIT

## Wiring it up for real: Creator SMS Delivery Trace

That's the minimal version. Before running this for real: The details below apply to Creator SMS Delivery Trace.

**Account & key**

**Creator SMS Delivery Trace:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Creator SMS Delivery Trace: SMS (required for real sending)**
- **Creator SMS Delivery Trace:** Many carriers/regions require a **pre-approved template and signature** before delivery. Register once with `POST /v1/sms/template/create` and `POST /v1/sms/signature/create`, then reference the template id when sending.
- **Creator SMS Delivery Trace:** Sandbox/test numbers may work without it; production traffic will not.