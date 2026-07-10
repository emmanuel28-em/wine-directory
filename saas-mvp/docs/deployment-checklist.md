# Production Deployment Checklist

Use this checklist before deploying Line Up to AWS Amplify Hosting.

## App Location

The deployable SaaS app lives in:

```text
saas-mvp
```

If the GitHub repository contains other files outside this app, set the Amplify app root/base directory to:

```text
saas-mvp
```

## Frontend Environment Variables

Set this in Amplify Hosting for the frontend build:

```text
VITE_APP_BASE_URL=https://your-production-line-up-url.com
```

This URL is used by browser-side links such as invite links.

## Backend / Function Secrets And Environment

Set these for the Amplify backend/functions:

```text
LINE_UP_APP_BASE_URL=https://your-production-line-up-url.com
LINE_UP_FROM_EMAIL=verified-sender@yourdomain.com
STRIPE_SECRET_KEY=sk_live_or_test_...
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Security Notes

- Stripe secrets must never be exposed to frontend code.
- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` belong only in backend/function configuration.
- SES sender email/domain must be verified before invite emails can send.
- Stripe webhook endpoint needs the deployed `stripeWebhookUrl` from Amplify outputs.
- Production URL must be used in Stripe Checkout success/cancel URLs.
- Production URL must be used in Stripe Customer Portal return URLs.
- Production URL must be used in SES invite emails.

## AWS Amplify Hosting Setup

1. Push the project to GitHub.
2. In AWS Amplify, create a new app from the GitHub repository.
3. Set the app root/base directory to:

```text
saas-mvp
```

4. Set the build command:

```text
npm run build
```

5. Set the output directory:

```text
dist
```

6. Configure frontend environment variables.
7. Configure backend/function secrets and environment variables.
8. Deploy.
9. Copy the deployed Amplify URL.
10. Set both app URL variables to that deployed URL:

```text
VITE_APP_BASE_URL=https://your-deployed-amplify-url
LINE_UP_APP_BASE_URL=https://your-deployed-amplify-url
```

11. Redeploy after changing environment variables.

## Stripe Setup

1. Create a Stripe Product for Line Up.
2. Create a recurring monthly Price.
3. Copy the `price_...` ID into `STRIPE_PRICE_ID_MONTHLY`.
4. Configure Stripe Customer Portal in the Stripe dashboard.
5. Add a webhook endpoint using the deployed `stripeWebhookUrl`.
6. Subscribe the webhook endpoint to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`
7. Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

## SES Setup

1. Verify the sender email address or domain in Amazon SES.
2. If SES is still in sandbox mode, verify test recipient emails or request production access.
3. Set `LINE_UP_FROM_EMAIL` to the verified sender.
4. Send a test invite from `/manager/invite-team`.
5. Confirm the email invite points to the production app URL.

## Pre-Launch Checks

- Dev role switcher appears only in local development.
- Data test page is not linked in production navigation.
- Staff cannot access manager-only pages.
- Staff cannot access `/manager/billing`.
- Owner/Admin can access `/manager/billing`.
- Manual invite link fallback works if SES is not configured.
- Stripe Checkout and Customer Portal show clear setup errors if Stripe is not configured.
