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
    context: any, // In Medusa v2, this context contains the cart/shipping details
  ): Promise<CalculatedShippingOptionPrice> {
    try {
      const shippo = this.getShippoClient();

      // Ensure we have address data from the context
      const shippingAddress = context.shipping_address;
      if (!shippingAddress?.postal_code || !shippingAddress?.country_code) {
        return {
          calculated_amount: 0,
          is_calculated_price_tax_inclusive: false,
        };
      }

      const isExpress = optionData.id === "shippo-express";

      // Origin Address (Your Store)
      const addressFrom = {
        name: process.env.STORE_NAME || "Your Store",
        street1: process.env.STORE_ADDRESS_STREET || "123 Main St",
        city: process.env.STORE_ADDRESS_CITY || "City",
        state: process.env.STORE_ADDRESS_STATE || "NY",
        zip: process.env.STORE_ADDRESS_ZIP || "10001",
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

      // Weight calculation
      const totalWeight =
        context.items?.reduce((sum: number, item: any) => {
          return sum + (item.variant?.weight || 1) * (item.quantity || 1);
        }, 0) || 1;

      // Create Shipment to get rates
      const shipment = await shippo.shipments.create({
        addressFrom: addressFrom,
        addressTo: addressTo,
        parcels: [
          {
            length: "10",
            width: "8",
            height: "4",
            distanceUnit: "in",
            weight: totalWeight.toString(),
            massUnit: "lb",
          },
        ],
        async: false,
      });

      if (!shipment.rates || shipment.rates.length === 0) {
        throw new Error("No rates returned from Shippo");
      }

      // Filter rates based on chosen option
      const serviceKeywords = isExpress
        ? ["express", "next_day", "2_day"]
        : ["ground", "standard", "priority"];

      const filteredRates = shipment.rates.filter((rate: any) =>
        serviceKeywords.some((kw) =>
          rate.servicelevel?.token?.toLowerCase().includes(kw),
        ),
      );

      const rateToUse =
        filteredRates.length > 0 ? filteredRates[0] : shipment.rates[0];

      // Medusa expects prices in the smallest currency unit (e.g., cents)
      const priceInCents = Math.round(parseFloat(rateToUse.amount) * 100);

      return {
        calculated_amount: priceInCents,
        is_calculated_price_tax_inclusive: false,
      };
    } catch (error: any) {
      console.error("[Shippo] Price calculation failed:", error.message);
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
