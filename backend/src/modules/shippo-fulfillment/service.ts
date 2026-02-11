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
        console.log("[Shippo] Missing shipping address");
        return {
          calculated_amount: 0,
          is_calculated_price_tax_inclusive: false,
        };
      }

      const destinationCountry = shippingAddress.country_code?.toUpperCase();
      const originCountry = (
        process.env.STORE_ADDRESS_COUNTRY || "US"
      ).toUpperCase();
      const isInternational = destinationCountry !== originCountry;
      const isExpress = optionData.id === "shippo-express";

      console.log("[Shippo] ============================================");
      console.log(
        "[Shippo] Shipping type:",
        isInternational ? "INTERNATIONAL" : "DOMESTIC",
      );
      console.log("[Shippo] From:", originCountry, "To:", destinationCountry);
      console.log(
        "[Shippo] Service level:",
        isExpress ? "EXPRESS" : "STANDARD",
      );

      const addressFrom = {
        name: process.env.STORE_NAME || "Your Store",
        street1: process.env.STORE_ADDRESS_STREET || "",
        city: process.env.STORE_ADDRESS_CITY || "",
        state: process.env.STORE_ADDRESS_STATE || "",
        zip: process.env.STORE_ADDRESS_ZIP || "",
        country: originCountry,
      };

      const addressTo = {
        name:
          `${shippingAddress.first_name || ""} ${shippingAddress.last_name || ""}`.trim() ||
          "Customer",
        street1: shippingAddress.address_1 || "",
        street2: shippingAddress.address_2 || "",
        city: shippingAddress.city || "",
        state: shippingAddress.province || shippingAddress.state || "",
        zip: shippingAddress.postal_code || "",
        country: destinationCountry,
      };

      console.log(
        "[Shippo] Address From:",
        JSON.stringify(addressFrom, null, 2),
      );
      console.log("[Shippo] Address To:", JSON.stringify(addressTo, null, 2));

      // Calculate weight
      let totalWeight = 0;
      let itemCount = 0;

      if (context.items && Array.isArray(context.items)) {
        context.items.forEach((item: any) => {
          const quantity = item.quantity || 1;
          const variant = item.variant || {};
          const itemWeight = variant.weight || 0.5;

          totalWeight += itemWeight * quantity;
          itemCount += quantity;
        });
      }

      if (totalWeight < 1) totalWeight = 1;

      // Box dimensions
      let parcelLength, parcelWidth, parcelHeight;

      if (totalWeight <= 1) {
        parcelLength = 10;
        parcelWidth = 7;
        parcelHeight = 3;
      } else if (totalWeight <= 3) {
        parcelLength = 12;
        parcelWidth = 9;
        parcelHeight = 4;
      } else if (totalWeight <= 5) {
        parcelLength = 14;
        parcelWidth = 10;
        parcelHeight = 6;
      } else {
        parcelLength = 16;
        parcelWidth = 12;
        parcelHeight = 8;
      }

      if (itemCount > 3) {
        parcelHeight = Math.min(parcelHeight + 2, 12);
      }

      console.log("[Shippo] Parcel:", {
        dimensions: `${parcelLength}x${parcelWidth}x${parcelHeight} in`,
        weight: `${totalWeight} lb`,
        items: itemCount,
      });

      const shipmentData: any = {
        address_from: addressFrom,
        address_to: addressTo,
        parcels: [
          {
            length: parcelLength.toString(),
            width: parcelWidth.toString(),
            height: parcelHeight.toString(),
            distance_unit: "in",
            weight: totalWeight.toFixed(2),
            mass_unit: "lb",
          },
        ],
        async: false,
      };

      // CRITICAL: Add customs declaration for international shipments
      if (isInternational) {
        console.log(
          "[Shippo] Adding customs declaration for international shipment",
        );

        // Build customs items from cart
        const customsItems = [];

        if (context.items && Array.isArray(context.items)) {
          for (const item of context.items) {
            const itemPrice = ((item.unit_price || 0) / 100).toFixed(2); // Convert cents to dollars

            customsItems.push({
              description: item.title || item.product?.title || "Merchandise",
              quantity: item.quantity || 1,
              net_weight: (
                (item.variant?.weight || 0.5) * (item.quantity || 1)
              ).toFixed(2),
              mass_unit: "lb",
              value_amount: itemPrice,
              value_currency: "USD",
              origin_country: originCountry,
              tariff_number:
                item.variant?.hs_code || item.product?.hs_code || "", // HS code for socks is usually 6115
            });
          }
        }

        // If no items, add a default
        if (customsItems.length === 0) {
          customsItems.push({
            description: "Socks and apparel",
            quantity: itemCount || 1,
            net_weight: totalWeight.toFixed(2),
            mass_unit: "lb",
            value_amount: "25.00", // Default value
            value_currency: "USD",
            origin_country: originCountry,
            tariff_number: "6115", // HS code for hosiery/socks
          });
        }

        shipmentData.customs_declaration = {
          contents_type: "MERCHANDISE",
          contents_explanation: "Apparel and accessories",
          non_delivery_option: "RETURN",
          certify: true,
          certify_signer: process.env.STORE_NAME || "Store Manager",
          items: customsItems,
        };

        console.log(
          "[Shippo] Customs items:",
          JSON.stringify(customsItems, null, 2),
        );
      }

      console.log("[Shippo] Creating shipment...");
      const shipment = await shippo.shipments.create(shipmentData);

      console.log("[Shippo] Shipment created. Object ID:", shipment.objectId);
      console.log("[Shippo] Rates received:", shipment.rates?.length || 0);

      if (!shipment.rates || shipment.rates.length === 0) {
        console.error("[Shippo] NO RATES RETURNED");
        console.error("[Shippo] Shipment status:", shipment.status);
        console.error("[Shippo] Messages:", shipment.messages);
        console.error(
          "[Shippo] Full shipment response:",
          JSON.stringify(shipment, null, 2),
        );
        return {
          calculated_amount: 0,
          is_calculated_price_tax_inclusive: false,
        };
      }

      console.log("[Shippo] ========== ALL AVAILABLE RATES ==========");
      shipment.rates.forEach((rate: any, index: number) => {
        console.log(`[Shippo] Rate ${index + 1}:`, {
          provider: rate.provider,
          service: rate.servicelevel?.name,
          token: rate.servicelevel?.token,
          amount: `${rate.amount} ${rate.currency}`,
          days: rate.estimated_days,
        });
      });

      // Filter rates
      let filteredRates;

      if (isInternational) {
        console.log(
          "[Shippo] Filtering for international",
          isExpress ? "EXPRESS" : "STANDARD",
        );

        // For international, filtering is simpler
        if (isExpress) {
          filteredRates = shipment.rates.filter((rate: any) => {
            const token = rate.servicelevel?.token?.toLowerCase() || "";
            const name = rate.servicelevel?.name?.toLowerCase() || "";
            const days = rate.estimated_days || 999;

            return (
              token.includes("express") ||
              token.includes("priority") ||
              name.includes("express") ||
              name.includes("priority") ||
              days <= 7
            );
          });
        } else {
          // Standard international
          filteredRates = shipment.rates.filter((rate: any) => {
            const token = rate.servicelevel?.token?.toLowerCase() || "";
            const name = rate.servicelevel?.name?.toLowerCase() || "";

            return (
              token.includes("economy") ||
              token.includes("standard") ||
              token.includes("first") ||
              token.includes("saver") ||
              name.includes("economy") ||
              name.includes("standard") ||
              name.includes("international") ||
              (!token.includes("express") && !name.includes("express"))
            );
          });
        }
      } else {
        // Domestic filtering (your existing logic)
        if (isExpress) {
          filteredRates = shipment.rates.filter((rate: any) => {
            const token = rate.servicelevel?.token?.toLowerCase() || "";
            const name = rate.servicelevel?.name?.toLowerCase() || "";

            return (
              token.includes("next_day") ||
              token.includes("overnight") ||
              token.includes("2_day") ||
              token.includes("second_day") ||
              token.includes("express") ||
              name.includes("express") ||
              name.includes("overnight")
            );
          });
        } else {
          filteredRates = shipment.rates.filter((rate: any) => {
            const token = rate.servicelevel?.token?.toLowerCase() || "";
            const name = rate.servicelevel?.name?.toLowerCase() || "";

            const isStandard =
              token.includes("ground") ||
              token.includes("3_day") ||
              token.includes("advantage") ||
              (token.includes("priority") && !token.includes("express"));

            const isExpressService =
              token.includes("next_day") ||
              token.includes("overnight") ||
              token.includes("2_day") ||
              token.includes("express");

            return isStandard && !isExpressService;
          });
        }
      }

      console.log(`[Shippo] Filtered rates:`, filteredRates.length);
      filteredRates.forEach((rate: any, index: number) => {
        console.log(
          `[Shippo]   ${index + 1}. ${rate.provider} ${rate.servicelevel?.name}: ${rate.amount} ${rate.currency}`,
        );
      });

      if (filteredRates.length === 0) {
        console.warn("[Shippo] No matching rates, using cheapest available");
        filteredRates = shipment.rates;
      }

      const selectedRate = filteredRates.reduce((cheapest: any, rate: any) => {
        return parseFloat(rate.amount) < parseFloat(cheapest.amount)
          ? rate
          : cheapest;
      });

      if (!data.metadata) {
        (data as any).metadata = {};
      }
      (data as any).metadata.shippo_rate_id = selectedRate.objectId;
      (data as any).metadata.carrier = selectedRate.provider;

      const priceInCents = Math.round(parseFloat(selectedRate.amount) * 100);

      console.log("[Shippo] ========== SELECTED RATE ==========");
      console.log("[Shippo] Provider:", selectedRate.provider);
      console.log("[Shippo] Service:", selectedRate.servicelevel?.name);
      console.log(
        "[Shippo] Amount:",
        `$${selectedRate.amount} (${priceInCents}¢)`,
      );
      console.log("[Shippo] Estimated days:", selectedRate.estimatedDays);
      console.log("[Shippo] ============================================");

      return {
        calculated_amount: priceInCents,
        is_calculated_price_tax_inclusive: false,
      };
    } catch (error: any) {
      console.error("[Shippo] ========== ERROR ==========");
      console.error("[Shippo] Message:", error.message);
      console.error("[Shippo] Stack:", error.stack);
      if (error.response) {
        console.error("[Shippo] API Response:", error.response);
      }
      console.error("[Shippo] ===================================");
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
