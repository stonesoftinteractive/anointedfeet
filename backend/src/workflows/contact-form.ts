import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { useRemoteQueryStep } from "@medusajs/medusa/core-flows"
import { Modules } from "@medusajs/framework/utils"

export const contactFormWorkflow = createWorkflow(
  "contact-form",
  (input: any) => {
    // Logic to call your notification provider
    // In Medusa v2, you'd typically resolve the Notification Module here
    const notificationModuleService = input.container.resolve(Modules.NOTIFICATION)

    return notificationModuleService.createNotifications({
      to: input.to,
      channel: "email",
      template: "contact-form-template", // The ID in your SendGrid/Resend dash
      data: input.data,
    })
  }
)