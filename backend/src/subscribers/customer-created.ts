import { SubscriberArgs, SubscriberConfig } from "@medusajs/medusa";
import { ICustomerModuleService } from "@medusajs/types";
import { Modules } from "@medusajs/utils";
import { EmailService } from "modules/email/service";
export default async function customerCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const customerModuleService: ICustomerModuleService = container.resolve(
    Modules.CUSTOMER,
  );
  const emailService = new EmailService();

  try {
    // Fetch the customer details
    const customer = await customerModuleService.retrieveCustomer(data.id);

    await emailService.sendWelcomeEmail({
      email: customer.email,
      firstName: customer.first_name || "there",
    });

    console.log(`Welcome email sent to ${customer.email}`);
  } catch (error) {
    console.error("Error in customer created handler:", error);
  }
}

export const config: SubscriberConfig = {
  event: "customer.created",
};
