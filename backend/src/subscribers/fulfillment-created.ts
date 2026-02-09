import type { SubscriberConfig, SubscriberArgs } from "@medusajs/framework";
import { createShippingLabelWorkflow } from "../workflows/create-shipping-label";

export default async function fulfillmentCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const fulfillmentModule = container.resolve("fulfillment");
  const [fulfillment] = await fulfillmentModule.listFulfillments({
    id: data.id,
  });

  // Get the selected Shippo rate from metadata
  const shippoRateId = fulfillment.metadata?.shippo_rate_id;

  if (shippoRateId) {
    const { result } = await createShippingLabelWorkflow(container).run({
      input: { rateId: shippoRateId as string },
    });

    // Update fulfillment with tracking info
    if (result.trackingNumber && result.labelUrl) {
      await fulfillmentModule.updateFulfillment(data.id, {
        labels: [
          {
            tracking_number: result.trackingNumber,
            tracking_url: result.labelUrl,
            label_url: result.labelUrl,
          },
        ],
        metadata: {
          ...fulfillment.metadata,
          shippo_label_url: result.labelUrl,
          carrier: result.carrier,
        },
      });
    }
  }
}

export const config: SubscriberConfig = {
  event: "fulfillment.created",
};
