// src/api/admin/shipping-labels/route.ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { createShippingLabelWorkflow } from "../../../workflows/create-shipping-label";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { rate_id } = req.body as { rate_id: string };
  const { result } = await createShippingLabelWorkflow(req.scope).run({
    input: { rateId: rate_id },
  });

  res.json({ label: result });
}
