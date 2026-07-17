import { defineFunction, secret } from "@aws-amplify/backend";

export const stripeWebhook = defineFunction({
  name: "stripe-webhook",
  entry: "./handler.ts",
  resourceGroupName: "data",
  environment: {
    STRIPE_WEBHOOK_SECRET: secret("STRIPE_WEBHOOK_SECRET"),
    RESTAURANT_TABLE_NAME: ""
  }
});
