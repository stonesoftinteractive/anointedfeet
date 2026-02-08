import * as shippo from "shippo";

type Deps = {
  logger: any;
};

export default class ShippoProvider {
  static identifier = "shippo";

  protected logger_: any;
  protected shippo: any;

  constructor({ logger }: Deps) {
    this.logger_ = logger;

    // Pass the key as an object property, not a bare string
    this.shippo = new shippo.Shippo({
      apiKeyHeader: process.env.SHIPPO_API_KEY!,
    });
  }

  /* ==============================
     SHIPPING OPTIONS SHOWN IN ADMIN
  ============================== */
  async getFulfillmentOptions() {
    return [
      { id: "usps-ground", name: "USPS Ground" },
      { id: "usps-priority", name: "USPS Priority" },
    ];
  }

  /* ==============================
     PRICE CALCULATION (Checkout)
  ============================== */
  async calculatePrice(data: any) {
    const shipment = await this.shippo.shipment.create({
      address_from: data.from_address,
      address_to: data.to_address,
      parcels: [
        {
          length: "9",
          width: "6",
          height: "1",
          distance_unit: "in",
          weight: "0.2",
          mass_unit: "lb",
        },
      ],
      async: false,
    });

    // Pick CHEAPEST rate instead of first
    const cheapestRate = shipment.rates.reduce((prev: any, current: any) =>
      parseFloat(prev.amount) < parseFloat(current.amount) ? prev : current,
    );

    return Math.round(parseFloat(cheapestRate.amount) * 100);
  }

  /* ==============================
     CREATE SHIPPING LABEL
  ============================== */
  async createFulfillment(data: any) {
    const shipment = await this.shippo.shipment.create({
      address_from: data.from_address,
      address_to: data.to_address,
      parcels: data.parcels,
      async: false,
    });

    const rate = shipment.rates[0];

    const transaction = await this.shippo.transaction.create({
      rate: rate.object_id,
      label_file_type: "PDF",
    });

    return {
      tracking_number: transaction.tracking_number,
      tracking_url: transaction.tracking_url_provider,
      label_url: transaction.label_url,
    };
  }

  async cancelFulfillment() {
    return;
  }
}
