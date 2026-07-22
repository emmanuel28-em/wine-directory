import { defineBackend } from "@aws-amplify/backend";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { FunctionUrlAuthType } from "aws-cdk-lib/aws-lambda";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { createBillingPortalSession } from "./functions/create-billing-portal-session/resource";
import { createCheckoutSession } from "./functions/create-checkout-session/resource";
import { createTeamMemberInvite } from "./functions/create-team-member-invite/resource";
import { sendInviteEmail } from "./functions/send-invite-email/resource";
import { provisionTrialWorkspace } from "./functions/provision-trial-workspace/resource";
import { inviteAccess } from "./functions/invite-access/resource";
import { platformAccess } from "./functions/platform-access/resource";
import { supportAccess } from "./functions/support-access/resource";
import { stripeWebhook } from "./functions/stripe-webhook/resource";
import { storage } from "./storage/resource";

// Amplify Gen 2 backend entry point.
// Storage keeps training source files in S3.
const backend = defineBackend({
  auth,
  createTeamMemberInvite,
  createBillingPortalSession,
  createCheckoutSession,
  data,
  inviteAccess,
  platformAccess,
  supportAccess,
  provisionTrialWorkspace,
  sendInviteEmail,
  stripeWebhook,
  storage
});

const restaurantTable = backend.data.resources.tables.Restaurant;
const userProfileTable = backend.data.resources.tables.UserProfile;
const membershipTable = backend.data.resources.tables.Membership;
const inviteTable = backend.data.resources.tables.Invite;
const supportTicketTable = backend.data.resources.tables.SupportTicket;
const trainingDocTable = backend.data.resources.tables.TrainingDoc;
const acknowledgementTable = backend.data.resources.tables.TrainingDocAcknowledgement;
const quizAttemptTable = backend.data.resources.tables.QuizAttempt;
const importRunTable = backend.data.resources.tables.ImportRun;
const billingEventTable = backend.data.resources.tables.BillingEvent;

restaurantTable.grantReadWriteData(backend.createCheckoutSession.resources.lambda);
restaurantTable.grantReadWriteData(backend.createBillingPortalSession.resources.lambda);
restaurantTable.grantReadWriteData(backend.stripeWebhook.resources.lambda);
userProfileTable.grantReadData(backend.createCheckoutSession.resources.lambda);
userProfileTable.grantReadData(backend.createBillingPortalSession.resources.lambda);
membershipTable.grantReadData(backend.createCheckoutSession.resources.lambda);
membershipTable.grantReadData(backend.createBillingPortalSession.resources.lambda);
userProfileTable.grantReadData(backend.sendInviteEmail.resources.lambda);
membershipTable.grantReadData(backend.sendInviteEmail.resources.lambda);
restaurantTable.grantReadData(backend.createTeamMemberInvite.resources.lambda);
userProfileTable.grantReadWriteData(backend.createTeamMemberInvite.resources.lambda);
membershipTable.grantReadWriteData(backend.createTeamMemberInvite.resources.lambda);
inviteTable.grantWriteData(backend.createTeamMemberInvite.resources.lambda);
restaurantTable.grantReadWriteData(backend.provisionTrialWorkspace.resources.lambda);
userProfileTable.grantReadWriteData(backend.provisionTrialWorkspace.resources.lambda);
membershipTable.grantReadWriteData(backend.provisionTrialWorkspace.resources.lambda);
restaurantTable.grantReadData(backend.inviteAccess.resources.lambda);
userProfileTable.grantReadWriteData(backend.inviteAccess.resources.lambda);
membershipTable.grantReadWriteData(backend.inviteAccess.resources.lambda);
inviteTable.grantReadWriteData(backend.inviteAccess.resources.lambda);
restaurantTable.grantReadData(backend.supportAccess.resources.lambda);
userProfileTable.grantReadData(backend.supportAccess.resources.lambda);
membershipTable.grantReadData(backend.supportAccess.resources.lambda);
supportTicketTable.grantReadWriteData(backend.supportAccess.resources.lambda);
billingEventTable.grantWriteData(backend.stripeWebhook.resources.lambda);

// Platform Control reads operational metadata only. It never receives training
// page content, quiz answers, or uploaded files in its API response.
restaurantTable.grantReadData(backend.platformAccess.resources.lambda);
userProfileTable.grantReadData(backend.platformAccess.resources.lambda);
membershipTable.grantReadData(backend.platformAccess.resources.lambda);
inviteTable.grantReadData(backend.platformAccess.resources.lambda);
supportTicketTable.grantReadData(backend.platformAccess.resources.lambda);
trainingDocTable.grantReadData(backend.platformAccess.resources.lambda);
acknowledgementTable.grantReadData(backend.platformAccess.resources.lambda);
quizAttemptTable.grantReadData(backend.platformAccess.resources.lambda);
importRunTable.grantReadData(backend.platformAccess.resources.lambda);
billingEventTable.grantReadData(backend.platformAccess.resources.lambda);

backend.createCheckoutSession.addEnvironment("RESTAURANT_TABLE_NAME", restaurantTable.tableName);
backend.createBillingPortalSession.addEnvironment("RESTAURANT_TABLE_NAME", restaurantTable.tableName);
backend.stripeWebhook.addEnvironment("RESTAURANT_TABLE_NAME", restaurantTable.tableName);
backend.createCheckoutSession.addEnvironment("USER_PROFILE_TABLE_NAME", userProfileTable.tableName);
backend.createCheckoutSession.addEnvironment("MEMBERSHIP_TABLE_NAME", membershipTable.tableName);
backend.createBillingPortalSession.addEnvironment("USER_PROFILE_TABLE_NAME", userProfileTable.tableName);
backend.createBillingPortalSession.addEnvironment("MEMBERSHIP_TABLE_NAME", membershipTable.tableName);
backend.sendInviteEmail.addEnvironment("USER_PROFILE_TABLE_NAME", userProfileTable.tableName);
backend.sendInviteEmail.addEnvironment("MEMBERSHIP_TABLE_NAME", membershipTable.tableName);
backend.createTeamMemberInvite.addEnvironment("USER_POOL_ID", backend.auth.resources.userPool.userPoolId);
backend.createTeamMemberInvite.addEnvironment("RESTAURANT_TABLE_NAME", restaurantTable.tableName);
backend.createTeamMemberInvite.addEnvironment("USER_PROFILE_TABLE_NAME", userProfileTable.tableName);
backend.createTeamMemberInvite.addEnvironment("MEMBERSHIP_TABLE_NAME", membershipTable.tableName);
backend.createTeamMemberInvite.addEnvironment("INVITE_TABLE_NAME", inviteTable.tableName);
backend.provisionTrialWorkspace.addEnvironment("USER_POOL_ID", backend.auth.resources.userPool.userPoolId);
backend.provisionTrialWorkspace.addEnvironment("RESTAURANT_TABLE_NAME", restaurantTable.tableName);
backend.provisionTrialWorkspace.addEnvironment("USER_PROFILE_TABLE_NAME", userProfileTable.tableName);
backend.provisionTrialWorkspace.addEnvironment("MEMBERSHIP_TABLE_NAME", membershipTable.tableName);
backend.inviteAccess.addEnvironment("USER_POOL_ID", backend.auth.resources.userPool.userPoolId);
backend.inviteAccess.addEnvironment("RESTAURANT_TABLE_NAME", restaurantTable.tableName);
backend.inviteAccess.addEnvironment("USER_PROFILE_TABLE_NAME", userProfileTable.tableName);
backend.inviteAccess.addEnvironment("MEMBERSHIP_TABLE_NAME", membershipTable.tableName);
backend.inviteAccess.addEnvironment("INVITE_TABLE_NAME", inviteTable.tableName);
backend.platformAccess.addEnvironment("USER_POOL_ID", backend.auth.resources.userPool.userPoolId);
backend.platformAccess.addEnvironment("RESTAURANT_TABLE_NAME", restaurantTable.tableName);
backend.platformAccess.addEnvironment("USER_PROFILE_TABLE_NAME", userProfileTable.tableName);
backend.platformAccess.addEnvironment("MEMBERSHIP_TABLE_NAME", membershipTable.tableName);
backend.platformAccess.addEnvironment("INVITE_TABLE_NAME", inviteTable.tableName);
backend.platformAccess.addEnvironment("SUPPORT_TICKET_TABLE_NAME", supportTicketTable.tableName);
backend.platformAccess.addEnvironment("TRAINING_DOC_TABLE_NAME", trainingDocTable.tableName);
backend.platformAccess.addEnvironment("ACKNOWLEDGEMENT_TABLE_NAME", acknowledgementTable.tableName);
backend.platformAccess.addEnvironment("QUIZ_ATTEMPT_TABLE_NAME", quizAttemptTable.tableName);
backend.platformAccess.addEnvironment("IMPORT_RUN_TABLE_NAME", importRunTable.tableName);
backend.platformAccess.addEnvironment("BILLING_EVENT_TABLE_NAME", billingEventTable.tableName);
backend.stripeWebhook.addEnvironment("BILLING_EVENT_TABLE_NAME", billingEventTable.tableName);
backend.supportAccess.addEnvironment("RESTAURANT_TABLE_NAME", restaurantTable.tableName);
backend.supportAccess.addEnvironment("USER_PROFILE_TABLE_NAME", userProfileTable.tableName);
backend.supportAccess.addEnvironment("MEMBERSHIP_TABLE_NAME", membershipTable.tableName);
backend.supportAccess.addEnvironment("SUPPORT_TICKET_TABLE_NAME", supportTicketTable.tableName);

backend.provisionTrialWorkspace.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ["cognito-idp:CreateGroup", "cognito-idp:AdminAddUserToGroup", "cognito-idp:AdminGetUser"],
    resources: [backend.auth.resources.userPool.userPoolArn]
  })
);

backend.inviteAccess.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ["cognito-idp:CreateGroup", "cognito-idp:AdminAddUserToGroup", "cognito-idp:AdminRemoveUserFromGroup", "cognito-idp:AdminGetUser"],
    resources: [backend.auth.resources.userPool.userPoolArn]
  })
);

backend.createTeamMemberInvite.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      "cognito-idp:AdminAddUserToGroup",
      "cognito-idp:AdminCreateUser",
      "cognito-idp:AdminGetUser",
      "cognito-idp:CreateGroup",
      "cognito-idp:ListUsers"
    ],
    resources: [backend.auth.resources.userPool.userPoolArn]
  })
);

backend.platformAccess.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      "cognito-idp:CreateGroup",
      "cognito-idp:AdminAddUserToGroup",
      "cognito-idp:AdminRemoveUserFromGroup",
      "cognito-idp:AdminListGroupsForUser",
      "cognito-idp:ListUsers",
      "cognito-idp:ListUsersInGroup"
    ],
    resources: [backend.auth.resources.userPool.userPoolArn]
  })
);

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

backend.supportAccess.resources.lambda.addToRolePolicy(
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
