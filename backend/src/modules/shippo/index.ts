// src/modules/shippo/index.ts
import ShippoModuleService from "./service";
import { Module } from "@medusajs/utils";

export const SHIPPO_MODULE = "shippoModuleService";

export default Module(SHIPPO_MODULE, {
  service: ShippoModuleService,
});
