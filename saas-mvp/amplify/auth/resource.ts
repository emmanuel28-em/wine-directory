import { defineAuth } from "@aws-amplify/backend";

// This creates the Amazon Cognito user pool for the SaaS MVP.
// Checkpoint 2 keeps auth simple: users sign up and log in with email + password.
export const auth = defineAuth({
  loginWith: {
    email: true
  },
  // These are Line Up company roles, not restaurant roles. Restaurant access
  // continues to use the restaurant-specific groups created during onboarding.
  groups: ["lineup-platform-owners", "lineup-platform-developers"]
});
