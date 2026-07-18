import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { createBillingPortalSession } from "../functions/create-billing-portal-session/resource";
import { createCheckoutSession } from "../functions/create-checkout-session/resource";
import { sendInviteEmail } from "../functions/send-invite-email/resource";
import { provisionTrialWorkspace } from "../functions/provision-trial-workspace/resource";
import { inviteAccess } from "../functions/invite-access/resource";
import { platformAccess } from "../functions/platform-access/resource";
import { supportAccess } from "../functions/support-access/resource";

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

  PlatformAccessResult: a.customType({
    success: a.boolean(),
    error: a.string(),
    currentRole: a.string(),
    usersJson: a.string()
  }),

  SupportTicketResult: a.customType({
    success: a.boolean(),
    error: a.string(),
    ticketId: a.id(),
    reference: a.string(),
    severity: a.string(),
    triageSummary: a.string(),
    alertStatus: a.string()
  }),

  submitSupportTicket: a
    .mutation()
    .arguments({
      restaurantId: a.id().required(),
      title: a.string().required(),
      category: a.string().required(),
      description: a.string().required(),
      expectedBehavior: a.string(),
      actualBehavior: a.string(),
      route: a.string(),
      browserInfo: a.string()
    })
    .returns(a.ref("SupportTicketResult"))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(supportAccess)),

  getPlatformAccess: a
    .query()
    .returns(a.ref("PlatformAccessResult"))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(platformAccess)),

  managePlatformAccess: a
    .mutation()
    .arguments({
      email: a.email().required(),
      role: a.string().required(),
      action: a.string().required()
    })
    .returns(a.ref("PlatformAccessResult"))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(platformAccess)),

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
      allow.groupDefinedIn("managerGroup").to(["update"]),
      // Platform owners can inspect workspace status during support, transfer,
      // and billing operations. This does not grant access to training content.
      allow.groups(["lineup-platform-owners"]).to(["read"])
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

  // A TrainingDocAcknowledgement records that one team member reviewed one page.
  // It complements quiz scores: managers can see both reading activity and demonstrated knowledge.
  TrainingDocAcknowledgement: a
    .model({
      restaurantId: a.id().required(),
      trainingDocId: a.id().required(),
      userProfileId: a.id().required(),
      cognitoUserId: a.string(),
      reviewedAt: a.datetime().required(),
      tenantGroup: a.string(),
      managerGroup: a.string()
    })
    .authorization((allow) => [
      allow.ownerDefinedIn("cognitoUserId").identityClaim("sub").to(["create", "read", "update"]),
      allow.groupDefinedIn("managerGroup").to(["read"])
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
    ]),

  // A Certification is a manager-created mastery goal.
  // Example: "BTG Wine Certified" can require staff to pass selected wine quizzes.
  StaffGroup: a
    .model({
      restaurantId: a.id().required(),
      name: a.string().required(),
      description: a.string(),
      status: a.enum(["active", "archived"]),
      createdBy: a.id(),
      updatedBy: a.id(),
      tenantGroup: a.string(),
      managerGroup: a.string()
    })
    .authorization((allow) => [
      allow.groupDefinedIn("tenantGroup").to(["read"]),
      allow.groupDefinedIn("managerGroup").to(["create", "update", "delete"])
    ]),

  StaffGroupMember: a
    .model({
      restaurantId: a.id().required(),
      staffGroupId: a.id().required(),
      userProfileId: a.id().required(),
      membershipId: a.id(),
      status: a.enum(["active", "removed"]),
      tenantGroup: a.string(),
      managerGroup: a.string()
    })
    .authorization((allow) => [
      allow.groupDefinedIn("tenantGroup").to(["read"]),
      allow.groupDefinedIn("managerGroup").to(["create", "update", "delete"])
    ]),

  TrainingAssignment: a
    .model({
      restaurantId: a.id().required(),
      itemType: a.enum(["quiz", "certification"]),
      itemId: a.id().required(),
      targetType: a.enum(["group", "member"]),
      targetId: a.id().required(),
      note: a.string(),
      dueDate: a.date(),
      status: a.enum(["active", "archived"]),
      assignedBy: a.id(),
      tenantGroup: a.string(),
      managerGroup: a.string()
    })
    .authorization((allow) => [
      allow.groupDefinedIn("tenantGroup").to(["read"]),
      allow.groupDefinedIn("managerGroup").to(["create", "update", "delete"])
    ]),

  Certification: a
    .model({
      restaurantId: a.id().required(),
      name: a.string().required(),
      description: a.string(),
      category: a.string(),
      status: a.enum(["draft", "published", "archived"]),
      requiredQuizIdsJson: a.string(),
      createdBy: a.id(),
      updatedBy: a.id(),
      tenantGroup: a.string(),
      managerGroup: a.string()
    })
    .authorization((allow) => [
      allow.groupDefinedIn("tenantGroup").to(["read"]),
      allow.groupDefinedIn("managerGroup").to(["create", "update", "delete"])
    ]),

  // A SupportTicket captures a restaurant user's problem or feature request.
  // Creation runs through a backend function that verifies active membership.
  SupportTicket: a
    .model({
      restaurantId: a.id().required(),
      restaurantName: a.string(),
      reference: a.string().required(),
      title: a.string().required(),
      category: a.enum(["upload", "access", "content", "invite", "quiz", "billing", "login", "feature_request", "other"]),
      severity: a.enum(["low", "normal", "high", "critical"]),
      status: a.enum(["open", "investigating", "waiting", "resolved", "closed"]),
      description: a.string().required(),
      expectedBehavior: a.string(),
      actualBehavior: a.string(),
      route: a.string(),
      browserInfo: a.string(),
      reporterName: a.string(),
      reporterEmail: a.email(),
      reporterRole: a.string(),
      reporterUserProfileId: a.id(),
      reportedByCognitoUserId: a.string(),
      triageSummary: a.string(),
      suggestedChecksJson: a.string(),
      resolutionNotes: a.string(),
      alertStatus: a.string(),
      tenantGroup: a.string(),
      managerGroup: a.string()
    })
    .authorization((allow) => [
      allow.ownerDefinedIn("reportedByCognitoUserId").identityClaim("sub").to(["read"]),
      allow.groupDefinedIn("managerGroup").to(["read"]),
      allow.groups(["lineup-platform-owners"]).to(["read", "update"])
    ])
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool"
  }
});
