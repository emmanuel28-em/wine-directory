import { defineBackend } from "@aws-amplify/backend";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { FunctionUrlAuthType } from "aws-cdk-lib/aws-lambda";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { createBillingPortalSession } from "./functions/create-billing-portal-session/resource";
import { createCheckoutSession } from "./functions/create-checkout-session/resource";
import { sendInviteEmail } from "./functions/send-invite-email/resource";
import { stripeWebhook } from "./functions/stripe-webhook/resource";
import { storage } from "./storage/resource";

// Amplify Gen 2 backend entry point.
// Storage keeps training source files in S3.
const backend = defineBackend({
  auth,
  createBillingPortalSession,
  createCheckoutSession,
  data,
  sendInviteEmail,
  stripeWebhook,
  storage
});

const restaurantTable = backend.data.resources.tables.Restaurant;

restaurantTable.grantReadWriteData(backend.createCheckoutSession.resources.lambda);
restaurantTable.grantReadWriteData(backend.createBillingPortalSession.resources.lambda);
restaurantTable.grantReadWriteData(backend.stripeWebhook.resources.lambda);

backend.createCheckoutSession.addEnvironment("RESTAURANT_TABLE_NAME", restaurantTable.tableName);
backend.createBillingPortalSession.addEnvironment("RESTAURANT_TABLE_NAME", restaurantTable.tableName);
backend.stripeWebhook.addEnvironment("RESTAURANT_TABLE_NAME", restaurantTable.tableName);

const stripeWebhookUrl = backend.stripeWebhook.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE
});

backend.sendInviteEmail.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ["ses:SendEmail", "ses:SendRawEmail"],
    resources: ["*"]
  })
);

backend.addOutput({
  custom: {
    stripeWebhookUrl: stripeWebhookUrl.url
  }
});
