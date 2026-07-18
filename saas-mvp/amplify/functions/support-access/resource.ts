import { defineFunction } from "@aws-amplify/backend";

export const supportAccess = defineFunction({
  name: "support-access",
  entry: "./handler.ts",
  resourceGroupName: "data",
  environment: {
    RESTAURANT_TABLE_NAME: "",
    USER_PROFILE_TABLE_NAME: "",
    MEMBERSHIP_TABLE_NAME: "",
    SUPPORT_TICKET_TABLE_NAME: "",
    LINE_UP_FROM_EMAIL: process.env.LINE_UP_FROM_EMAIL || "not-configured@lineup.local",
    LINE_UP_SUPPORT_EMAIL: process.env.LINE_UP_SUPPORT_EMAIL || ""
  }
});
