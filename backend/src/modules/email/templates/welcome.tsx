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
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #014139; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .welcome-box { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: center; }
          .button { display: inline-block; padding: 12px 24px; background-color: #014139; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome!</h1>
          </div>
          <div class="content">
            <div class="welcome-box">
              <h2>Welcome to Our Store, ${customerName}!</h2>
              <p>We're excited to have you as a member.</p>
              <p>Your account has been created with the email: <strong>${email}</strong></p>
              <a href="https://anointedfeetusa.com" class="button">Start Shopping</a>
            </div>
            <p>If you have any questions, feel free to reach out to our support team.</p>
          </div>
          <div class="footer">
            <p>Thank you for joining us!</p>
          </div>
        </div>
      </body>
    </html>
  `;
};
