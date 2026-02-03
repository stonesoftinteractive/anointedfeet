import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { contactFormWorkflow } from "../../../workflows/contact-form"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
    // Extract fields from your contact form
    const { name, email, subject, message } = req.validatedBody as any

    // Execute a workflow to handle the email sending
    await contactFormWorkflow(req.scope).run({
        input: {
            to: "jonannin@gmail.com",
            from: email,
            subject: `Contact Form: ${subject}`,
            data: { name, email, message }
        }
    })

    res.status(200).json({ message: "Message sent successfully" })
}