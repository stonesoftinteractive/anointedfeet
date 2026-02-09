import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { Modules } from "@medusajs/framework/utils";

const sendContactFormEmailStep = createStep(
  "send-contact-form-email",
  async (input: { to: string; data: any }, { container }) => {
    const notificationModuleService = container.resolve(Modules.NOTIFICATION);

    const notification = await notificationModuleService.createNotifications({
      to: input.to,
      channel: "email",
      template: "contact-form-template", // The ID in your SendGrid/Resend dash
      data: input.data,
    });

    return new StepResponse(notification);
  },
);

export const contactFormWorkflow = createWorkflow(
  "contact-form",
  (input: { to: string; data: any }) => {
    const result = sendContactFormEmailStep(input);
    return new WorkflowResponse(result);
  },
);
