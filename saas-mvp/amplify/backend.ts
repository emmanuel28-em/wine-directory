import { defineBackend } from "@aws-amplify/backend";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { sendInviteEmail } from "./functions/send-invite-email/resource";
import { storage } from "./storage/resource";

// Amplify Gen 2 backend entry point.
// Storage keeps training source files in S3.
const backend = defineBackend({
  auth,
  data,
  sendInviteEmail,
  storage
});

backend.sendInviteEmail.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ["ses:SendEmail", "ses:SendRawEmail"],
    resources: ["*"]
  })
);
