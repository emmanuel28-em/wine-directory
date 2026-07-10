import { defineFunction } from "@aws-amplify/backend";

export const stripeWebhook = defineFunction({
  name: "stripe-webhook",
  entry: "./handler.ts",
  environment: {
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "",
    RESTAURANT_TABLE_NAME: ""
  }
});
