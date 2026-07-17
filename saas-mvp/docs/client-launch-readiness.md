# Client Launch Readiness

This document explains what is ready before inviting a real restaurant into Line Up.

## Ready Now

- Public landing page.
- Trial signup.
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

## Known Limitations

- Backend tenant authorization still needs deeper database-level hardening before many paying customers.
- Checkout and portal role checks should eventually verify Membership server-side.
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

## First Client Launch Notes

- Start with a small pilot group before inviting the whole staff.
- Keep the first content library focused and useful.
- Add the highest-value training areas first: current menu, wine/cocktail specs, allergy notes, and opening/closing SOPs.
- Ask the GM which training gaps create the most service friction.
- Schedule a short review after the first week.
- Track bugs manually until audit logs and reporting improve.
