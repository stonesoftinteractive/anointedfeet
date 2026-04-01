// src/api/store/shipping-rates/route.ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/utils";
import { getShippingRatesWorkflow } from "../../../workflows/get-shipping-rates";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { cart_id } = req.query;

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data: [cart] } = await query.graph({
    entity: "cart",
    fields: [
      "id",
      "items.*",
      "items.variant.*",
      "shipping_address.*",
    ],
    filters: { id: cart_id as string },
  });

  if (!cart) {
    return res.status(404).json({ message: "Cart not found" });
  }

  console.log("[Shippo] Cart shipping_address:", JSON.stringify(cart.shipping_address, null, 2));

  if (!cart.shipping_address) {
    return res.status(400).json({ message: "No shipping address on cart" });
  }

  const { result } = await getShippingRatesWorkflow(req.scope).run({
    input: { cart },
  });

  res.json({ rates: result });
}
