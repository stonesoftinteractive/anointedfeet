// src/modules/shippo-fulfillment/service.ts
import { AbstractFulfillmentProviderService } from "@medusajs/framework/utils";
import type {
  CalculatedShippingOptionPrice,
  CreateFulfillmentResult,
} from "@medusajs/types";
import * as SDKShippo from "shippo";

class ShippoFulfillmentService extends AbstractFulfillmentProviderService {
  static identifier = "shippo-fulfillment";

  protected options_: Record<string, any>;
  protected shippo_: any;

  constructor(_: any, options?: Record<string, any>) {
    super();

    this.options_ = options || {};

    // Initialize Shippo correctly
    this.shippo_ = new SDKShippo.Shippo({
      apiKeyHeader: process.env.SHIPPO_API_KEY || "",
    });
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
    try {
      const cart = context as any;

      // Validate shipping address exists
      if (
        !cart.shipping_address?.postal_code ||
        !cart.shipping_address?.country_code
      ) {
        return {
          calculated_amount: 0,
          is_calculated_price_tax_inclusive: false,
        };
      }

      const serviceLevel =
        optionData.id === "shippo-standard" ? "standard" : "express";

      const addressFrom = {
        name: "Your Store",
        street1: process.env.STORE_ADDRESS_STREET || "123 Main St",
        city: process.env.STORE_ADDRESS_CITY || "City",
        state: process.env.STORE_ADDRESS_STATE || "TN",
        zip: process.env.STORE_ADDRESS_ZIP || "37129",
        country: process.env.STORE_ADDRESS_COUNTRY || "US",
      };

      const addressTo = {
        name:
          `${cart.shipping_address.first_name || ""} ${cart.shipping_address.last_name || ""}`.trim() ||
          "Customer",
        street1: cart.shipping_address.address_1 || "",
        street2: cart.shipping_address.address_2 || "",
        city: cart.shipping_address.city || "",
        state:
          cart.shipping_address.province || cart.shipping_address.state || "",
        zip: cart.shipping_address.postal_code || "",
        country: cart.shipping_address.country_code || "",
      };

      // Calculate total weight from cart items
      let totalWeight = 1; // default 1 lb
      if (cart.items && Array.isArray(cart.items)) {
        totalWeight = cart.items.reduce((sum: number, item: any) => {
          const weight = item.variant?.weight || 1;
          const quantity = item.quantity || 1;
          return sum + weight * quantity;
        }, 0);
        // Ensure minimum weight
        if (totalWeight < 1) totalWeight = 1;
      }

      // Create shipment to get rates
      const shipment = await this.shippo_.shipments.create({
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

      // Check if we got rates
      if (!shipment.rates || shipment.rates.length === 0) {
        console.error("No rates returned from Shippo");
        return {
          calculated_amount: 0,
          is_calculated_price_tax_inclusive: false,
        };
      }

      // Filter rates by service level
      const serviceLevelMap: Record<string, string[]> = {
        standard: ["usps_priority", "ups_ground", "fedex_ground"],
        express: [
          "usps_priority_express",
          "ups_next_day_air",
          "fedex_2_day",
          "ups_2_day",
        ],
      };

      const serviceLevels = serviceLevelMap[serviceLevel];
      const filteredRates = shipment.rates.filter((rate: any) =>
        serviceLevels.some((level) =>
          rate.servicelevel?.token?.toLowerCase().includes(level.toLowerCase()),
        ),
      );

      if (filteredRates.length === 0) {
        console.warn(`No ${serviceLevel} rates available for this shipment`);
        return {
          calculated_amount: 0,
          is_calculated_price_tax_inclusive: false,
        };
      }

      // Get cheapest rate
      const cheapestRate = filteredRates.reduce((cheapest: any, rate: any) => {
        const currentAmount = parseFloat(rate.amount || "0");
        const cheapestAmount = parseFloat(cheapest.amount || "999999");
        return currentAmount < cheapestAmount ? rate : cheapest;
      });

      // Store rate ID in data metadata for later use - FIXED HERE
      if (!data.metadata) {
        (data as any).metadata = {};
      }
      (data as any).metadata.shippo_rate_id = cheapestRate.object_id;
      (data as any).metadata.carrier = cheapestRate.provider;

      // Return calculated price
      const priceInCents = Math.round(parseFloat(cheapestRate.amount) * 100);

      return {
        calculated_amount: priceInCents,
        is_calculated_price_tax_inclusive: false,
      };
    } catch (error) {
      console.error("Error calculating Shippo price:", error);
      // Return 0 instead of throwing to prevent checkout errors
      return {
        calculated_amount: 0,
        is_calculated_price_tax_inclusive: false,
      };
    }
  }

  async createFulfillment(
    data: Record<string, unknown>,
    items: any[],
    order: any,
    fulfillment: any,
  ): Promise<CreateFulfillmentResult> {
    try {
      const metadata = (data as any).metadata || {};
      const rateId = metadata.shippo_rate_id;

      if (!rateId) {
        console.warn("No Shippo rate ID found in metadata");
        return {
          data: {},
          labels: [],
        };
      }

      // Create the shipping label
      const transaction = await this.shippo_.transactions.create({
        rate: rateId,
        async: false,
      });

      return {
        data: {
          shippo_transaction_id: transaction.object_id,
          carrier: transaction.rate?.provider || "",
        },
        labels: [
          {
            tracking_number: transaction.tracking_number || "",
            tracking_url: transaction.tracking_url_provider || "",
            label_url: transaction.label_url || "",
          },
        ],
      };
    } catch (error) {
      console.error("Error creating Shippo fulfillment:", error);
      return {
        data: {},
        labels: [],
      };
    }
  }

  async cancelFulfillment(data: Record<string, unknown>): Promise<any> {
    return {};
  }

  async createReturn(data: Record<string, unknown>): Promise<any> {
    return {
      data: {},
      labels: [],
    };
  }
}

export default ShippoFulfillmentService;
