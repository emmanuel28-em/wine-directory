import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { createBillingPortalSession } from "../functions/create-billing-portal-session/resource";
import { createCheckoutSession } from "../functions/create-checkout-session/resource";
import { sendInviteEmail } from "../functions/send-invite-email/resource";
import { provisionTrialWorkspace } from "../functions/provision-trial-workspace/resource";
import { inviteAccess } from "../functions/invite-access/resource";

const schema = a.schema({
  InviteEmailResult: a.customType({
    success: a.boolean(),
    status: a.string(),
    error: a.string()
  }),

  CheckoutSessionResult: a.customType({
    success: a.boolean(),
    checkoutUrl: a.string(),
    stripeCustomerId: a.string(),
    status: a.string(),
    error: a.string()
  }),

  BillingPortalSessionResult: a.customType({
    success: a.boolean(),
    portalUrl: a.string(),
    status: a.string(),
    error: a.string()
  }),

  TrialWorkspaceResult: a.customType({
    success: a.boolean(),
    error: a.string(),
    restaurantId: a.id(),
    userProfileId: a.id(),
    membershipId: a.id()
  }),

  InviteAccessResult: a.customType({
    success: a.boolean(),
    error: a.string(),
    status: a.string(),
    restaurantId: a.id(),
    restaurantName: a.string(),
    email: a.email(),
    firstName: a.string(),
    lastName: a.string(),
    role: a.string(),
    expiresAt: a.datetime(),
    userProfileId: a.id(),
    membershipId: a.id()
  }),

  MemberAccessResult: a.customType({
    success: a.boolean(),
    error: a.string(),
    membershipId: a.id(),
    role: a.string(),
    status: a.string()
  }),

  provisionTrialWorkspace: a
    .mutation()
    .arguments({
      restaurantName: a.string().required(),
      managerName: a.string().required(),
      address: a.string(),
      website: a.string()
    })
    .returns(a.ref("TrialWorkspaceResult"))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(provisionTrialWorkspace)),

  getInviteDetails: a
    .query()
    .arguments({ token: a.string().required() })
    .returns(a.ref("InviteAccessResult"))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(inviteAccess)),

  acceptInvite: a
    .mutation()
    .arguments({
      token: a.string().required(),
      firstName: a.string(),
      lastName: a.string()
    })
    .returns(a.ref("InviteAccessResult"))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(inviteAccess)),

  manageMemberAccess: a
    .mutation()
    .arguments({
      restaurantId: a.id().required(),
      membershipId: a.id().required(),
      action: a.string().required(),
      role: a.string()
    })
    .returns(a.ref("MemberAccessResult"))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(inviteAccess)),

  // A Restaurant is one customer/tenant using the SaaS product.
  // Example: Rezdora, or another restaurant that signs up later.
  Restaurant: a
    .model({
      name: a.string().required(),
      slug: a.string().required(),
      plan: a.string(),
      trialEndsAt: a.datetime(),
      status: a.string(),
      stripePaymentLink: a.string(),
      stripeCustomerId: a.string(),
      stripeSubscriptionId: a.string(),
      subscriptionStatus: a.enum(["trialing", "active", "past_due", "canceled", "paused", "unpaid", "incomplete"]),
      currentPeriodEnd: a.datetime(),
      billingEmail: a.email(),
      address: a.string(),
      city: a.string(),
      website: a.string(),
      primaryContactName: a.string(),
      primaryContactEmail: a.email(),
      logoStorageKey: a.string(),
      tenantGroup: a.string(),
      managerGroup: a.string()
    })
    .authorization((allow) => [
      // Everyone in this restaurant can read its profile. Only its manager
      // group can make profile changes; workspace creation happens in Lambda.
      allow.groupDefinedIn("tenantGroup").to(["read"]),
      allow.groupDefinedIn("managerGroup").to(["update"])
    ]),

  // A UserProfile stores app-specific user information.
  // Cognito handles login; this model stores profile details the app needs.
  UserProfile: a
    .model({
      cognitoUserId: a.string().required(),
      name: a.string(),
      email: a.email(),
      activeRestaurantId: a.id(),
      tenantGroup: a.string(),
      managerGroup: a.string()
    })
    .authorization((allow) => [
      // A person can read and edit their own profile. Managers can read team
      // profiles for the roster and progress screens.
      allow.ownerDefinedIn("cognitoUserId").identityClaim("sub").to(["read", "update"]),
      allow.groupDefinedIn("managerGroup").to(["read"])
    ]),

  // A Membership connects a user to a restaurant and gives them a role.
  // This is how the SaaS will know who belongs to which restaurant.
  Membership: a
    .model({
      restaurantId: a.id().required(),
      userProfileId: a.id().required(),
      cognitoUserId: a.string(),
      role: a.enum(["owner", "admin", "manager", "staff"]),
      status: a.enum(["invited", "active", "disabled"]),
      tenantGroup: a.string(),
      managerGroup: a.string()
    })
    .authorization((allow) => [
      // Staff can read only their own membership. Managers can read the
      // restaurant roster. Membership changes are handled by backend functions.
      allow.ownerDefinedIn("cognitoUserId").identityClaim("sub").to(["read"]),
      allow.groupDefinedIn("managerGroup").to(["read"])
    ]),

  // An Invite lets a manager invite someone into one restaurant workspace.
  // The token powers the accept-invite link. Email status fields track SES delivery.
  Invite: a
    .model({
      restaurantId: a.id().required(),
      email: a.email().required(),
      firstName: a.string(),
      lastName: a.string(),
      role: a.enum(["admin", "manager", "staff"]),
      status: a.enum(["pending", "accepted", "expired", "revoked"]),
      invitedBy: a.id(),
      inviteToken: a.string().required(),
      note: a.string(),
      expiresAt: a.datetime(),
      emailSentAt: a.datetime(),
      emailSendStatus: a.enum(["notSent", "sent", "failed"]),
      emailSendError: a.string(),
      lastEmailAttemptAt: a.datetime(),
      tenantGroup: a.string(),
      managerGroup: a.string()
    })
    .authorization((allow) => [
      allow.groupDefinedIn("managerGroup").to(["create", "read", "update", "delete"])
    ]),

  sendInviteEmail: a
    .mutation()
    .arguments({
      restaurantId: a.id().required(),
      toEmail: a.email().required(),
      firstName: a.string(),
      restaurantName: a.string().required(),
      role: a.string().required(),
      inviteUrl: a.string().required()
    })
    .returns(a.ref("InviteEmailResult"))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(sendInviteEmail)),

  createCheckoutSession: a
    .mutation()
    .arguments({
      restaurantId: a.id().required(),
      restaurantName: a.string().required(),
      billingEmail: a.email().required(),
      stripeCustomerId: a.string(),
      trialEndsAt: a.datetime(),
      requestedByRole: a.string()
    })
    .returns(a.ref("CheckoutSessionResult"))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(createCheckoutSession)),

  createBillingPortalSession: a
    .mutation()
    .arguments({
      restaurantId: a.id().required(),
      requestedByRole: a.string()
    })
    .returns(a.ref("BillingPortalSessionResult"))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(createBillingPortalSession)),

  // A ContentCollection is a restaurant-created folder or grouping.
  // Examples: Dinner Menu, BTG Wines, SOPs, Events, Opening Procedures.
  ContentCollection: a
    .model({
      restaurantId: a.id().required(),
      name: a.string().required(),
      description: a.string(),
      categoryType: a.string(),
      status: a.enum(["active", "archived"]),
      sortOrder: a.integer(),
      createdBy: a.id(),
      updatedBy: a.id(),
      tenantGroup: a.string(),
      managerGroup: a.string()
    })
    .authorization((allow) => [
      allow.groupDefinedIn("tenantGroup").to(["read"]),
      allow.groupDefinedIn("managerGroup").to(["create", "update", "delete"])
    ]),

  // A TrainingDoc is the main study item staff will read.
  // It can represent wine, cocktails, food, SOPs, pasta tasting notes, or custom docs.
  TrainingDoc: a
    .model({
      restaurantId: a.id().required(),
      collectionId: a.id(),
      type: a.enum(["wine", "cocktail", "food", "sop", "pastaTasting", "custom"]),
      title: a.string().required(),
      category: a.string(),
      status: a.enum(["draft", "published", "archived"]),
      contentJson: a.string(),
      imageKeys: a.string().array(),
      createdBy: a.id(),
      updatedBy: a.id(),
      tenantGroup: a.string(),
      managerGroup: a.string()
    })
    .authorization((allow) => [
      allow.groupDefinedIn("tenantGroup").to(["read"]),
      allow.groupDefinedIn("managerGroup").to(["create", "update", "delete"])
    ]),

  // A FileAsset stores metadata for a file uploaded to S3.
  // The actual file lives in Storage; this model ties it to a restaurant and optionally a Training Page.
  FileAsset: a
    .model({
      restaurantId: a.id().required(),
      trainingDocId: a.id(),
      managedSetupRequestId: a.id(),
      name: a.string().required(),
      fileName: a.string().required(),
      fileType: a.string(),
      fileSize: a.integer(),
      storageKey: a.string().required(),
      uploadedBy: a.id(),
      tenantGroup: a.string(),
      managerGroup: a.string()
    })
    .authorization((allow) => [
      allow.groupDefinedIn("tenantGroup").to(["read"]),
      allow.groupDefinedIn("managerGroup").to(["create", "update", "delete"])
    ]),

  // A ManagedSetupRequest is a done-for-you setup request.
  // Public file uploads are not enabled yet, so saved requests currently require authentication.
  ManagedSetupRequest: a
    .model({
      restaurantId: a.id(),
      restaurantName: a.string().required(),
      contactFirstName: a.string(),
      contactLastName: a.string(),
      email: a.email().required(),
      title: a.string(),
      materialsJson: a.string(),
      priorityJson: a.string(),
      notes: a.string(),
      status: a.enum(["new", "reviewing", "inProgress", "completed"]),
      tenantGroup: a.string(),
      managerGroup: a.string()
    })
    .authorization((allow) => [
      // A prospective restaurant can submit a setup inquiry before creating an account.
      // Guest access is create-only: public visitors cannot list, read, update, or delete inquiries.
      allow.guest().to(["create"])
    ]),

  // A Quiz groups questions together for one doc, one topic, or one training area.
  Quiz: a
    .model({
      restaurantId: a.id().required(),
      trainingDocId: a.id(),
      title: a.string().required(),
      category: a.string(),
      passingScore: a.integer(),
      isPublished: a.boolean(),
      tenantGroup: a.string(),
      managerGroup: a.string()
    })
    .authorization((allow) => [
      allow.groupDefinedIn("tenantGroup").to(["read"]),
      allow.groupDefinedIn("managerGroup").to(["create", "update", "delete"])
    ]),

  // A QuizQuestion is one question inside a quiz.
  // choicesJson is a JSON string so the answer options can stay flexible.
  QuizQuestion: a
    .model({
      restaurantId: a.id().required(),
      quizId: a.id().required(),
      prompt: a.string().required(),
      choicesJson: a.string(),
      correctAnswer: a.string().required(),
      explanation: a.string(),
      tenantGroup: a.string(),
      managerGroup: a.string()
    })
    .authorization((allow) => [
      allow.groupDefinedIn("tenantGroup").to(["read"]),
      allow.groupDefinedIn("managerGroup").to(["create", "update", "delete"])
    ]),

  // A QuizAttempt records one staff member taking one quiz.
  // This is the beginning of the manager progress dashboard.
  QuizAttempt: a
    .model({
      restaurantId: a.id().required(),
      quizId: a.id().required(),
      userProfileId: a.id().required(),
      cognitoUserId: a.string(),
      score: a.integer(),
      passed: a.boolean(),
      answersJson: a.string(),
      completedAt: a.datetime(),
      tenantGroup: a.string(),
      managerGroup: a.string()
    })
    .authorization((allow) => [
      // A staff member owns their attempts; managers can read attempts for
      // their own restaurant's readiness dashboard.
      allow.ownerDefinedIn("cognitoUserId").identityClaim("sub").to(["create", "read"]),
      allow.groupDefinedIn("managerGroup").to(["read"])
    ])
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool"
  }
});
