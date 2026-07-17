import { defineFunction, secret } from "@aws-amplify/backend";

export const createBillingPortalSession = defineFunction({
  name: "create-billing-portal-session",
  entry: "./handler.ts",
  resourceGroupName: "data",
  environment: {
    STRIPE_SECRET_KEY: secret("STRIPE_SECRET_KEY"),
    LINE_UP_APP_BASE_URL: process.env.LINE_UP_APP_BASE_URL || "",
    RESTAURANT_TABLE_NAME: "",
    USER_PROFILE_TABLE_NAME: "",
    MEMBERSHIP_TABLE_NAME: ""
  }
});
