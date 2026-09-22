import assert from "node:assert/strict";
import test from "node:test";
import { decideDelivery } from "../src/creator_delivery.js";

test("marks a subscriber delivery for attention when a carrier reports it as undelivered", () => {
  assert.equal(decideDelivery([{ status: "queued" }, { status: "undelivered" }]), "needs_attention");
  assert.equal(decideDelivery([{ status: "delivered" }]), "delivered");
});
