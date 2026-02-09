// src/workflows/get-shipping-rates.ts
import { createWorkflow, WorkflowResponse } from "@medusajs/workflows-sdk";
import { createStep, StepResponse } from "@medusajs/workflows-sdk";
import ShippoModuleService from "../modules/shippo/service";

const getShippoRatesStep = createStep(
  "get-shippo-rates",
  async ({ cart }: { cart: any }, { container }) => {
    const shippoService = container.resolve<ShippoModuleService>(
      "shippoModuleService",
    );

    const addressFrom = {
      name: "Your Store",
      street1: process.env.STORE_ADDRESS_STREET,
      city: process.env.STORE_ADDRESS_CITY,
      state: process.env.STORE_ADDRESS_STATE,
      zip: process.env.STORE_ADDRESS_ZIP,
      country: process.env.STORE_ADDRESS_COUNTRY,
    };

    const addressTo = {
      name:
        cart.shipping_address.first_name +
        " " +
        cart.shipping_address.last_name,
      street1: cart.shipping_address.address_1,
      street2: cart.shipping_address.address_2 || "",
      city: cart.shipping_address.city,
      state: cart.shipping_address.province,
      zip: cart.shipping_address.postal_code,
      country: cart.shipping_address.country_code,
    };

    // Calculate parcel dimensions from cart items
    const parcels = [
      {
        length: "10",
        width: "8",
        height: "4",
        distance_unit: "in",
        weight: cart.items
          .reduce(
            (sum: number, item: any) =>
              sum + (item.variant.weight || 0) * item.quantity,
            0,
          )
          .toString(),
        mass_unit: "lb",
      },
    ];

    const rates = await shippoService.getRates({
      addressFrom,
      addressTo,
      parcels,
    });

    return new StepResponse(rates);
  },
);

export const getShippingRatesWorkflow = createWorkflow(
  "get-shipping-rates",
  (input: { cart: any }) => {
    const rates = getShippoRatesStep(input);
    return new WorkflowResponse(rates);
  },
);
