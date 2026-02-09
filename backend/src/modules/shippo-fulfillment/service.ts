import { AbstractFulfillmentProviderService } from "@medusajs/framework/utils";
import type {
  CalculatedShippingOptionPrice,
  CreateFulfillmentResult,
  FulfillmentOption,
} from "@medusajs/types";
import { Shippo } from "shippo";

class ShippoFulfillmentService extends AbstractFulfillmentProviderService {
  static identifier = "shippo-fulfillment";

  protected options_: Record<string, any>;
  protected shippo_: Shippo | null = null;

  constructor(_: any, options?: Record<string, any>) {
    super();
    this.options_ = options || {};
  }

  /**
   * Initializes the Shippo client using the named export constructor.
   */
  private getShippoClient(): Shippo {
    if (this.shippo_) {
      return this.shippo_;
    }

    const apiKey = process.env.SHIPPO_API_KEY;

    if (!apiKey) {
      throw new Error("SHIPPO_API_KEY not set in environment variables");
    }

    try {
      // In newer Shippo SDKs, we use the named 'Shippo' class
      this.shippo_ = new Shippo({
        apiKeyHeader: apiKey,
      });

      return this.shippo_;
    } catch (error: any) {
      console.error("[Shippo] Failed to initialize SDK:", error.message);
      throw error;
    }
  }

  async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
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
    context: any,
  ): Promise<CalculatedShippingOptionPrice> {
    try {
      const shippo = this.getShippoClient();

      const shippingAddress = context.shipping_address;
      if (!shippingAddress?.postal_code || !shippingAddress?.country_code) {
        return {
          calculated_amount: 0,
          is_calculated_price_tax_inclusive: false,
        };
      }

      const isExpress = optionData.id === "shippo-express";

      // Origin Address (Your Store from .env)
      const addressFrom = {
        name: process.env.STORE_NAME || "Your Store",
        street1: process.env.STORE_ADDRESS_STREET || "",
        city: process.env.STORE_ADDRESS_CITY || "",
        state: process.env.STORE_ADDRESS_STATE || "",
        zip: process.env.STORE_ADDRESS_ZIP || "",
        country: process.env.STORE_ADDRESS_COUNTRY || "US",
      };

      // Destination Address
      const addressTo = {
        name:
          `${shippingAddress.first_name || ""} ${shippingAddress.last_name || ""}`.trim() ||
          "Customer",
        street1: shippingAddress.address_1 || "",
        street2: shippingAddress.address_2 || "",
        city: shippingAddress.city || "",
        state: shippingAddress.province || shippingAddress.state || "",
        zip: shippingAddress.postal_code || "",
        country: shippingAddress.country_code || "",
      };

      // Calculate total weight from cart items
      let totalWeight = 0;
      let itemCount = 0;

      if (context.items && Array.isArray(context.items)) {
        context.items.forEach((item: any) => {
          const quantity = item.quantity || 1;
          const variant = item.variant || {};

          // Weight in pounds - if not set, use reasonable default (0.5 lb for small items)
          const itemWeight = variant.weight || 0.5;
          totalWeight += itemWeight * quantity;
          itemCount += quantity;
        });
      }

      // Ensure minimum weight of 1 lb
      if (totalWeight < 1) totalWeight = 1;

      // Estimate box dimensions based on weight and item count
      // This is a simple heuristic - adjust based on your typical products
      let parcelLength, parcelWidth, parcelHeight;

      if (totalWeight <= 1) {
        // Small package (socks, small items)
        parcelLength = 10;
        parcelWidth = 7;
        parcelHeight = 3;
      } else if (totalWeight <= 3) {
        // Medium package
        parcelLength = 12;
        parcelWidth = 9;
        parcelHeight = 4;
      } else if (totalWeight <= 5) {
        // Large package
        parcelLength = 14;
        parcelWidth = 10;
        parcelHeight = 6;
      } else {
        // Extra large
        parcelLength = 16;
        parcelWidth = 12;
        parcelHeight = 8;
      }

      // Adjust for multiple items
      if (itemCount > 3) {
        parcelHeight = Math.min(parcelHeight + 2, 12);
      }

      console.log("[Shippo] Shipping details:", {
        itemCount,
        totalWeight: `${totalWeight} lb`,
        dimensions: `${parcelLength}x${parcelWidth}x${parcelHeight} in`,
        from: `${addressFrom.city}, ${addressFrom.state} ${addressFrom.zip}`,
        to: `${addressTo.city}, ${addressTo.state} ${addressTo.zip}`,
      });

      // Create Shipment
      const shipment = await shippo.shipments.create({
        addressFrom: addressFrom,
        addressTo: addressTo,
        parcels: [
          {
            length: parcelLength.toString(),
            width: parcelWidth.toString(),
            height: parcelHeight.toString(),
            distanceUnit: "in",
            weight: totalWeight.toFixed(2), // Use 2 decimal places
            massUnit: "lb",
          },
        ],
        async: false,
      });

      if (!shipment.rates || shipment.rates.length === 0) {
        console.error("[Shippo] No rates returned from Shippo");
        return {
          calculated_amount: 0,
          is_calculated_price_tax_inclusive: false,
        };
      }

      // Log all rates for debugging
      console.log("[Shippo] Available rates:");
      shipment.rates.forEach((r: any) => {
        console.log(
          `  - ${r.provider} ${r.servicelevel?.name}: $${r.amount} (${r.servicelevel?.token})`,
        );
      });

      // Filter rates based on service level
      const serviceLevelMap: Record<string, string[]> = {
        standard: ["usps_priority", "ups_ground", "fedex_ground", "usps_first"],
        express: [
          "usps_priority_express",
          "ups_next_day_air",
          "fedex_2_day",
          "ups_2_day",
        ],
      };

      const serviceLevel = isExpress ? "express" : "standard";
      const serviceLevels = serviceLevelMap[serviceLevel];

      const filteredRates = shipment.rates.filter((rate: any) =>
        serviceLevels.some((level) =>
          rate.servicelevel?.token?.toLowerCase().includes(level.toLowerCase()),
        ),
      );

      console.log(
        `[Shippo] Filtered ${serviceLevel} rates:`,
        filteredRates.length,
      );

      let selectedRate;

      if (filteredRates.length === 0) {
        console.warn(
          "[Shippo] No matching service level rates, using cheapest available",
        );
        selectedRate = shipment.rates.reduce((cheapest: any, rate: any) => {
          return parseFloat(rate.amount) < parseFloat(cheapest.amount)
            ? rate
            : cheapest;
        });
      } else {
        // Get cheapest rate from filtered options
        selectedRate = filteredRates.reduce((cheapest: any, rate: any) => {
          return parseFloat(rate.amount) < parseFloat(cheapest.amount)
            ? rate
            : cheapest;
        });
      }

      // Store rate ID for label creation later
      if (!data.metadata) {
        (data as any).metadata = {};
      }
      (data as any).metadata.shippo_rate_id = selectedRate.objectId;
      (data as any).metadata.carrier = selectedRate.provider;

      const priceInCents = Math.round(parseFloat(selectedRate.amount) * 100);

      console.log("[Shippo] Selected rate:", {
        provider: selectedRate.provider,
        service: selectedRate.servicelevel?.name,
        amount: `$${selectedRate.amount}`,
        priceInCents: `${priceInCents}¢`,
      });

      return {
        calculated_amount: priceInCents,
        is_calculated_price_tax_inclusive: false,
      };
    } catch (error: any) {
      console.error("[Shippo] Error calculating price:", error.message);
      if (error.response) {
        console.error("[Shippo] API error:", error.response);
      }
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

      // In a production flow, you would retrieve the rate_id stored during calculatePrice
      // For this example, we assume fulfillment is being triggered
      return {
        data: { ...data, status: "scheduled" },
        labels: [],
      };
    } catch (error) {
      console.error("[Shippo] Fulfillment error:", error);
      return { data: {}, labels: [] };
    }
  }

  async cancelFulfillment(): Promise<any> {
    return {};
  }
  async createReturn(): Promise<any> {
    return { data: {}, labels: [] };
  }
}

export default ShippoFulfillmentService;
