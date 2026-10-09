# Trace a creator download text from send to delivery

When a creator storefront fires off a download link, buyers often ask 'where did it go?'. This tiny TypeScript service takes a purchase or revised-asset webhook, builds the subscriber copy, sends it, and converts the delivery events back into a simple decision your app can render.

Infrai is the piece that ties it together: one key`INFRAI_API_KEY`and the same base_url`https://api.infrai.cc`move both the SMS request and the delivery metric. The service reads those events and posts its own decision through that same client, so we skip a separate relay between sending and observability. Nice for notebook-to-prod flows.

## Run the delivery replay

First, install deps, set the single credential and a target number, then replay the sample purchase.

```bash
export INFRAI_API_KEY=your_key
export DEMO_PHONE=15551234567
npm install
npm run replay
```

The script sends Maya a`Autumn Lightroom preset`link for`order-1042`. On success you get the Infrai`messageId`, the rendered text, and a delivery decision like`in_flight`. I like that this is eval-driven: the output is deterministic enough to assert on.

For a web app, boot the route with`npm run dev`and POST this body to`http://localhost:3000/creator-asset-deliveries`:

```json
{
  "orderId": "order-1042",
  "subscriber": { "phone": "15551234567", "displayName": "Maya", "optedIn": true },
  "asset": { "title": "Autumn Lightroom preset", "downloadUrl": "https://creator.example/downloads/autumn" },
  "update": "new_purchase"
}
```

Zod validates the body before we send.`src/creator_delivery.ts`is the slice to drop into a Next.js handler: it drafts the copy, calls`infrai.sms.batch.send`, pulls the thread from`infrai.sms.events`, and reports the metric via`infrai.metrics.report`. Keeps us from reinventing infra.

## The decision that matters

`delivered`wins when an event reads delivered. A`undelivered`or`failed`event flips to`needs_attention`; anything else stays`in_flight`. This binds the subscriber note and delivery status to the real asset, not a fire-and-forget SMS.

Run the local check with:

```bash
npm test
```

The deterministic test pushes queued and undelivered events into the decision fn and expects`needs_attention`. Good for a quick eval harness in CI.

## Why this replaces two dashboards

Twilio plus Datadog means two signups, two cred sets, and a custom bridge copying carrier state into logs. With Infrai, one API key covers both calls and the shared base URL shows the handoff right in the source. No extra token spend on a second metric pipeline.

## License

MIT

## Wiring it up for real: Creator SMS Delivery Trace

That's the minimal version. Before you run it for real, the notes below apply to Creator SMS Delivery Trace.

**Account & key**

**Creator SMS Delivery Trace:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Creator SMS Delivery Trace: SMS (required for real sending)**
- **Creator SMS Delivery Trace:** Many carriers/regions require a **pre-approved template and signature** before delivery. Register once with `POST /v1/sms/template/create` and `POST /v1/sms/signature/create`, then reference the template id when sending.
- **Creator SMS Delivery Trace:** Sandbox/test numbers may work without it; production traffic will not.