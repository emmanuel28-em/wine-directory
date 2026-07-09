import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  // A Restaurant is one customer/tenant using the SaaS product.
  // Example: Rezdora, or another restaurant that signs up later.
  Restaurant: a
    .model({
      name: a.string().required(),
      slug: a.string().required(),
      plan: a.string(),
      trialEndsAt: a.datetime(),
      status: a.string(),
      stripePaymentLink: a.string()
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
