interface AdminOrderNotificationProps {
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
}

export const AdminOrderNotificationEmail = ({
  customerName,
  customerEmail,
  orderNumber,
  orderTotal,
  orderItems,
  orderDate,
}: AdminOrderNotificationProps) => {
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
                  <td style="background-color: #ffffff; padding: 20px 20px 8px 20px; text-align: center;">
                    <img src="https://anointedfeetusa.com/admin-logo.png" alt="Anointed Feet" style="max-width: 160px; height: auto; display: block; margin: 0 auto;" />
                    <p style="margin: 6px 0 0 0; font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: #111111; font-family: Arial, sans-serif;">Anointed Feet</p>
                  </td>
                </tr>

                <!-- Header -->
                <tr>
                  <td style="background-color: #014139; color: #ffffff; padding: 20px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff;">New Order Received</h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 30px; background-color: #f9f9f9;">
                    <p style="margin: 0 0 20px 0;">A new order has been placed on Anointed Feet USA.</p>

                    <!-- Customer Info -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; padding: 15px; margin: 0 0 20px 0; border-radius: 5px;">
                      <tr>
                        <td>
                          <h2 style="margin: 0 0 10px 0; color: #014139;">Customer</h2>
                          <p style="margin: 0 0 5px 0;"><strong>${customerName}</strong></p>
                          <p style="margin: 0;">${customerEmail}</p>
                        </td>
                      </tr>
                    </table>

                    <!-- Order Details -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; padding: 15px; border-radius: 5px;">
                      <tr>
                        <td>
                          <h2 style="margin: 0 0 10px 0; color: #014139;">Order #${orderNumber}</h2>
                          <p style="margin: 0 0 15px 0;"><strong>Date:</strong> ${orderDate}</p>

                          <h3 style="margin: 15px 0 10px 0; color: #014139;">Items:</h3>

                          ${orderItems
                            .map(
                              (item) => `
                            <div style="padding: 10px 0; border-bottom: 1px solid #eeeeee;">
                              <strong>${item.title}</strong><br>
                              <span style="color: #666666;">Quantity: ${item.quantity} × ${item.price}</span>
                            </div>
                          `,
                            )
                            .join("")}

                          <div style="font-weight: bold; font-size: 1.2em; margin-top: 15px; padding-top: 15px; border-top: 2px solid #014139; color: #014139;">
                            Total: ${orderTotal}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="text-align: center; padding: 20px; color: #666666; font-size: 14px; background-color: #f4f4f4;">
                    <p style="margin: 0;">Anointed Feet USA Admin Notification</p>
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
