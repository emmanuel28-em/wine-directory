import { defineFunction } from "@aws-amplify/backend";

export const platformAccess = defineFunction({
  name: "platform-access",
  entry: "./handler.ts",
  resourceGroupName: "data",
  environment: {
    USER_POOL_ID: ""
  }
});
