// src/modules/shippo-fulfillment/index.ts
import ShippoFulfillmentService from "./service";
import { ModuleProvider, Modules } from "@medusajs/framework/utils";

export default ModuleProvider(Modules.FULFILLMENT, {
  services: [ShippoFulfillmentService],
});
