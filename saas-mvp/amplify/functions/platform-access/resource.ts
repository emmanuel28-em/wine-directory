import { defineFunction } from "@aws-amplify/backend";

export const platformAccess = defineFunction({
  name: "platform-access",
  entry: "./handler.ts",
  resourceGroupName: "data",
  environment: {
    USER_POOL_ID: "",
    RESTAURANT_TABLE_NAME: "",
    USER_PROFILE_TABLE_NAME: "",
    MEMBERSHIP_TABLE_NAME: "",
    INVITE_TABLE_NAME: "",
    SUPPORT_TICKET_TABLE_NAME: "",
    TRAINING_DOC_TABLE_NAME: "",
    ACKNOWLEDGEMENT_TABLE_NAME: "",
    QUIZ_ATTEMPT_TABLE_NAME: "",
    IMPORT_RUN_TABLE_NAME: "",
    BILLING_EVENT_TABLE_NAME: ""
  }
});
