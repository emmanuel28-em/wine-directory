# Production Smoke Test

Run this after each production deploy.

## Public

- [ ] Landing page loads.
- [ ] Pricing/trial CTA goes to `/trial`.
- [ ] Managed setup page loads.
- [ ] Sign in page loads.

## Owner/Admin

- [ ] Trial signup works.
- [ ] Restaurant workspace is created.
- [ ] Dashboard loads.
- [ ] Billing card appears.
- [ ] Billing page loads.
- [ ] Stripe Checkout opens if configured.
- [ ] Stripe Portal opens if a Stripe customer exists.
- [ ] Workspace Settings loads.
- [ ] Restaurant logo upload works if Storage is configured.
- [ ] Invite Team page works.
- [ ] Email invite sends if SES is configured.
- [ ] Manual invite link fallback works.

## Manager

- [ ] Manager can add a training category.
- [ ] Manager can add a training page.
- [ ] Manager can upload a file.
- [ ] Manager can publish a training page.
- [ ] Manager can generate quiz questions from training material.
- [ ] Manager can view staff progress.
- [ ] Manager cannot access Billing unless intentionally promoted to Owner/Admin.

## Staff

- [ ] Staff can accept an invite.
- [ ] Staff can log in.
- [ ] Staff can see published training pages only.
- [ ] Staff can view attached resources.
- [ ] Staff can take a quiz.
- [ ] Staff can see personal progress.
- [ ] Staff cannot access manager pages.
- [ ] Staff cannot access Billing.

## Billing And Trial

- [ ] Active trial allows normal app use.
- [ ] Active subscription allows normal app use.
- [ ] Expired trial without active subscription shows warning.
- [ ] Expired/past-due/canceled workspace blocks new content, quizzes, uploads, and invites.
- [ ] Existing data is not deleted or hidden.
- [ ] Owner/Admin can still access Billing when workspace needs payment.

## Tenant Isolation

- [ ] Restaurant A cannot see Restaurant B content.
- [ ] Restaurant A cannot see Restaurant B files.
- [ ] Restaurant A cannot see Restaurant B quizzes.
- [ ] Restaurant A cannot see Restaurant B staff progress.
- [ ] Restaurant A cannot manage Restaurant B billing.
- [ ] Invite links only add users to the intended restaurant.

## External Services

- [ ] SES sender is verified.
- [ ] Stripe Checkout success/cancel returns to the production URL.
- [ ] Stripe Customer Portal returns to the production URL.
- [ ] Stripe webhook updates subscription status.
- [ ] Invite emails point to the production URL.
