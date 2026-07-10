# Billing Roadmap

Line Up now has the full Stripe billing loop foundation:

- Stripe Checkout for setup
- Stripe Customer Portal for billing management
- Stripe webhook handling for subscription status updates
- trial/subscription warning and enforcement in the app

## Built Now

- Restaurant records store Stripe customer and subscription fields.
- Account Owners/Admins can open `/manager/billing`.
- The frontend never handles card data.
- A backend Amplify Function creates Stripe Checkout Sessions.
- A backend Amplify Function creates Stripe Customer Portal Sessions.
- A public Stripe webhook Function verifies Stripe signatures before processing events.
- Webhook events update only Restaurant billing fields.
- Checkout, subscription, and customer metadata include `restaurantId`.

## Webhook Events Handled

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`
- `invoice.payment_succeeded`

## Required Secrets And Environment

```text
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
LINE_UP_APP_BASE_URL=https://your-line-up-domain.com
VITE_APP_BASE_URL=https://your-line-up-domain.com
```

## What Still Needs Production Hardening

- Backend role validation should load the signed-in user and active Membership server-side.
- Checkout and portal mutations currently receive the current role from the frontend as a practical MVP guard.
- Add audit logs for billing changes and webhook events.
- Add automated tests around webhook event payloads.
- Add a clearer admin view for failed payment recovery.
- Configure Stripe Customer Portal rules in the Stripe dashboard before production use.

## Testing Notes

- Checkout and Customer Portal can be tested in Stripe test mode.
- Webhooks require either a deployed public Function URL or Stripe CLI forwarding.
- The webhook URL is exposed as `stripeWebhookUrl` in Amplify outputs.
- The webhook rejects unsigned or invalid Stripe requests.
