interface WelcomeEmailProps {
  customerName: string;
  email: string;
}

export const WelcomeEmail = ({ customerName, email }: WelcomeEmailProps) => {
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
                
                <!-- Header -->
                <tr>
                  <td style="background-color: #014139; color: #ffffff; padding: 20px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff;">Welcome!</h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 30px; background-color: #f9f9f9;">
                    
                    <!-- Welcome Box -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: center;">
                      <tr>
                        <td>
                          <h2 style="margin: 0 0 15px 0; color: #014139;">Welcome to Our Store, ${customerName}!</h2>
                          <p style="margin: 0 0 10px 0;">We're excited to have you as a member.</p>
                          <p style="margin: 0 0 20px 0;">Your account has been created with the email: <strong>${email}</strong></p>
                          
                          <!-- Button -->
                          <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                            <tr>
                              <td style="background-color: #014139; border-radius: 5px;">
                                <a href="https://yourstore.com/shop" style="display: inline-block; padding: 12px 24px; color: #ffffff; text-decoration: none; font-weight: bold;">
                                  Start Shopping
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 20px 0 0 0; text-align: center;">If you have any questions, feel free to reach out to our support team.</p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="text-align: center; padding: 20px; color: #666666; font-size: 14px; background-color: #f4f4f4;">
                    <p style="margin: 0;">Thank you for joining us!</p>
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
