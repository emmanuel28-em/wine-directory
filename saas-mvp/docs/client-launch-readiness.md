# Client Launch Readiness

This document explains what is ready before inviting a real restaurant into Line Up.

## Ready Now

- Public landing page.
- Trial signup.
- Guided owner onboarding.
- Bulk paste/review/import for menu notes and tech sheets.
- Imported pages default to draft and duplicate retries are skipped.
- Public managed-setup inquiries are stored without exposing inquiry records publicly.
- Restaurant workspace creation.
- Login/logout.
- Owner, Admin, Manager, and Staff roles.
- Manager dashboard.
- Training categories and training pages.
- Staff training library.
- File uploads for training pages.
- Invite links.
- SES email invite foundation.
- Manual invite link fallback.
- Quiz builder.
- Quiz generation from training material.
- Staff quiz taking.
- Staff progress tracking.
- Workspace Settings and Team Management.
- Stripe Checkout.
- Stripe Customer Portal.
- Stripe webhook function.
- Trial/subscription warning and basic enforcement.
- Backend-enforced restaurant data isolation.
- Server-side trial provisioning, invite acceptance, billing checks, and team access changes.
- Point-in-time recovery for production DynamoDB tables and S3 object versioning.

## Must Be Configured Before Inviting A Client

- Deploy Line Up to AWS Amplify Hosting.
- Set `VITE_APP_BASE_URL` to the deployed app URL.
- Set `LINE_UP_APP_BASE_URL` to the deployed app URL.
- Verify SES sender email/domain.
- Set `LINE_UP_FROM_EMAIL`.
- Create Stripe Product and monthly Price.
- Set `STRIPE_SECRET_KEY`.
- Set `STRIPE_PRICE_ID_MONTHLY`.
- Configure Stripe Customer Portal.
- Add Stripe webhook endpoint using the deployed `stripeWebhookUrl`.
- Set `STRIPE_WEBHOOK_SECRET`.
- Run the production smoke test.

Until Stripe and SES are configured, Line Up keeps safe fallbacks: billing displays a clear configuration error and team invites provide a manual copyable link. Those fallbacks are useful for testing, but they are not the finished paid-client experience.

## Known Limitations

- A live second-restaurant test confirmed it could not list or open Rezdora data.
- Checkout, Customer Portal, invite-email, trial provisioning, invite acceptance, and team-access functions verify identity and Membership server-side.
- S3 paths are restaurant-scoped in the app, but Storage authorization is still broad for authenticated users. Keep the first pilot's source files non-sensitive until a server-side file layer is added.
- Stripe webhooks require a deployed endpoint or Stripe CLI forwarding to fully test.
- SES requires a verified sender/domain and production access for live email sending.
- Public unauthenticated uploads are disabled.
- Audit logs are not implemented yet.
- Founder should manually monitor early client usage and errors.

## Recommended First Client Onboarding Flow

1. Create restaurant workspace.
2. Upload restaurant logo.
3. Add 5-10 training pages.
4. Attach source files.
5. Generate 1-2 quizzes.
6. Invite GM/admin first.
7. GM reviews content.
8. Invite small staff group.
9. Watch for login, content, upload, quiz, and invite issues.
10. Convert to paid plan or continue subscription.

## First Client Launch Gate

Before Massara or another unrelated restaurant receives an account:

1. Configure and test a verified SES sender, or explicitly use manual invite links during the pilot.
2. Connect Stripe in test mode and complete Checkout, webhook, and Customer Portal tests.
3. Run one owner, one manager, and one staff walkthrough on desktop and mobile.
4. Keep uploaded source documents non-sensitive during the controlled pilot.
5. Agree on pilot support, content responsibility, and pricing in writing.

Completed July 17, 2026:

- Rezdora data backfill and Cognito workspace groups.
- Production DynamoDB point-in-time recovery and S3 versioning.
- Live two-restaurant Data isolation test, followed by removal of the temporary tenant.

## First Client Launch Notes

- Start with a small pilot group before inviting the whole staff.
- Keep the first content library focused and useful.
- Add the highest-value training areas first: current menu, wine/cocktail specs, allergy notes, and opening/closing SOPs.
- Ask the GM which training gaps create the most service friction.
- Schedule a short review after the first week.
- Track bugs manually until audit logs and reporting improve.
