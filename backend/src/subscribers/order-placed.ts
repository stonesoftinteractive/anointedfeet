import { SubscriberArgs, SubscriberConfig } from "@medusajs/medusa";
import { IOrderModuleService } from "@medusajs/types";
import { Modules } from "@medusajs/utils";
import { EmailService } from "modules/email/service";

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const orderModuleService: IOrderModuleService = container.resolve(
    Modules.ORDER,
  );
  const emailService = new EmailService();

  try {
    // Fetch the full order details
    const order = await orderModuleService.retrieveOrder(data.id, {
      relations: ["items", "items.variant", "shipping_address"],
    });

    // Prepare order data for email
    const orderItems =
      order.items?.map((item: any) => {
        const unitPrice = item.unit_price ? Number(item.unit_price) / 100 : 0;
        return {
          title: item.title || item.variant_title || "Product",
          quantity: item.quantity,
          price: `$${unitPrice.toFixed(2)}`,
        };
      }) || [];

    const customerName = order.shipping_address?.first_name || "Customer";
    const orderTotal = order.total ? Number(order.total) / 100 : 0;

    await emailService.sendOrderConfirmation({
      customerEmail: order.email || "",
      customerName,
      orderNumber: order.display_id?.toString() || order.id,
      orderTotal: `$${orderTotal.toFixed(2)}`,
      orderItems,
      orderDate: new Date(order.created_at).toLocaleDateString(),
    });

    console.log(
      `Order confirmation email sent for order ${order.display_id || order.id}`,
    );
  } catch (error) {
    console.error("Error in order placed handler:", error);
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
};
