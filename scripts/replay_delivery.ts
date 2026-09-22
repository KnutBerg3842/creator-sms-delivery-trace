import { deliveryRequest, sendCreatorAsset } from "../src/creator_delivery.js";

const input = deliveryRequest.parse({
  orderId: "order-1042",
  subscriber: { phone: process.env.DEMO_PHONE, displayName: "Maya", optedIn: true },
  asset: { title: "Autumn Lightroom preset", downloadUrl: "https://creator.example/downloads/autumn" },
  update: "new_purchase",
});

console.log(await sendCreatorAsset(input));
