import type { SubscriberConfig, SubscriberArgs } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/utils";
import { EmailService } from "../modules/email/service";

export default async function shipmentCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string; no_notification: boolean }>) {
  console.log(
    `[Email] shipment.created triggered for fulfillment: ${data.id}`
  );

  if (data.no_notification) {
    console.log(`[Email] no_notification=true, skipping email`);
    return;
  }

  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    // Look up the fulfillment directly by ID (event payload `id` is the fulfillment ID)
    const {
      data: [fulfillment],
    } = await query.graph({
      entity: "fulfillment",
      fields: [
        "id",
        "metadata",
        "labels.tracking_number",
        "labels.tracking_url",
        "labels.label_url",
        "order.id",
        "order.display_id",
        "order.email",
        "order.shipping_address.first_name",
      ],
      filters: { id: data.id },
    });

    if (!fulfillment?.order?.email) {
      console.log(
        `[Email] No email found for fulfillment ${data.id}, skipping notification`
      );
      return;
    }

    // Skip if this fulfillment was already handled by the Shippo auto-flow
    if ((fulfillment.metadata as any)?.shippo_label_url) {
      console.log(
        `[Email] Fulfillment ${data.id} was handled by Shippo auto-flow, skipping duplicate notification`
      );
      return;
    }

    const labels: any[] = fulfillment.labels || [];
    const latestLabel = labels[labels.length - 1];

    if (!latestLabel?.tracking_number) {
      console.log(
        `[Email] No tracking number on fulfillment ${data.id}, skipping notification`
      );
      return;
    }

    const order = fulfillment.order;
    const emailService = new EmailService();
    await emailService.sendShippingNotification({
      customerEmail: order.email,
      customerName: order.shipping_address?.first_name || "Customer",
      orderNumber: order.display_id?.toString() || order.id,
      trackingNumber: latestLabel.tracking_number,
      trackingUrl: latestLabel.tracking_url || "",
      labelUrl: latestLabel.label_url || "",
      carrier: "Carrier",
    });

    console.log(`[Email] Shipping notification sent for fulfillment ${data.id}`);
  } catch (error) {
    console.error("[Email] Failed to send shipping notification:", error);
  }
}

export const config: SubscriberConfig = {
  event: "shipment.created",
};
