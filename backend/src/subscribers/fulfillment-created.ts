import type { SubscriberConfig, SubscriberArgs } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/utils";
import { createShippingLabelWorkflow } from "../workflows/create-shipping-label";
import { EmailService } from "../modules/email/service";

export default async function fulfillmentCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ order_id: string; fulfillment_id: string }>) {
  console.log(`[Shippo] order.fulfillment_created triggered for fulfillment: ${data.fulfillment_id}`);

  const fulfillmentModule = container.resolve("fulfillment");
  const [fulfillment] = await fulfillmentModule.listFulfillments(
    { id: data.fulfillment_id },
    { relations: ["items"] }
  );

  console.log(`[Shippo] fulfillment.data:`, JSON.stringify(fulfillment?.data));

  // shippo_rate_id is stored in fulfillment.data by ShippoFulfillmentService.createFulfillment()
  const shippoRateId = (fulfillment.data as any)?.shippo_rate_id as string | undefined;

  if (!shippoRateId) {
    console.log(`[Shippo] No shippo_rate_id on fulfillment ${data.fulfillment_id}, skipping label creation`);
    return;
  }

  const { result } = await createShippingLabelWorkflow(container).run({
    input: { rateId: shippoRateId },
  });

  if (result.trackingNumber && result.labelUrl) {
    await fulfillmentModule.updateFulfillment(data.fulfillment_id, {
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

    // Send shipping notification email to customer
    try {
      const query = container.resolve(ContainerRegistrationKeys.QUERY);
      const { data: [fulfillmentWithOrder] } = await query.graph({
        entity: "fulfillment",
        fields: [
          "order.id",
          "order.email",
          "order.display_id",
          "order.shipping_address.first_name",
        ],
        filters: { id: data.fulfillment_id },
      });

      const order = fulfillmentWithOrder?.order;
      if (order?.email) {
        const emailService = new EmailService();
        await emailService.sendShippingNotification({
          customerEmail: order.email,
          customerName: order.shipping_address?.first_name || "Customer",
          orderNumber: order.display_id?.toString() || order.id,
          trackingNumber: result.trackingNumber,
          trackingUrl: result.trackingUrl || result.labelUrl,
          carrier: result.carrier || "Carrier",
        });
      }
    } catch (error) {
      console.error("Failed to send shipping notification email:", error);
    }
  }
}

export const config: SubscriberConfig = {
  event: "order.fulfillment_created",
};
