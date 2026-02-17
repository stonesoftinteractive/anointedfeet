import { Resend } from "resend";
import { OrderConfirmationEmail } from "./order-confirmation";
import { WelcomeEmail } from "./welcome";

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
