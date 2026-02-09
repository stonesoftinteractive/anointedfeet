// src/api/store/shipping-rates/route.ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { getShippingRatesWorkflow } from "../../../workflows/get-shipping-rates";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { cart_id } = req.query;

  const { result } = await getShippingRatesWorkflow(req.scope).run({
    input: { cart: { id: cart_id } },
  });

  res.json({ rates: result });
}
