import { defineFunction } from "@aws-amplify/backend";

export const createCheckoutSession = defineFunction({
  name: "create-checkout-session",
  entry: "./handler.ts",
  environment: {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
    STRIPE_PRICE_ID_MONTHLY: process.env.STRIPE_PRICE_ID_MONTHLY || "",
    LINE_UP_APP_BASE_URL: process.env.LINE_UP_APP_BASE_URL || "",
    RESTAURANT_TABLE_NAME: ""
  }
});
