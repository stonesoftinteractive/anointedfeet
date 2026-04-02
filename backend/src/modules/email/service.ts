import { Resend } from "resend";
import { AdminOrderNotificationEmail } from "./templates/admin-order-notification";
import { OrderConfirmationEmail } from "./templates/order-confirmation";
import { ShippingNotificationEmail } from "./templates/shipping-notification";
import { WelcomeEmail } from "./templates/welcome";

export class EmailService {
  private resend: Resend;
  private fromEmail: string;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.fromEmail =
      process.env.RESEND_FROM_EMAIL || "noreply@anointedfeetusa.com";
  }

  async sendOrderConfirmation(orderData: {
    customerEmail: string;
    customerName: string;
    orderNumber: string;
    orderTotal: string;
    orderItems: Array<{
      title: string;
      quantity: number;
      price: string;
    }>;
    orderDate: string;
  }) {
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: orderData.customerEmail,
        subject: `Order Confirmation - #${orderData.orderNumber}`,
        html: OrderConfirmationEmail({
          customerName: orderData.customerName,
          orderNumber: orderData.orderNumber,
          orderTotal: orderData.orderTotal,
          orderItems: orderData.orderItems,
          orderDate: orderData.orderDate,
        }),
      });

      if (error) {
        console.error("Error sending order confirmation email:", error);
        throw error;
      }

      console.log("Order confirmation email sent:", data);
      return data;
    } catch (error) {
      console.error("Failed to send order confirmation email:", error);
      throw error;
    }
  }

  async sendAdminOrderNotification(orderData: {
    customerName: string;
    customerEmail: string;
    orderNumber: string;
    orderTotal: string;
    orderItems: Array<{
      title: string;
      quantity: number;
      price: string;
    }>;
    orderDate: string;
  }) {
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: "info@anointedfeetusa.com",
        subject: `New Order #${orderData.orderNumber} Received`,
        html: AdminOrderNotificationEmail(orderData),
      });

      if (error) {
        console.error("Error sending admin order notification email:", error);
        throw error;
      }

      console.log("Admin order notification email sent:", data);
      return data;
    } catch (error) {
      console.error("Failed to send admin order notification email:", error);
      throw error;
    }
  }

  async sendShippingNotification(shipmentData: {
    customerEmail: string;
    customerName: string;
    orderNumber: string;
    trackingNumber: string;
    trackingUrl: string;
    labelUrl?: string;
    carrier: string;
  }) {
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: shipmentData.customerEmail,
        subject: `Your Order #${shipmentData.orderNumber} Has Shipped!`,
        html: ShippingNotificationEmail({
          customerName: shipmentData.customerName,
          orderNumber: shipmentData.orderNumber,
          trackingNumber: shipmentData.trackingNumber,
          trackingUrl: shipmentData.trackingUrl,
          labelUrl: shipmentData.labelUrl,
          carrier: shipmentData.carrier,
        }),
      });

      if (error) {
        console.error("Error sending shipping notification email:", error);
        throw error;
      }

      console.log("Shipping notification email sent:", data);
      return data;
    } catch (error) {
      console.error("Failed to send shipping notification email:", error);
      throw error;
    }
  }

  async sendWelcomeEmail(userData: { email: string; firstName: string }) {
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: userData.email,
        subject: "Welcome to Our Store!",
        html: WelcomeEmail({
          customerName: userData.firstName,
          email: userData.email,
        }),
      });

      if (error) {
        console.error("Error sending welcome email:", error);
        throw error;
      }

      console.log("Welcome email sent:", data);
      return data;
    } catch (error) {
      console.error("Failed to send welcome email:", error);
      throw error;
    }
  }
}
