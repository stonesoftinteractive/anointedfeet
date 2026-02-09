// src/modules/shippo/service.ts
import { MedusaService } from "@medusajs/utils";
import * as ShippoSDK from "shippo";

type InjectedDependencies = {
  // Add any dependencies
};

class ShippoModuleService extends MedusaService({}) {
  private shippo_: ShippoSDK.Shippo;

  // Define service level mappings
  private serviceLevelMap = {
    standard: ["usps_priority", "ups_ground", "fedex_ground"],
    express: [
      "usps_priority_express",
      "ups_next_day_air",
      "fedex_2_day",
      "fedex_standard_overnight",
    ],
  };

  constructor(container: InjectedDependencies, options: Record<string, any>) {
    super(...arguments);

    // For Shippo SDK v2.x, instantiate like this:
    this.shippo_ = new ShippoSDK.Shippo({
      apiKeyHeader: options.api_key,
    });
  }

  async getRates(params: { addressFrom: any; addressTo: any; parcels: any[] }) {
    const shipment = await this.shippo_.shipments.create({
      addressFrom: params.addressFrom,
      addressTo: params.addressTo,
      parcels: params.parcels,
      async: false,
    });

    return shipment.rates;
  }

  async createLabel(rateId: string) {
    return await this.shippo_.transactions.create({
      rate: rateId,
      async: false,
    });
  }

  async trackShipment(carrier: string, trackingNumber: string) {
    return await this.shippo_.trackingStatus.get(carrier, trackingNumber);
  }

  // Group rates by service level
  getCheapestRateByServiceLevel(
    rates: any[],
    serviceLevel: "standard" | "express",
  ) {
    const serviceLevels = this.serviceLevelMap[serviceLevel];

    const filteredRates = rates.filter((rate) =>
      serviceLevels.some((level) =>
        rate.servicelevel.token.toLowerCase().includes(level.toLowerCase()),
      ),
    );

    if (filteredRates.length === 0) return null;

    // Return cheapest rate for this service level
    return filteredRates.reduce((cheapest, rate) =>
      parseFloat(rate.amount) < parseFloat(cheapest.amount) ? rate : cheapest,
    );
  }
}

export default ShippoModuleService;
