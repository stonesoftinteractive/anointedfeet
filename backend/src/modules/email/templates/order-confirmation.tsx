interface OrderConfirmationEmailProps {
  customerName: string;
  orderNumber: string;
  orderTotal: string;
  orderItems: Array<{
    title: string;
    quantity: number;
    price: string;
  }>;
  orderDate: string;
}

export const OrderConfirmationEmail = ({
  customerName,
  orderNumber,
  orderTotal,
  orderItems,
  orderDate,
}: OrderConfirmationEmailProps) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .order-details { background-color: white; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .item { padding: 10px 0; border-bottom: 1px solid #eee; }
          .total { font-weight: bold; font-size: 1.2em; margin-top: 15px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Confirmation</h1>
          </div>
          <div class="content">
            <p>Hi ${customerName},</p>
            <p>Thank you for your order! We've received your order and are processing it.</p>
            
            <div class="order-details">
              <h2>Order #${orderNumber}</h2>
              <p><strong>Order Date:</strong> ${orderDate}</p>
              
              <h3>Order Items:</h3>
              ${orderItems
                .map(
                  (item) => `
                <div class="item">
                  <strong>${item.title}</strong><br>
                  Quantity: ${item.quantity} × ${item.price}
                </div>
              `,
                )
                .join("")}
              
              <div class="total">
                Total: ${orderTotal}
              </div>
            </div>
            
            <p>We'll send you another email when your order ships.</p>
          </div>
          <div class="footer">
            <p>Thank you for shopping with us!</p>
          </div>
        </div>
      </body>
    </html>
  `;
};
