// src/modules/shippo-fulfillment/service.ts
import { AbstractFulfillmentProviderService } from "@medusajs/framework/utils";
import type {
  CalculatedShippingOptionPrice,
  CreateFulfillmentResult,
} from "@medusajs/types";

class ShippoFulfillmentService extends AbstractFulfillmentProviderService {
  static identifier = "shippo-fulfillment";

  protected options_: Record<string, any>;

  constructor(_: any, options?: Record<string, any>) {
    super();

    this.options_ = options || {};
  }

  async getFulfillmentOptions(): Promise<any[]> {
    return [
      {
        id: "shippo-standard",
        name: "Standard Shipping",
      },
      {
        id: "shippo-express",
        name: "Express Shipping",
      },
    ];
  }

  async validateFulfillmentData(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    context: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return data;
  }

  async validateOption(data: any): Promise<boolean> {
    return true;
  }

  async canCalculate(data: any): Promise<boolean> {
    return true;
  }

  async calculatePrice(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    context: Record<string, unknown>,
  ): Promise<CalculatedShippingOptionPrice> {
    const cart = context as any;

    if (!cart.shipping_address) {
      return {
        calculated_amount: 0,
        is_calculated_price_tax_inclusive: false, // Must be boolean, not undefined
      };
    }

    const serviceLevel =
      optionData.id === "shippo-standard" ? "standard" : "express";

    // Initialize Shippo
    const Shippo = require("shippo");
    const shippo = new Shippo({ apiKeyHeader: process.env.SHIPPO_API_KEY });

    const addressFrom = {
      name: "Your Store",
      street1: process.env.STORE_ADDRESS_STREET || "",
      city: process.env.STORE_ADDRESS_CITY || "",
      state: process.env.STORE_ADDRESS_STATE || "",
      zip: process.env.STORE_ADDRESS_ZIP || "",
      country: process.env.STORE_ADDRESS_COUNTRY || "US",
    };

    const addressTo = {
      name: `${cart.shipping_address.first_name || ""} ${cart.shipping_address.last_name || ""}`.trim(),
      street1: cart.shipping_address.address_1 || "",
      street2: cart.shipping_address.address_2 || "",
      city: cart.shipping_address.city || "",
      state: cart.shipping_address.province || "",
      zip: cart.shipping_address.postal_code || "",
      country: cart.shipping_address.country_code || "",
    };

    const totalWeight =
      cart.items?.reduce(
        (sum: number, item: any) =>
          sum + (item.variant?.weight || 1) * (item.quantity || 1),
        0,
      ) || 1;

    const shipment = await shippo.shipments.create({
      address_from: addressFrom,
      address_to: addressTo,
      parcels: [
        {
          length: "10",
          width: "8",
          height: "4",
          distance_unit: "in",
          weight: totalWeight.toString(),
          mass_unit: "lb",
        },
      ],
      async: false,
    });

    const serviceLevelMap: Record<string, string[]> = {
      standard: ["usps_priority", "ups_ground", "fedex_ground"],
      express: ["usps_priority_express", "ups_next_day_air", "fedex_2_day"],
    };

    const serviceLevels = serviceLevelMap[serviceLevel];
    const filteredRates = shipment.rates.filter((rate: any) =>
      serviceLevels.some((level) =>
        rate.servicelevel.token.toLowerCase().includes(level.toLowerCase()),
      ),
    );

    if (filteredRates.length === 0) {
      return {
        calculated_amount: 0,
        is_calculated_price_tax_inclusive: false,
      };
    }

    const cheapestRate = filteredRates.reduce((cheapest: any, rate: any) =>
      parseFloat(rate.amount) < parseFloat(cheapest.amount) ? rate : cheapest,
    );

    // Store rate ID in data for later use
    if (!data.metadata) {
      (data as any).metadata = {};
    }
    (data as any).metadata.shippo_rate_id = cheapestRate.object_id(
      data as any,
    ).metadata.carrier = cheapestRate.provider;

    return {
      calculated_amount: Math.round(parseFloat(cheapestRate.amount) * 100),
      is_calculated_price_tax_inclusive: false, // Must be boolean, not undefined
    };
  }

  async createFulfillment(
    data: Record<string, unknown>,
    items: any[],
    order: any,
    fulfillment: any,
  ): Promise<CreateFulfillmentResult> {
    const metadata = (data as any).metadata || {};
    const rateId = metadata.shippo_rate_id;

    if (!rateId) {
      // No rate ID stored, return empty result with required fields
      return {
        data: {},
        labels: [],
      };
    }

    // Initialize Shippo
    const Shippo = require("shippo");
    const shippo = new Shippo({ apiKeyHeader: process.env.SHIPPO_API_KEY });

    // Create the shipping label
    const transaction = await shippo.transactions.create({
      rate: rateId,
      async: false,
    });

    return {
      data: {
        shippo_transaction_id: transaction.object_id,
        carrier: transaction.rate.provider,
      },
      labels: [
        {
          tracking_number: transaction.tracking_number || "",
          tracking_url: transaction.tracking_url_provider || "", // Must be string, not undefined
          label_url: transaction.label_url || "", // Must be string, not undefined
        },
      ],
    };
  }

  async cancelFulfillment(data: Record<string, unknown>): Promise<any> {
    // Implement cancellation logic if needed
    return {};
  }

  async createReturn(data: Record<string, unknown>): Promise<any> {
    // Implement return label creation if needed
    return {
      data: {},
      labels: [],
    };
  }
}

export default ShippoFulfillmentService;
