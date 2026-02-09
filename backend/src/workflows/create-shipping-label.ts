// src/workflows/create-shipping-label.ts
import { createWorkflow, WorkflowResponse } from "@medusajs/workflows-sdk";
import { createStep, StepResponse } from "@medusajs/workflows-sdk";
import ShippoModuleService from "../modules/shippo/service";

const createShippoLabelStep = createStep(
  "create-shippo-label",
  async ({ rateId }: { rateId: string }, { container }) => {
    const shippoService = container.resolve<ShippoModuleService>(
      "shippoModuleService",
    );

    const transaction = await shippoService.createLabel(rateId);

    return new StepResponse({
      labelUrl: transaction.labelUrl,
      trackingNumber: transaction.trackingNumber,
      carrier:
        typeof transaction.rate === "string"
          ? transaction.rate
          : transaction.rate?.provider,
    });
  },
  async (data, { container }) => {
    // Compensation logic if needed
  },
);

export const createShippingLabelWorkflow = createWorkflow(
  "create-shipping-label",
  (input: { rateId: string }) => {
    const label = createShippoLabelStep(input);
    return new WorkflowResponse(label);
  },
);
