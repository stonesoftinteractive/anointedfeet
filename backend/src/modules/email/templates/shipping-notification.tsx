interface ShippingNotificationEmailProps {
  customerName: string;
  orderNumber: string;
  trackingNumber: string;
  trackingUrl: string;
  labelUrl?: string;
  carrier: string;
}

export const ShippingNotificationEmail = ({
  customerName,
  orderNumber,
  trackingNumber,
  trackingUrl,
  labelUrl,
  carrier,
}: ShippingNotificationEmailProps) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333333;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff;">

                <!-- Logo -->
                <tr>
                  <td style="background-color: #ffffff; padding: 20px; text-align: center;">
                    <img src="https://anointedfeetusa.com/admin-logo.png" alt="Anointed Feet" style="max-width: 160px; height: auto; display: block; margin: 0 auto;" />
                  </td>
                </tr>

                <!-- Header -->
                <tr>
                  <td style="background-color: #014139; color: #ffffff; padding: 20px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff;">Your Order Has Shipped!</h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 30px; background-color: #f9f9f9;">
                    <p style="margin: 0 0 15px 0;">Hi ${customerName},</p>
                    <p style="margin: 0 0 20px 0;">Great news! Your order #${orderNumber} is on its way.</p>

                    <!-- Tracking Box -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; padding: 20px; margin: 20px 0; border-radius: 5px;">
                      <tr>
                        <td>
                          <h2 style="margin: 0 0 15px 0; color: #014139;">Tracking Information</h2>
                          <p style="margin: 0 0 8px 0;"><strong>Carrier:</strong> ${carrier}</p>
                          <p style="margin: 0 0 20px 0;"><strong>Tracking Number:</strong> ${trackingNumber}</p>

                          <!-- Track Button -->
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="background-color: #014139; border-radius: 5px;">
                                <a href="${trackingUrl}" style="display: inline-block; padding: 12px 24px; color: #ffffff; text-decoration: none; font-weight: bold;">
                                  Track Your Package
                                </a>
                              </td>
                            </tr>
                          </table>
                          ${labelUrl ? `
                          <p style="margin: 15px 0 0 0;">
                            <a href="${labelUrl}" style="color: #014139; text-decoration: underline;">View Shipping Label</a>
                          </p>` : ''}
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 20px 0 0 0;">If you have any questions about your shipment, please don't hesitate to reach out.</p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="text-align: center; padding: 20px; color: #666666; font-size: 14px; background-color: #f4f4f4;">
                    <p style="margin: 0;">Thank you for shopping with us!</p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};
