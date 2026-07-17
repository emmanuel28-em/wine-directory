import { defineFunction } from "@aws-amplify/backend";

export const inviteAccess = defineFunction({
  name: "invite-access",
  entry: "./handler.ts",
  resourceGroupName: "data",
  environment: {
    USER_POOL_ID: "",
    RESTAURANT_TABLE_NAME: "",
    USER_PROFILE_TABLE_NAME: "",
    MEMBERSHIP_TABLE_NAME: "",
    INVITE_TABLE_NAME: ""
  }
});
