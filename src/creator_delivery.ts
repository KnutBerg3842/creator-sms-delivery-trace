import { z } from "zod";
import { infrai } from "./infrai.js";

export const deliveryRequest = z.object({
  orderId: z.string().min(1),
  subscriber: z.object({
    phone: z.string().min(8),
    displayName: z.string().min(1),
    optedIn: z.literal(true),
  }),
  asset: z.object({
    title: z.string().min(1),
    downloadUrl: z.string().url(),
  }),
  update: z.enum(["new_purchase", "revised_asset"]),
});

export type DeliveryRequest = z.infer<typeof deliveryRequest>;
export type DeliveryDecision = "delivered" | "in_flight" | "needs_attention";

type SmsEvent = { status?: string };

export function prepareCreatorText(input: DeliveryRequest) {
  const update = input.update === "revised_asset" ? "Updated download" : "Your download";
  return `${input.subscriber.displayName}, ${update}: ${input.asset.title} ${input.asset.downloadUrl}`;
}

export function decideDelivery(events: SmsEvent[]): DeliveryDecision {
  const statuses = events.map((event) => event.status?.toLowerCase());
  if (statuses.includes("delivered")) return "delivered";
  if (statuses.some((status) => status === "undelivered" || status === "failed")) return "needs_attention";
  return "in_flight";
}

export async function sendCreatorAsset(input: DeliveryRequest) {
  const text = prepareCreatorText(input);
  const sent = await infrai.sms.batch.send(
    { messages: [{ to: input.subscriber.phone, text }] },
    `creator-asset-${input.orderId}`,
  );
  const events = (await infrai.sms.events(sent.message_id)) as SmsEvent[];
  const decision = decideDelivery(events);

  await infrai.metrics.report(
    {
      name: "creator_asset_sms_delivery",
      value: decision === "delivered" ? 1 : 0,
      type: "gauge",
      tags: { order_id: input.orderId, update: input.update, decision },
    },
    `creator-asset-metric-${input.orderId}`,
  );

  return { messageId: sent.message_id, decision, text };
}
