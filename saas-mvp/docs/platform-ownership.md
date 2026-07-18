# Line Up Ownership And Access

Line Up has two different kinds of ownership. Keep them separate.

## 1. Business Infrastructure Ownership

This is the legal and technical control of the product itself:

- AWS account root email, recovery methods, billing, and MFA
- GitHub organization and repository ownership
- Stripe account ownership and bank details
- domain registrar and DNS ownership
- business email/domain administrator access
- Amazon SES sender/domain verification
- Apple/Google developer accounts if mobile apps are added later
- password manager and recovery-code custody

The AWS root user must never be used as a daily developer login and must never be shared. Secure it with a company-controlled email, a hardware MFA key, offline recovery codes, and current billing/contact details.

Developers should receive named access through AWS IAM Identity Center and GitHub teams. Give each person only the access needed for their job, and remove it when their work ends.

If Line Up is acquired, transfer these business assets through a written closing checklist. The buyer should replace root recovery details, MFA, billing, repository ownership, Stripe ownership, domain access, and production secrets during the handover.

## 2. Line Up Application Roles

These roles control the product UI:

- **Platform Owner:** can open Platform Control, review restaurant workspace metadata, and grant or revoke platform access.
- **Platform Developer:** can open the internal platform area but cannot list customer workspaces or read customer training libraries by default.
- **Restaurant Account Owner/Admin/Manager/Staff:** existing roles that apply inside one restaurant only.

A restaurant Account Owner is not a Line Up Platform Owner.

## Bootstrap The First Platform Owner

The first Platform Owner must be added by a trusted AWS administrator after the backend is deployed. This is intentionally not a public signup option.

1. Find the Cognito user pool ID in `amplify_outputs.json` under `auth.user_pool_id`.
2. Find the Cognito username for the founder's existing Line Up login.
3. Add that username to `lineup-platform-owners`.
4. Sign out of Line Up and sign back in so Cognito issues a token containing the new role.

Example AWS CLI commands:

```bash
aws cognito-idp list-users \
  --user-pool-id YOUR_USER_POOL_ID \
  --filter 'email = "founder@yourcompany.com"'

aws cognito-idp admin-add-user-to-group \
  --user-pool-id YOUR_USER_POOL_ID \
  --username THE_COGNITO_USERNAME \
  --group-name lineup-platform-owners
```

After bootstrap, a Platform Owner can manage other existing Line Up users from `/platform`.

## Developer Testing Policy

1. The developer creates their own Line Up login.
2. A Platform Owner grants `Platform Developer` access from Platform Control.
3. Create a dedicated restaurant workspace named clearly as a test workspace.
4. Invite the developer into that test workspace with the restaurant role needed for testing.
5. Never use a real customer's workspace for routine development.
6. Do not share passwords, AWS root access, Stripe secrets, or production environment secrets.

Platform Developer access does not grant customer data access. If support access is added later, it should require a reason, restaurant approval, an expiration time, and an audit log.

## Handover Checklist

Before any sale or ownership transfer:

- identify the buyer's authorized technical and business contacts
- export an inventory of AWS resources, GitHub repositories, domains, Stripe products, and production secrets
- add buyer administrators with named accounts
- transfer organization/account ownership where the provider supports it
- replace root email, recovery methods, MFA, payment methods, and security contacts
- rotate AWS, Stripe, SES, GitHub, and application secrets
- confirm the buyer can deploy, roll back, access logs, and restore backups
- remove previous owner/developer access after written acceptance
- record the date, people, and assets included in the handover

Use legal and tax professionals for the business transfer itself. This document is an operational checklist, not legal advice.
