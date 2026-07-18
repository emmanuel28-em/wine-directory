import { defineFunction, secret } from "@aws-amplify/backend";

export const createCheckoutSession = defineFunction({
  name: "create-checkout-session",
  entry: "./handler.ts",
  resourceGroupName: "data",
  environment: {
    STRIPE_SECRET_KEY: secret("STRIPE_SECRET_KEY"),
    STRIPE_PRICE_ID_MONTHLY: process.env.STRIPE_PRICE_ID_MONTHLY || "",
    STRIPE_PRICE_ID_STARTER: process.env.STRIPE_PRICE_ID_STARTER || "",
    STRIPE_PRICE_ID_GROWTH: process.env.STRIPE_PRICE_ID_GROWTH || "",
    STRIPE_PRICE_ID_PRO: process.env.STRIPE_PRICE_ID_PRO || "",
    LINE_UP_APP_BASE_URL: process.env.LINE_UP_APP_BASE_URL || "",
    RESTAURANT_TABLE_NAME: "",
    USER_PROFILE_TABLE_NAME: "",
    MEMBERSHIP_TABLE_NAME: ""
  }
});
