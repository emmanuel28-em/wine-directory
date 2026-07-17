import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { createBillingPortalSession } from "../functions/create-billing-portal-session/resource";
import { createCheckoutSession } from "../functions/create-checkout-session/resource";
import { sendInviteEmail } from "../functions/send-invite-email/resource";

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
      logoStorageKey: a.string()
    })
    .authorization((allow) => [allow.authenticated()]),

  // A UserProfile stores app-specific user information.
  // Cognito handles login; this model stores profile details the app needs.
  UserProfile: a
    .model({
      cognitoUserId: a.string().required(),
      name: a.string(),
      email: a.email(),
      activeRestaurantId: a.id()
    })
    .authorization((allow) => [allow.authenticated()]),

  // A Membership connects a user to a restaurant and gives them a role.
  // This is how the SaaS will know who belongs to which restaurant.
  Membership: a
    .model({
      restaurantId: a.id().required(),
      userProfileId: a.id().required(),
      role: a.enum(["owner", "admin", "manager", "staff"]),
      status: a.enum(["invited", "active", "disabled"])
    })
    .authorization((allow) => [allow.authenticated()]),

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
      lastEmailAttemptAt: a.datetime()
    })
    .authorization((allow) => [allow.authenticated()]),

  sendInviteEmail: a
    .mutation()
    .arguments({
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
      updatedBy: a.id()
    })
    .authorization((allow) => [allow.authenticated()]),

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
      updatedBy: a.id()
    })
    .authorization((allow) => [allow.authenticated()]),

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
      uploadedBy: a.id()
    })
    .authorization((allow) => [allow.authenticated()]),

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
      status: a.enum(["new", "reviewing", "inProgress", "completed"])
    })
    .authorization((allow) => [allow.authenticated()]),

  // A Quiz groups questions together for one doc, one topic, or one training area.
  Quiz: a
    .model({
      restaurantId: a.id().required(),
      trainingDocId: a.id(),
      title: a.string().required(),
      category: a.string(),
      passingScore: a.integer(),
      isPublished: a.boolean()
    })
    .authorization((allow) => [allow.authenticated()]),

  // A QuizQuestion is one question inside a quiz.
  // choicesJson is a JSON string so the answer options can stay flexible.
  QuizQuestion: a
    .model({
      restaurantId: a.id().required(),
      quizId: a.id().required(),
      prompt: a.string().required(),
      choicesJson: a.string(),
      correctAnswer: a.string().required(),
      explanation: a.string()
    })
    .authorization((allow) => [allow.authenticated()]),

  // A QuizAttempt records one staff member taking one quiz.
  // This is the beginning of the manager progress dashboard.
  QuizAttempt: a
    .model({
      restaurantId: a.id().required(),
      quizId: a.id().required(),
      userProfileId: a.id().required(),
      score: a.integer(),
      passed: a.boolean(),
      answersJson: a.string(),
      completedAt: a.datetime()
    })
    .authorization((allow) => [allow.authenticated()])
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool"
  }
});
