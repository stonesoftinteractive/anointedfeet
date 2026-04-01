import type { SubscriberConfig, SubscriberArgs } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/utils";
import { createShippingLabelWorkflow } from "../workflows/create-shipping-label";
import { EmailService } from "../modules/email/service";

export default async function fulfillmentCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const fulfillmentModule = container.resolve("fulfillment");
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const [fulfillment] = await fulfillmentModule.listFulfillments({
    id: data.id,
  });

  // Fetch order data via link — shippo_rate_id is stored in order metadata by the frontend
  const { data: [fulfillmentWithOrder] } = await query.graph({
    entity: "fulfillment",
    fields: [
      "order.id",
      "order.email",
      "order.display_id",
      "order.metadata",
      "order.shipping_address.first_name",
    ],
    filters: { id: data.id },
  });

  const order = fulfillmentWithOrder?.order;
  const shippoRateId = order?.metadata?.shippo_rate_id as string | undefined;

  if (!shippoRateId) {
    console.log(`[Shippo] No shippo_rate_id on order ${order?.id}, skipping label creation`);
    return;
  }

  const { result } = await createShippingLabelWorkflow(container).run({
    input: { rateId: shippoRateId },
  });

  if (result.trackingNumber && result.labelUrl) {
    await fulfillmentModule.updateFulfillment(data.id, {
      labels: [
        {
          tracking_number: result.trackingNumber,
          tracking_url: result.trackingUrl ?? result.labelUrl ?? "",
          label_url: result.labelUrl,
        },
      ],
      metadata: {
        ...fulfillment.metadata,
        shippo_label_url: result.labelUrl,
        carrier: result.carrier,
      },
    });

    if (order?.email) {
      try {
        const emailService = new EmailService();
        await emailService.sendShippingNotification({
          customerEmail: order.email,
          customerName: order.shipping_address?.first_name || "Customer",
          orderNumber: order.display_id?.toString() || order.id,
          trackingNumber: result.trackingNumber,
          trackingUrl: result.trackingUrl || result.labelUrl,
          carrier: result.carrier || "Carrier",
        });
      } catch (error) {
        console.error("Failed to send shipping notification email:", error);
      }
    }
  }
}

export const config: SubscriberConfig = {
  event: "fulfillment.created",
};
