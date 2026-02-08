import { loadEnv, defineConfig } from "@medusajs/utils";
import {
  ADMIN_CORS,
  AUTH_CORS,
  BACKEND_URL,
  COOKIE_SECRET,
  DATABASE_URL,
  JWT_SECRET,
  REDIS_URL,
  RESEND_API_KEY,
  RESEND_FROM_EMAIL,
  SENDGRID_API_KEY,
  SENDGRID_FROM_EMAIL,
  SHOULD_DISABLE_ADMIN,
  STORE_CORS,
  STRIPE_API_KEY,
  STRIPE_WEBHOOK_SECRET,
  WORKER_MODE,
  MINIO_ENDPOINT,
  MINIO_ACCESS_KEY,
  MINIO_SECRET_KEY,
  MINIO_BUCKET,
  MEILISEARCH_HOST,
  MEILISEARCH_ADMIN_KEY,
} from "lib/constants";

// Load environment variables first
loadEnv(process.env.NODE_ENV || "development", process.cwd());

if (!MINIO_ENDPOINT || !MINIO_ACCESS_KEY || !MINIO_SECRET_KEY) {
  throw new Error(
    "MinIO configuration missing. MINIO_ENDPOINT, MINIO_ACCESS_KEY, and MINIO_SECRET_KEY are required.",
  );
}

// Initialize modules array
const modules = [];

// Add file storage module
modules.push({
  key: "fileService",
  resolve: "@medusajs/file",
  options: {
    providers: [
      {
        resolve: "./src/modules/minio-file",
        id: "minio",
        options: {
          endPoint: MINIO_ENDPOINT,
          accessKey: MINIO_ACCESS_KEY,
          secretKey: MINIO_SECRET_KEY,
          bucket: MINIO_BUCKET ?? "medusa-media",
        },
      },
    ],
  },
});

// Add payment module if Stripe is configured
if (STRIPE_API_KEY && STRIPE_WEBHOOK_SECRET) {
  modules.push({
    key: "paymentService",
    resolve: "@medusajs/payment",
    options: {
      providers: [
        {
          resolve: "@medusajs/payment-stripe",
          id: "stripe",
          options: {
            apiKey: STRIPE_API_KEY,
            webhookSecret: STRIPE_WEBHOOK_SECRET,
            payment_description: "Order from Anointed Feet",
            automatic_payment_methods: true,
            automatic_tax: true,
          },
        },
      ],
    },
  });
}

// Add Redis modules if Redis is configured
if (REDIS_URL) {
  modules.push(
    {
      key: "eventBusService",
      resolve: "@medusajs/event-bus-redis",
      options: {
        redisUrl: REDIS_URL,
      },
    },
    {
      key: "workflowsService",
      resolve: "@medusajs/workflow-engine-redis",
      options: {
        redis: {
          url: REDIS_URL,
        },
      },
    },
  );
}

// Add notification module if email service is configured
if (
  (SENDGRID_API_KEY && SENDGRID_FROM_EMAIL) ||
  (RESEND_API_KEY && RESEND_FROM_EMAIL)
) {
  const notificationProviders = [];

  if (SENDGRID_API_KEY && SENDGRID_FROM_EMAIL) {
    notificationProviders.push({
      resolve: "@medusajs/notification-sendgrid",
      id: "sendgrid",
      options: {
        channels: ["email"],
        api_key: SENDGRID_API_KEY,
        from: SENDGRID_FROM_EMAIL,
      },
    });
  }

  if (RESEND_API_KEY && RESEND_FROM_EMAIL) {
    notificationProviders.push({
      resolve: "./src/modules/email-notifications",
      id: "resend",
      options: {
        channels: ["email"],
        api_key: RESEND_API_KEY,
        from: RESEND_FROM_EMAIL,
      },
    });
  }

  modules.push({
    key: "notificationService",
    resolve: "@medusajs/notification",
    options: {
      providers: notificationProviders,
    },
  });
}

// Initialize plugins array
const plugins = [];

// Add Meilisearch plugin if configured
if (MEILISEARCH_HOST && MEILISEARCH_ADMIN_KEY) {
  plugins.push({
    resolve: "@rokmohar/medusa-plugin-meilisearch",
    options: {
      config: {
        host: MEILISEARCH_HOST,
        apiKey: MEILISEARCH_ADMIN_KEY,
      },
      settings: {
        products: {
          type: "products",
          enabled: true,
          fields: [
            "id",
            "title",
            "description",
            "handle",
            "variant_sku",
            "thumbnail",
          ],
          indexSettings: {
            searchableAttributes: ["title", "description", "variant_sku"],
            displayedAttributes: [
              "id",
              "handle",
              "title",
              "description",
              "variant_sku",
              "thumbnail",
            ],
            filterableAttributes: ["id", "handle"],
          },
          primaryKey: "id",
        },
      },
    },
  });
}

// Define the main config
const medusaConfig = defineConfig({
  projectConfig: {
    tax_enabled: true,
    databaseUrl: DATABASE_URL,
    databaseLogging: false,
    redisUrl: REDIS_URL,
    workerMode: WORKER_MODE,
    http: {
      adminCors: ADMIN_CORS,
      authCors: AUTH_CORS,
      storeCors: STORE_CORS,
      jwtSecret: JWT_SECRET,
      cookieSecret: COOKIE_SECRET,
    },
    build: {
      rollupOptions: {
        external: ["@medusajs/dashboard"],
      },
    },
  },

  admin: {
    backendUrl: BACKEND_URL,
    disable: SHOULD_DISABLE_ADMIN,
  },

  modules: modules,

  plugins: plugins,

  // Add your custom module here (not in the modules array)
  // customModules: [
  //   {
  //     resolve: "./src/modules/shippo",
  //   },
  // ],
});

export default medusaConfig;
