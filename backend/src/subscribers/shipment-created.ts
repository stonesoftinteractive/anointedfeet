import type { SubscriberConfig, SubscriberArgs } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/utils";
import { EmailService } from "../modules/email/service";

export default async function shipmentCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ order_id: string; fulfillment_id: string }>) {
  console.log(
    `[Email] order.shipment_created triggered for order: ${data.order_id}, fulfillment: ${data.fulfillment_id}`
  );

  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    const {
      data: [orderData],
    } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "email",
        "shipping_address.first_name",
        "fulfillments.id",
        "fulfillments.metadata",
        "fulfillments.labels.tracking_number",
        "fulfillments.labels.tracking_url",
        "fulfillments.labels.label_url",
      ],
      filters: { id: data.order_id },
    });

    if (!orderData?.email) {
      console.log(
        `[Email] No email found for order ${data.order_id}, skipping notification`
      );
      return;
    }

    // Find the fulfillment that was just shipped
    const fulfillment = data.fulfillment_id
      ? orderData.fulfillments?.find((f: any) => f.id === data.fulfillment_id)
      : orderData.fulfillments?.[orderData.fulfillments.length - 1];

    // Skip if this fulfillment was handled by the Shippo auto-flow
    if ((fulfillment?.metadata as any)?.shippo_label_url) {
      console.log(
        `[Email] Fulfillment ${fulfillment?.id} was handled by Shippo auto-flow, skipping duplicate notification`
      );
      return;
    }

    const labels: any[] = fulfillment?.labels || [];
    const latestLabel = labels[labels.length - 1];

    if (!latestLabel?.tracking_number) {
      console.log(
        `[Email] No tracking number found for fulfillment ${fulfillment?.id}, skipping notification`
      );
      return;
    }

    const emailService = new EmailService();
    await emailService.sendShippingNotification({
      customerEmail: orderData.email,
      customerName: orderData.shipping_address?.first_name || "Customer",
      orderNumber: orderData.display_id?.toString() || orderData.id,
      trackingNumber: latestLabel.tracking_number,
      trackingUrl: latestLabel.tracking_url || "",
      labelUrl: latestLabel.label_url || "",
      carrier: "Carrier",
    });

    console.log(
      `[Email] Shipping notification sent for order ${data.order_id}`
    );
  } catch (error) {
    console.error("[Email] Failed to send shipping notification:", error);
  }
}

export const config: SubscriberConfig = {
  event: "order.shipment_created",
};
