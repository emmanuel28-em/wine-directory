# Line Up Security Audit

## Scope

This audit covers the current SaaS MVP data access patterns for Line Up.

Files inspected:

- `amplify/data/resource.ts`
- `src/hooks/useCurrentWorkspace.js`
- `src/lib/workspace.js`
- `src/lib/permissions.js`
- `src/lib/collections.js`
- `src/lib/trainingDocs.js`
- `src/lib/invites.js`
- `src/lib/quizzes.js`
- `src/lib/fileAssets.js`
- `src/lib/billing.js`
- `src/lib/settings.js`
- `src/lib/importExistingRestaurantContent.js`
- `src/pages/ManagerContentPage.jsx`
- `src/pages/InviteTeamPage.jsx`
- `src/pages/AcceptInvitePage.jsx`
- `src/pages/ManagerQuizzesPage.jsx`
- `src/pages/StaffQuizzesPage.jsx`
- `src/pages/ManagerStaffProgressPage.jsx`
- `src/pages/MyProgressPage.jsx`
- `src/components/ProtectedRoute.jsx`
- `src/components/AppLayout.jsx`

## Data Models

Tenant-owned records:

- `Restaurant`
- `Membership`
- `Invite`
- `ContentCollection`
- `TrainingDoc`
- `Quiz`
- `QuizQuestion`
- `QuizAttempt`
- `FileAsset`
- `ManagedSetupRequest`

User-owned or identity-related records:

- `UserProfile`

The most important tenant rule is that restaurant-owned records include `restaurantId`.

## Current Backend Authorization State

Amplify Data currently uses Cognito user-pool auth with broad authenticated access:

```ts
.authorization((allow) => [allow.authenticated()])
```

This means the backend checks that someone is signed in, but it does not yet fully enforce restaurant-level tenant isolation by itself.

Backend-enforced today:

- The user must be authenticated for model access.
- Unauthenticated users cannot directly read/write normal Data records.

Not fully backend-enforced yet:

- A user can only read records for restaurants where they have an active `Membership`.
- Staff can only read published training docs.
- Staff can only view their own quiz attempts.
- Managers can only manage records inside their restaurant.

## Current Frontend/App-Layer Protections

The app now uses shared permission helpers in `src/lib/permissions.js`:

- `isOwner`
- `isAdminOrManager`
- `isStaff`
- `canManageContent`
- `canInviteRole`
- `canViewStaffProgress`
- `canManageQuizzes`
- `requireRestaurantId`
- `assertActiveWorkspace`
- `assertSameRestaurant`

Route protections:

- Manager pages require Account Owner/Admin/Manager roles.
- Staff pages require an active member role.
- Staff cannot access manager pages through normal routes.

Data helper protections:

- Training Categories list by `restaurantId`.
- Training Pages list by `restaurantId`.
- Quizzes list by `restaurantId`.
- Quiz Questions list by `restaurantId`.
- Quiz Attempts list by `restaurantId`.
- File Assets list by `restaurantId`.
- Billing checkout uses the current workspace's restaurant id and sends card collection to Stripe Checkout.
- Billing portal sends owners/admins to Stripe Customer Portal instead of collecting card details in Line Up.
- Stripe webhook events verify Stripe signatures before updating Restaurant billing fields.
- Stripe secret keys are used only by backend functions, never browser code.
- Updates/deletes for Training Categories, Training Pages, Quizzes, and Quiz Questions verify the record belongs to the active restaurant before changing it.
- File deletes verify the file belongs to the active restaurant before deleting metadata and the Storage object.
- Workspace Settings lists Team Members and Invites by `restaurantId`.
- Team role changes and disabling verify the target Membership belongs to the current restaurant.
- Restaurant logo uploads are stored under a restaurant-scoped Storage path.
- Staff quiz attempt saving verifies the quiz and questions belong to the same active restaurant.
- Staff personal progress filters by both `restaurantId` and `userProfileId`.
- Invite creation checks the inviter role.
- Invite acceptance rechecks pending status, expiration, and invited email before creating/updating membership.

## Risks Before Production

The biggest remaining risk is that tenant isolation is still mostly enforced in frontend and client-side helper code, not in backend authorization rules.

This is much safer than the previous state because unsafe helper calls now fail early, but it is not enough for real paid customers long term.

Remaining risks:

- A malicious authenticated user could potentially call the GraphQL API directly unless backend auth rules are tightened.
- `Invite` lookup by token must remain carefully controlled when email sending is added.
- Storage access is currently broadly authenticated by path pattern, while app helpers enforce tenant checks before upload/list/delete.
- Account Owner/Admin/Manager roles are not yet enforced by backend resolvers.
- Workspace Settings role actions are enforced in app helpers, not backend resolvers yet.
- Billing checkout and portal creation are Owner/Admin route-protected in the app, but should load and verify the caller's role server-side before production.
- Stripe webhook table updates use verified Stripe signatures, but webhook event logging/replay protection should be expanded before production.
- Development role switching exists locally for testing, though it is hidden outside `import.meta.env.DEV`.

## Safe Implementation Plan Used In This Checkpoint

This checkpoint intentionally avoided risky schema rewrites.

Implemented now:

1. Shared permission helper file.
2. Centralized role rules.
3. Required `restaurantId` guards in data helpers.
4. Record ownership verification before update/delete operations.
5. Invite role validation and invite acceptance revalidation.
6. README production-readiness notes.

Deferred until a production hardening phase:

1. Add backend-enforced tenant authorization.
2. Consider a server-side Function/API layer for manager operations.
3. Add relationship-based auth or custom resolvers for `Membership`-scoped access.
4. Add audit logging for invites, role changes, content publishing, and quiz attempts.
5. Remove or lock down development-only role testing in deployed environments.

## Recommended Future Hardening

Before real paid restaurants use Line Up, add backend controls so the database itself enforces tenant rules.

Recommended path:

1. Add a server-side API layer for sensitive operations:
   - create/update/archive Training Pages
   - create/update/publish Quizzes
   - create/revoke Invites
   - create Stripe Checkout Sessions
   - create Stripe Customer Portal Sessions
   - view Staff Progress
2. In that server-side layer, load the signed-in user profile and active membership before any write.
3. Enforce role permissions server-side.
4. Keep direct client reads limited to safe staff-facing data.
5. Consider separate owner fields or group claims if Amplify Data relationship auth can support the tenant model cleanly.

## Test Checklist

Restaurant isolation:

1. Create Restaurant A owner.
2. Add Training Categories, Training Pages, and a Quiz.
3. Invite Staff A.
4. Confirm Staff A sees only Restaurant A published content and quizzes.
5. Create Restaurant B owner.
6. Confirm Restaurant B cannot see Restaurant A content, quizzes, invites, or quiz attempts.
7. Confirm Staff A cannot see Restaurant B content.

Role isolation:

1. Staff can view Training Library.
2. Staff can take published quizzes.
3. Staff can view only their own progress.
4. Staff cannot open `/manager`, `/manager/content`, `/manager/quizzes`, `/manager/staff-progress`, `/manager/invite-team`, or `/manager/billing`.
5. Manager/Admin/Owner can manage content and quizzes.
6. Admin/Manager can invite Staff.
7. Only Account Owner can invite Admin/Manager.

Dev leakage:

1. Data Test is not in public navigation.
2. Development role switcher only appears in local dev mode.
3. Temporary placeholder pages are labeled as placeholders and not exposed as real features.
