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
- manual team invites with copyable invite links
- quiz builder
- staff quiz taking
- staff and manager quiz progress

It does **not** include file uploads, billing, automatic invite emails, generated quizzes, or production-grade backend tenant authorization yet.

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
- `/manager/quizzes` protected quiz builder for Account Owners, Admins, and Managers
- `/manager/staff-progress` protected quiz results page for Account Owners, Admins, and Managers
- `/manager/settings` protected settings placeholder
- `/manager/invite-team` protected invite team page
- `/training-library` protected staff-facing Training Library for all active members
- `/staff` same staff-facing Training Library
- `/quizzes` protected staff quiz page
- `/my-progress` protected personal quiz history page
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

## Testing Quizzes And Staff Progress

Quizzes use the same restaurant workspace rules as Training Pages. Every quiz, question, and attempt is saved with the current restaurant's `restaurantId`.

Before testing, make sure the sandbox and app are running:

```bash
npm run sandbox
```

In another terminal:

```bash
npm run dev
```

Owner/Admin creates a quiz:

1. Sign in as an Account Owner, Admin, or Manager.
2. Go to `/manager/quizzes`.
3. Create a quiz with a title, optional category, optional Training Page, passing score, and published/draft status.
4. Select the quiz.
5. Add questions manually.
6. Put each answer choice on its own line.
7. Make sure the correct answer exactly matches one answer choice.
8. Publish the quiz if it is not already published.

Create a question from Testable Staff Knowledge:

1. Go to `/manager/content`.
2. Create or edit a Training Page.
3. Add at least one Testable Staff Knowledge item.
4. Publish the Training Page.
5. Go to `/manager/quizzes`.
6. Create a quiz and choose that Training Page.
7. Use the `Use:` helper button to start a question from that knowledge item.
8. Add similar wrong answers before saving the question.

Staff takes a quiz:

1. Invite a Staff user from `/manager/invite-team`.
2. Copy the invite link.
3. Log out.
4. Open the invite link and create/sign into the staff account.
5. Go to `/quizzes`.
6. Take a published quiz.
7. Submit answers.
8. Confirm the staff user sees a score and either `Ready for Service` or `Needs Review`.

Manager views staff results:

1. Sign back in as the Account Owner, Admin, or Manager.
2. Go to `/manager/staff-progress`.
3. Confirm the staff user's quiz result appears with name/email, quiz title, score, status, and completion date.

Staff views personal progress:

1. Sign in as the Staff user.
2. Go to `/my-progress`.
3. Confirm only that staff user's own quiz attempts appear.

Restaurant A vs Restaurant B quiz safety:

1. Create Restaurant A.
2. Create and publish a quiz.
3. Accept a staff invite for Restaurant A and submit the quiz.
4. Create Restaurant B with a separate account.
5. Visit `/quizzes` and `/manager/staff-progress` in Restaurant B.
6. Confirm Restaurant B cannot see Restaurant A quizzes or quiz results.

## Why restaurantId Matters

This is the most important tenant-separation rule:

Every restaurant-owned record has a `restaurantId`.

That includes the user's role connection, Training Categories, Training Pages, quizzes, quiz questions, and quiz attempts.

The frontend now loads the current user's active role connection first, then uses that restaurant's `restaurantId` for Training Category and Training Page queries.

## Production Hardening Still Needed

The current app enforces tenant isolation and role access in the frontend by:

- requiring an active role connection to a restaurant workspace
- checking the user's role before protected routes load
- filtering Training Categories and Training Pages by the current restaurant's `restaurantId`
- filtering Quizzes, Quiz Questions, and Quiz Attempts by the current restaurant's `restaurantId`
- showing only published pages in the staff Training Library
- showing only published quizzes on the staff quiz page

Before production customers, backend authorization should be hardened further so database access is not only protected by frontend filters. The current Amplify Data rules still allow authenticated users broadly; a production version should add stronger owner/group/custom authorization for tenant records.

## Next Product Step

After quiz and progress tracking are stable, the next build should be one of these:

- automatic invite emails
- file/image uploads for Training Pages
- better quiz editing and question management
- manager reports by team member and training category
- Stripe billing and trial conversion
