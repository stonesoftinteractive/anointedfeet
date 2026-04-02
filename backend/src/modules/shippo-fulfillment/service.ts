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
      {
        id: "shippo-free",
        name: "Free Shipping",
      },
    ];
  }

  async validateFulfillmentData(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    context: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return { ...data, option_id: optionData.id };
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
      // Handle free shipping first
      if (optionData.id === "shippo-free") {
        console.log("[Shippo] Free shipping selected, returning $0");
        return {
          calculated_amount: 0,
          is_calculated_price_tax_inclusive: false,
        };
      }

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

      // Origin Address
      const addressFrom = {
        name: process.env.STORE_NAME || "Your Store",
        street1: process.env.STORE_ADDRESS_STREET || "",
        city: process.env.STORE_ADDRESS_CITY || "",
        state: process.env.STORE_ADDRESS_STATE || "",
        zip: process.env.STORE_ADDRESS_ZIP || "",
        country: originCountry,
        email: process.env.STORE_EMAIL || "",
        phone: process.env.STORE_PHONE || "",
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
        country: destinationCountry,
        email: shippingAddress.email || "",
        phone: shippingAddress.phone || "",
      };

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

      // Estimate box dimensions
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

      console.log(
        "[Shippo] Calculating for:",
        isExpress ? "EXPRESS" : "STANDARD",
        isInternational ? "(INTERNATIONAL)" : "(DOMESTIC)",
      );

      const shipmentData: any = {
        addressFrom: addressFrom,
        addressTo: addressTo,
        parcels: [
          {
            length: parcelLength.toString(),
            width: parcelWidth.toString(),
            height: parcelHeight.toString(),
            distanceUnit: "in",
            weight: totalWeight.toFixed(2),
            massUnit: "lb",
          },
        ],
        async: false,
      };

      // Add customs for international
      if (isInternational) {
        const customsItems = context.items?.map((item: any) => ({
          description: item.title || "Merchandise",
          quantity: item.quantity || 1,
          netWeight: (
            (item.variant?.weight || 0.5) * (item.quantity || 1)
          ).toFixed(2),
          massUnit: "lb",
          valueAmount: ((item.unit_price || 0) / 100).toFixed(2),
          valueCurrency: "USD",
          originCountry: originCountry,
          tariffNumber: "6115",
        })) || [
          {
            description: "Socks",
            quantity: itemCount,
            netWeight: totalWeight.toFixed(2),
            massUnit: "lb",
            valueAmount: "25.00",
            valueCurrency: "USD",
            originCountry: originCountry,
            tariffNumber: "6115",
          },
        ];

        shipmentData.customsDeclaration = {
          contentsType: "MERCHANDISE",
          contentsExplanation: "Apparel",
          nonDeliveryOption: "RETURN",
          certify: true,
          certifySigner: process.env.STORE_NAME || "Store Manager",
          items: customsItems,
        };
      }

      const shipment = await shippo.shipments.create(shipmentData);

      if (!shipment.rates || shipment.rates.length === 0) {
        console.error("[Shippo] No rates returned");
        return {
          calculated_amount: 0,
          is_calculated_price_tax_inclusive: false,
        };
      }

      console.log("[Shippo] Available rates:");
      shipment.rates.forEach((r: any) => {
        console.log(
          `  - ${r.provider} ${r.servicelevel?.name}: $${r.amount} (${r.servicelevel?.token})`,
        );
      });

      // Filter rates
      let filteredRates;

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
            token.includes("priority") ||
            name.includes("express") ||
            name.includes("overnight") ||
            name.includes("next day") ||
            name.includes("2 day") ||
            name.includes("priority")
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

          const isExpress =
            token.includes("next_day") ||
            token.includes("overnight") ||
            token.includes("2_day") ||
            token.includes("second_day") ||
            token.includes("express") ||
            name.includes("express") ||
            name.includes("overnight");

          return isStandard && !isExpress;
        });
      }

      console.log(
        `[Shippo] Filtered ${isExpress ? "EXPRESS" : "STANDARD"} rates:`,
        filteredRates.length,
      );

      if (filteredRates.length === 0) {
        console.warn("[Shippo] No matching rates, using cheapest available");
        filteredRates = shipment.rates;
      }

      // Sort by price
      filteredRates.sort(
        (a: any, b: any) => parseFloat(a.amount) - parseFloat(b.amount),
      );

      filteredRates.forEach((r: any, i: number) => {
        console.log(
          `  ${i + 1}. ${r.provider} ${r.servicelevel?.name}: $${r.amount}`,
        );
      });

      // For international express, use second cheapest
      const selectedRate = filteredRates[0];

      if (!data.metadata) {
        (data as any).metadata = {};
      }
      (data as any).metadata.shippo_rate_id = selectedRate.objectId;
      (data as any).metadata.carrier = selectedRate.provider;

      const priceInDollars = Math.round(parseFloat(selectedRate.amount));

      console.log("[Shippo] SELECTED:", {
        type: isExpress ? "EXPRESS" : "STANDARD",
        provider: selectedRate.provider,
        service: selectedRate.servicelevel?.name,
        amount: `$${selectedRate.amount}`,
      });

      return {
        calculated_amount: priceInDollars,
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
      const optionId = (data.option_id || "") as string;
      const isFree = optionId.includes("free");
      const isExpress = optionId.includes("express");

      if (isFree) {
        return { data: { ...data, status: "scheduled" }, labels: [] };
      }

      const shippo = this.getShippoClient();
      const shippingAddress = order.shipping_address;

      if (!shippingAddress?.postal_code || !shippingAddress?.country_code) {
        console.warn("[Shippo] createFulfillment: missing shipping address");
        return { data: { ...data, status: "scheduled" }, labels: [] };
      }

      const destinationCountry = shippingAddress.country_code.toUpperCase();
      const originCountry = (
        process.env.STORE_ADDRESS_COUNTRY || "US"
      ).toUpperCase();
      const isInternational = destinationCountry !== originCountry;

      const addressFrom = {
        name: process.env.STORE_NAME || "Your Store",
        street1: process.env.STORE_ADDRESS_STREET || "",
        city: process.env.STORE_ADDRESS_CITY || "",
        state: process.env.STORE_ADDRESS_STATE || "",
        zip: process.env.STORE_ADDRESS_ZIP || "",
        country: originCountry,
        email: process.env.STORE_EMAIL || "",
        phone: process.env.STORE_PHONE || "",
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
        email: order.email || shippingAddress.email || "",
        phone: shippingAddress.phone || "",
      };

      let totalWeight = 0;
      let itemCount = 0;
      const orderItems = order.items || items || [];
      orderItems.forEach((item: any) => {
        const qty = item.quantity || 1;
        const weight = item.variant?.weight || 0.5;
        totalWeight += weight * qty;
        itemCount += qty;
      });
      if (totalWeight < 1) totalWeight = 1;

      let parcelLength: number, parcelWidth: number, parcelHeight: number;
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
      if (itemCount > 3) parcelHeight = Math.min(parcelHeight + 2, 12);

      const shipmentData: any = {
        addressFrom,
        addressTo,
        parcels: [
          {
            length: parcelLength.toString(),
            width: parcelWidth.toString(),
            height: parcelHeight.toString(),
            distanceUnit: "in",
            weight: totalWeight.toFixed(2),
            massUnit: "lb",
          },
        ],
        async: false,
      };

      if (isInternational) {
        shipmentData.customsDeclaration = {
          contentsType: "MERCHANDISE",
          contentsExplanation: "Apparel",
          nonDeliveryOption: "RETURN",
          certify: true,
          certifySigner: process.env.STORE_NAME || "Store Manager",
          items: orderItems.map((item: any) => ({
            description: item.title || "Merchandise",
            quantity: item.quantity || 1,
            netWeight: (
              (item.variant?.weight || 0.5) * (item.quantity || 1)
            ).toFixed(2),
            massUnit: "lb",
            valueAmount: ((item.unit_price || 0) / 100).toFixed(2),
            valueCurrency: "USD",
            originCountry,
            tariffNumber: "6115",
          })),
        };
      }

      const shipment = await shippo.shipments.create(shipmentData);

      if (!shipment.rates?.length) {
        console.error("[Shippo] createFulfillment: no rates returned");
        return { data: { ...data, status: "scheduled" }, labels: [] };
      }

      let filteredRates = shipment.rates.filter((rate: any) => {
        const token = rate.servicelevel?.token?.toLowerCase() || "";
        const name = rate.servicelevel?.name?.toLowerCase() || "";
        if (isExpress) {
          return (
            token.includes("next_day") ||
            token.includes("overnight") ||
            token.includes("2_day") ||
            token.includes("second_day") ||
            token.includes("express") ||
            name.includes("express") ||
            name.includes("overnight") ||
            name.includes("next day") ||
            name.includes("priority")
          );
        }
        const isStd =
          token.includes("ground") ||
          token.includes("3_day") ||
          token.includes("advantage") ||
          (token.includes("priority") && !token.includes("express"));
        const isExp =
          token.includes("next_day") ||
          token.includes("overnight") ||
          token.includes("2_day") ||
          token.includes("express") ||
          name.includes("express");
        return isStd && !isExp;
      });

      if (!filteredRates.length) filteredRates = shipment.rates;
      filteredRates.sort(
        (a: any, b: any) => parseFloat(a.amount) - parseFloat(b.amount),
      );

      const selectedRate = filteredRates[0];
      console.log("[Shippo] createFulfillment selected rate:", {
        provider: selectedRate.provider,
        service: selectedRate.servicelevel?.name,
        amount: selectedRate.amount,
        rateId: selectedRate.objectId,
      });

      // Purchase the label immediately
      const transaction = await shippo.transactions.create({
        rate: selectedRate.objectId,
        async: false,
      });

      if (!transaction.labelUrl || !transaction.trackingNumber) {
        console.error("[Shippo] createFulfillment: label creation failed", transaction);
        return {
          data: { ...data, status: "scheduled", shippo_rate_id: selectedRate.objectId },
          labels: [],
        };
      }

      console.log("[Shippo] Label created:", {
        trackingNumber: transaction.trackingNumber,
        labelUrl: transaction.labelUrl,
      });

      return {
        data: {
          ...data,
          status: "scheduled",
          shippo_rate_id: selectedRate.objectId,
          carrier: selectedRate.provider,
          tracking_number: transaction.trackingNumber,
          label_url: transaction.labelUrl,
        },
        labels: [
          {
            tracking_number: transaction.trackingNumber,
            tracking_url: transaction.trackingUrlProvider ?? transaction.labelUrl,
            label_url: transaction.labelUrl,
          },
        ],
      };
    } catch (error: any) {
      console.error("[Shippo] createFulfillment error:", error.message);
      return { data: { ...data, status: "scheduled" }, labels: [] };
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
