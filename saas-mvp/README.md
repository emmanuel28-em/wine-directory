# Line Up

Line Up is a restaurant training platform. It is separate from the old static Rezdora training site.

## Current Product Status

The app currently includes:

- public Line Up landing page
- free-trial restaurant workspace signup
- secure sign in / sign out
- active restaurant workspace lookup
- Account Owner, Admin, Manager, and Staff roles
- role-aware navigation
- protected manager routes
- protected staff routes
- Training Categories
- Training Pages
- published staff Training Library
- Rezdora existing-content import for the Rezdora workspace
- Managed Setup request page

It does **not** include file uploads, billing, staff invites, generated quizzes, production-grade backend tenant authorization, or staff progress tracking yet.

## Why This Folder Exists

The old static app is still useful as a demo/reference version.

This `/saas-mvp` folder is where the real product will grow into:

- restaurant signup
- manager accounts
- staff accounts
- content management
- quizzes
- quiz results
- paid trials/subscriptions

## Local Setup

From this folder:

```bash
cd "/Users/emmanuelmorales/Documents/Wine Project/saas-mvp"
npm install
npm run dev
```

Vite will print a local URL, usually:

```text
http://localhost:5173/
```

Open that URL in your browser.

## Cloud Setup

The code uses AWS Amplify for secure login and database records, so real signup/login and saved content need a local cloud sandbox.

From this folder, run:

```bash
npm run sandbox
```

That runs:

```bash
npx ampx sandbox
```

Amplify will create AWS resources and generate:

```text
amplify_outputs.json
```

Keep that sandbox command running in one terminal.

Then open another terminal and run:

```bash
npm run dev
```

Now visit:

```text
http://127.0.0.1:5173/login
```

You should see the Line Up sign up / sign in form.

## Trial Signup Flow

With `npm run sandbox` running in one terminal and `npm run dev` running in another, visit:

```text
http://127.0.0.1:5173/trial
```

Enter:

- account owner first and last name
- work email
- password
- restaurant name
- restaurant address / city
- title

Use a new email address for a clean test. If your email supports plus-addressing, you can use something like:

```text
yourname+trial1@example.com
```

After submitting:

1. The app creates the secure login user.
2. If email confirmation is required, enter the code from your email.
3. The app signs you in.
4. The app creates the restaurant workspace.
5. The app creates the account owner profile.
6. The app connects the account owner to the workspace with the Account Owner role.
7. You are redirected to `/manager`.

The Workspace Dashboard should show:

- restaurant name
- trial status
- trial end date
- account owner role
- next setup steps

## Manager Content Flow

After logging in with a trial restaurant account, visit:

```text
http://127.0.0.1:5173/manager/content
```

Test content creation:

1. Create one wine training doc and set status to `published`.
2. Create one food training doc and set status to `published`.
3. Create one SOP training doc and set status to `published`.
4. Visit:

```text
http://127.0.0.1:5173/staff
```

5. Confirm those three published items appear in the staff library.
6. Go back to `/manager/content`.
7. Create one more item and leave status as `draft`.
8. Return to `/staff`.
9. Confirm the draft item does not appear.

Test editing:

1. Go to `/manager/content`.
2. Click `Edit` on a training doc.
3. Change the title, description, or notes.
4. Save changes.
5. Confirm the updated item appears in the manager list.

Test archive/delete:

1. Click `Archive` to hide an item from staff without deleting it.
2. Click `Delete` to permanently remove a test item.

## Training Category And Training Page Flow

If the local cloud sandbox is not running, start it:

```bash
npm run sandbox
```

Wait for the sandbox to finish updating before testing Training Categories and Training Pages.

On `/manager/content`, test the manager workflow:

1. Create a Training Category called `Dinner Menu`.
2. Create another Training Category called `BTG Wines`.
3. Create a Training Page called `Uovo Raviolo` under `Dinner Menu`.
4. Add one-liner, ingredients, allergens, talking points, and Testable Staff Knowledge.
5. Paste existing Google Docs notes into the `Full Notes` field.
6. Add at least one Testable Staff Knowledge item.
7. Publish the doc.
8. Visit `/staff`.
9. Confirm the page appears under `Dinner Menu`.
10. Create a draft Training Page.
11. Confirm staff cannot see the draft page.

Testable Staff Knowledge is saved for future quiz generation. Example:

```json
[
  {
    "label": "Allergens",
    "value": "Contains gluten, dairy, and egg.",
    "questionHint": "What allergens are in the Uovo Raviolo?",
    "quizEligible": true
  }
]
```

This does not generate quizzes yet. It only stores structured facts so quizzes can be built later.

## Import Existing Training Content

The app includes a reusable import utility at:

```text
src/lib/importExistingRestaurantContent.js
```

The imported source material lives at:

```text
src/legacy/rezdoraExistingTrainingContent.js
```

That file was created from the original static app's `../data.js`. It is source material for the real Rezdora workspace, not demo-only data.

To test the import:

1. Start the Amplify sandbox:

```bash
npm run sandbox
```

2. In another terminal, start the app:

```bash
npm run dev
```

3. Log in with the account connected to the Rezdora workspace:

```text
manny@rezdora.nyc
```

4. Go to:

```text
http://127.0.0.1:5173/manager/content
```

5. Click `Import Existing Training Content`.
6. The app should create Training Categories like `Dinner Menu`, `Lunch Menu`, `Brunch Menu`, `Pasta Tasting Menu`, `BTG Wines`, `Cocktails`, and `Food Items`.
7. Go to:

```text
http://127.0.0.1:5173/staff
```

8. Confirm the imported content appears grouped by Training Category.
9. Click the import button again and confirm it skips existing pages instead of creating duplicates.

To test tenant separation:

1. Create or log into a different restaurant workspace, such as `Massara`.
2. Go to `/staff`.
3. Confirm Rezdora content does not appear.
4. Go to `/manager/content`.
5. Confirm the Rezdora import button is not offered to that workspace.

## Current Pages

- `/` public landing page
- `/trial` start free trial page
- `/managed-setup` done-for-you setup inquiry page
- `/login` Line Up sign in page
- `/manager` protected Workspace Dashboard for Account Owners, Admins, and Managers
- `/manager/content` protected content management page for Account Owners, Admins, and Managers
- `/manager/settings` protected settings placeholder
- `/manager/staff-progress` protected staff progress placeholder
- `/manager/invite-team` protected invite team page
- `/training-library` protected staff-facing Training Library for all active members
- `/staff` same staff-facing Training Library
- `/quizzes` protected quiz placeholder
- `/my-progress` protected staff progress placeholder
- `/report-issue` protected issue reporting placeholder

## Testing Tenant Security And Roles

Logged out:

- Visit `/manager`
- You should be redirected to `/login`
- Visit `/training-library`
- You should be redirected to `/login`

Account Owner/Admin/Manager:

- Sign up or sign in at `/login`
- Visit `/manager`
- Visit `/manager/content`
- Both should load
- Visit `/training-library`
- Published training pages for that restaurant should load
- Use the `Log out` button in the header
- Try `/manager` again and it should redirect back to `/login`

Staff role:

- While running locally with `npm run dev`, use the clearly labeled `Development role testing` dropdown in the signed-in bar.
- Change your role to `Staff`.
- Visit `/training-library`.
- It should load published content.
- Visit `/manager`.
- You should see: `You do not have permission to access this page.`
- Visit `/manager/content`.
- You should see the same permission message.
- Change the local testing dropdown back to `Account Owner`, `Admin`, or `Manager` when done.

Restaurant A vs Restaurant B:

1. Create Restaurant A with one account.
2. Add and publish one Training Page.
3. Confirm that account can see it in `/manager/content` and `/training-library`.
4. Log out.
5. Create Restaurant B with a different account.
6. Visit `/training-library`.
7. Confirm Restaurant B does not see Restaurant A content.
8. Confirm Restaurant B has an empty library until it adds or imports its own content.
9. Create a draft or archived page in Restaurant B.
10. Confirm draft/archived content does not show in `/training-library`.

## Testing Invite Team

Invites add a new database model. Before testing, restart the cloud sandbox:

```bash
npm run sandbox
```

Wait for the sandbox to finish updating, then run the app:

```bash
npm run dev
```

Owner invites Staff:

1. Sign in as an Account Owner.
2. Go to `/manager/invite-team`.
3. Enter first name, last name, email, choose `Staff`, and create the invite.
4. Copy the generated invite link.
5. Log out.
6. Open the invite link.
7. Create an account or sign in using the same email address that was invited.
8. Accept the invite.
9. Confirm the staff user lands in `/training-library`.
10. Confirm the staff user cannot access `/manager` or `/manager/content`.

Owner invites Admin/Manager:

1. Sign in as an Account Owner.
2. Go to `/manager/invite-team`.
3. Choose `Admin` or `Manager`.
4. Copy the invite link.
5. Log out.
6. Open the invite link.
7. Create an account or sign in using the invited email.
8. Accept the invite.
9. Confirm the Admin/Manager lands in `/manager`.
10. Confirm the Admin/Manager can access `/manager/content`.

Admin/Manager invites Staff:

1. Sign in as an Admin or Manager.
2. Go to `/manager/invite-team`.
3. Confirm only `Staff` is available as the invite role.
4. Create a staff invite and accept it with the invited email.

Manual email note:

- Email sending is not built yet.
- For now, copy the invite link and send it manually.
- Later, this should connect to an email service so Line Up sends invites automatically.

## Why restaurantId Matters

This is the most important tenant-separation rule:

Every restaurant-owned record has a `restaurantId`.

That includes the user's role connection, Training Categories, Training Pages, future quizzes, future quiz questions, and future quiz attempts.

The frontend now loads the current user's active role connection first, then uses that restaurant's `restaurantId` for Training Category and Training Page queries.

## Production Hardening Still Needed

The current app enforces tenant isolation and role access in the frontend by:

- requiring an active role connection to a restaurant workspace
- checking the user's role before protected routes load
- filtering Training Categories and Training Pages by the current restaurant's `restaurantId`
- showing only published pages in the staff Training Library

Before production customers, backend authorization should be hardened further so database access is not only protected by frontend filters. The current Amplify Data rules still allow authenticated users broadly; a production version should add stronger owner/group/custom authorization for tenant records.

## Next Product Step

After tenant security and role checks are stable, the next build should be the staff invite system:

- Account Owner/Admin/Manager creates invite
- invite chooses role
- recipient joins the correct restaurant workspace
- staff receives staff-only access
