import { defineFunction } from "@aws-amplify/backend";

export const sendInviteEmail = defineFunction({
  name: "send-invite-email",
  entry: "./handler.ts",
  environment: {
    LINE_UP_FROM_EMAIL: process.env.LINE_UP_FROM_EMAIL || "not-configured@lineup.local",
    LINE_UP_APP_BASE_URL: process.env.LINE_UP_APP_BASE_URL || ""
  }
});
