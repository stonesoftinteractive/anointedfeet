// src/modules/shippo-fulfillment/service.ts
import { AbstractFulfillmentProviderService } from "@medusajs/framework/utils";
import type {
  CalculatedShippingOptionPrice,
  CreateFulfillmentResult,
} from "@medusajs/types";

class ShippoFulfillmentService extends AbstractFulfillmentProviderService {
  static identifier = "shippo-fulfillment";

  protected options_: Record<string, any>;
  protected shippo_: any = null;

  constructor(_: any, options?: Record<string, any>) {
    super();
    this.options_ = options || {};
    console.log("[Shippo] Service initialized (lazy loading enabled)");
  }

  private getShippoClient() {
    if (this.shippo_) {
      return this.shippo_;
    }

    const apiKey = process.env.SHIPPO_API_KEY || "";

    if (!apiKey) {
      throw new Error("SHIPPO_API_KEY not set in environment variables");
    }

    try {
      // Try multiple import methods
      let Shippo;

      // Method 1: Try require with default
      try {
        const shippoModule = require("shippo");
        Shippo = shippoModule.default || shippoModule.Shippo || shippoModule;
      } catch (e) {
        console.error("[Shippo] Require failed, trying direct import");
      }

      if (!Shippo || typeof Shippo !== "function") {
        throw new Error("Could not load Shippo SDK");
      }

      this.shippo_ = new Shippo({
        apiKeyHeader: apiKey,
      });

      console.log("[Shippo] Client initialized successfully");
      return this.shippo_;
    } catch (error: any) {
      console.error("[Shippo] Failed to initialize:", error.message);
      throw error;
    }
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
    console.log("[Shippo] calculatePrice called");

    try {
      const shippo = this.getShippoClient();
      const cart = context as any;

      // Validate shipping address exists
      if (
        !cart.shipping_address?.postal_code ||
        !cart.shipping_address?.country_code
      ) {
        console.log("[Shippo] Incomplete or missing shipping address");
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

      // Calculate total weight
      let totalWeight = 1;
      if (cart.items && Array.isArray(cart.items)) {
        totalWeight = cart.items.reduce((sum: number, item: any) => {
          const weight = item.variant?.weight || 1;
          const quantity = item.quantity || 1;
          return sum + weight * quantity;
        }, 0);
        if (totalWeight < 1) totalWeight = 1;
      }

      console.log("[Shippo] Creating shipment...");

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

      if (!shipment.rates || shipment.rates.length === 0) {
        console.error("[Shippo] No rates returned");
        return {
          calculated_amount: 0,
          is_calculated_price_tax_inclusive: false,
        };
      }

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
        console.warn(`[Shippo] No ${serviceLevel} rates available`);
        return {
          calculated_amount: 0,
          is_calculated_price_tax_inclusive: false,
        };
      }

      const cheapestRate = filteredRates.reduce((cheapest: any, rate: any) => {
        const currentAmount = parseFloat(rate.amount || "0");
        const cheapestAmount = parseFloat(cheapest.amount || "999999");
        return currentAmount < cheapestAmount ? rate : cheapest;
      });

      if (!data.metadata) {
        (data as any).metadata = {};
      }
      (data as any).metadata.shippo_rate_id = cheapestRate.object_id;
      (data as any).metadata.carrier = cheapestRate.provider;

      const priceInCents = Math.round(parseFloat(cheapestRate.amount) * 100);

      console.log("[Shippo] Price calculated:", priceInCents, "cents");

      return {
        calculated_amount: priceInCents,
        is_calculated_price_tax_inclusive: false,
      };
    } catch (error: any) {
      console.error("[Shippo] Error:", error.message);
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
      const shippo = this.getShippoClient();
      const metadata = (data as any).metadata || {};
      const rateId = metadata.shippo_rate_id;

      if (!rateId) {
        console.warn("[Shippo] No rate ID found");
        return { data: {}, labels: [] };
      }

      const transaction = await shippo.transactions.create({
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
      console.error("[Shippo] Fulfillment error:", error);
      return { data: {}, labels: [] };
    }
  }

  async cancelFulfillment(data: Record<string, unknown>): Promise<any> {
    return {};
  }

  async createReturn(data: Record<string, unknown>): Promise<any> {
    return { data: {}, labels: [] };
  }
}

export default ShippoFulfillmentService;
