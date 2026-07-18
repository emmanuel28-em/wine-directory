# Line Up

Line Up is a restaurant training platform. It is separate from the old static Rezdora training site.

## Current Product Status

The app currently includes:

- public Line Up landing page
- public managed-setup inquiry saving
- free-trial restaurant workspace signup
- guided restaurant onboarding
- reusable starter Training Categories
- bulk paste, review, and draft import for existing menu notes and tech sheets
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
- authenticated Managed Setup request saving and source file upload
- team invites by email with copyable invite link fallback
- Workspace Settings
- Team Management
- restaurant logo upload
- quiz builder
- automated draft quiz questions from manager-entered training pages
- manager-created certifications
- manager-created staff groups and training assignments
- staff quiz taking
- staff and manager quiz progress
- Training Page source file attachments
- 30-day trial status
- Owner/Admin billing page
- Stripe Checkout foundation
- Stripe webhook function for subscription status updates
- Stripe Customer Portal foundation

It does **not** include public unauthenticated file uploads or AI document extraction yet. Restaurant data now uses backend tenant authorization; Storage still needs a stricter server-side file layer before opening the product beyond a controlled pilot.

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

## AWS Amplify Hosting Deployment

This app is inside a subfolder. When connecting the GitHub repo to AWS Amplify Hosting, configure Amplify to build from:

```text
saas-mvp
```

Deployment steps:

1. Push the project to GitHub.
2. In AWS Amplify Hosting, connect the GitHub repository.
3. Set the app root/base directory to:

```text
saas-mvp
```

4. Set the build command:

```bash
npm run build
```

5. Set the output directory:

```text
dist
```

6. Configure the required environment variables and secrets.
7. Deploy.
8. Copy the deployed Amplify URL.
9. Update these values to the deployed URL:

```text
VITE_APP_BASE_URL=https://your-deployed-amplify-url
LINE_UP_APP_BASE_URL=https://your-deployed-amplify-url
```

10. Redeploy after changing environment variables.

Production environment checklist:

```text
VITE_APP_BASE_URL
LINE_UP_APP_BASE_URL
LINE_UP_FROM_EMAIL
STRIPE_SECRET_KEY
STRIPE_PRICE_ID_STARTER
STRIPE_PRICE_ID_GROWTH
STRIPE_PRICE_ID_PRO
STRIPE_WEBHOOK_SECRET
```

More detailed deployment steps are in:

```text
docs/deployment-checklist.md
docs/production-smoke-test.md
docs/client-launch-readiness.md
```

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
7. You are redirected to `/manager/onboarding`.

The Workspace Dashboard should show:

- restaurant name
- trial status
- trial end date
- account owner role
- next setup steps

## Guided Restaurant Onboarding

New Account Owners land at:

```text
/manager/onboarding
```

The setup page gives a new restaurant four concrete steps:

1. Choose starter Training Categories.
2. Import or create real training material.
3. Invite one manager or staff member.
4. Publish one quiz and test the staff experience.

The progress display is based on saved restaurant data, so it remains accurate after the manager leaves and returns.

## Bulk Import Existing Menu Notes And Tech Sheets

Managers can visit:

```text
/manager/import
```

The importer recognizes common restaurant headings including `Menu Description`, `One Liner`, `Allergies`, `Ingredients`, `Details`, `Producer`, `Varietal`, `Region`, `Vintage`, `Glassware`, and `Garnish`.

Safe import workflow:

1. Paste one or many items from an existing document.
2. Click `Review Import`.
3. Edit the detected titles, content type, category, notes, ingredients, and allergens.
4. Import selected items.
5. Review the new Training Pages in Content Management.
6. Publish only after a manager approves the information.

Every imported item is saved as a draft. A retry skips pages with the same normalized title and Training Category, which reduces accidental duplicates after a partial import.

PDF and Word files can be attached securely after signup, but automatic text extraction from those files is a future document-intelligence phase. For the first client, managers can paste text directly or request Done-For-You Setup.

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

Testable Staff Knowledge powers automatic quiz drafts. Example:

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

Managers can use those facts on `/manager/quizzes` to generate editable draft questions.

## Automated Quizzes And Certifications

Managers can visit:

```text
/manager/quizzes
```

Quiz workflow:

1. Create or select a quiz.
2. Choose a Training Category or Training Page if the quiz should focus on one topic.
3. Click `Generate Questions from Tech Sheets`.
4. Review the draft questions.
5. Edit prompts, answer choices, correct answers, and explanations.
6. Save the draft questions to the quiz.
7. Publish the quiz when staff should see it.

The generator uses published Training Pages from that restaurant only. It looks for Testable Staff Knowledge first, then useful structured fields such as allergens, ingredients, talking points, service notes, wine region, grape, producer, vintage, cocktail details, and food category.

Managers can create certifications at:

```text
/manager/certifications
```

Certification workflow:

1. Publish at least one quiz.
2. Create a certification name such as `BTG Wine Certified`, `Cocktail Ready`, or `Dinner Menu Certified`.
3. Choose which published quizzes are required.
4. Publish the certification.
5. Staff can see certification progress at `/certifications`.
6. Managers can see which staff members are certified or still in progress.

Certifications are calculated from passed quiz attempts. A staff member earns a certification after passing every quiz attached to that certification.

Managers can assign training at:

```text
/manager/assignments
```

Assignment workflow:

1. Create staff groups using the restaurant's own language, such as `Server`, `Captain`, `Bar Team`, or `New Hire`.
2. Add staff members to those groups.
3. Assign a published quiz or published certification to either a group or an individual staff member.
4. Staff see assigned quizzes and certifications first on their quiz and certification pages.
5. Unassigned published quizzes and certifications remain available for extra study.

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
- `/manager/onboarding` protected guided workspace setup
- `/manager/import` protected bulk training-material importer
- `/manager/billing` protected Billing page for Account Owners and Admins
- `/manager/content` protected content management page for Account Owners, Admins, and Managers
- `/manager/quizzes` protected quiz builder for Account Owners, Admins, and Managers
- `/manager/certifications` protected certification builder for Account Owners, Admins, and Managers
- `/manager/staff-progress` protected quiz results page for Account Owners, Admins, and Managers
- `/manager/settings` protected Workspace Settings and Team Management page
- `/manager/invite-team` protected invite team page
- `/training-library` protected staff-facing Training Library for all active members
- `/staff` same staff-facing Training Library
- `/quizzes` protected staff quiz page
- `/certifications` protected staff certification progress page
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
3. Enter first name, last name, email, choose `Staff`, and send the invite.
4. If email is configured, confirm the page says `Invite sent to [email]`.
5. If email is not configured locally, copy the generated invite link from the fallback panel.
6. Log out.
7. Open the invite link from the email or copied fallback link.
8. Create an account or sign in using the same email address that was invited.
9. Accept the invite.
10. Confirm the staff user lands in `/training-library`.
11. Confirm the staff user cannot access `/manager` or `/manager/content`.

Owner invites Admin/Manager:

1. Sign in as an Account Owner.
2. Go to `/manager/invite-team`.
3. Choose `Admin` or `Manager`.
4. Send the invite email, or copy the invite link if email is not configured.
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

Email invite setup:

- Invite acceptance still uses the secure token link at `/accept-invite?token=...`.
- Line Up sends invite emails from an Amplify Function using Amazon SES.
- The frontend never stores or uses SES credentials.
- For local development, email may be unconfigured. In that case the invite is still created and the page shows the copy-link fallback.

Required environment variables for deployed email:

```text
LINE_UP_FROM_EMAIL=verified-sender@example.com
LINE_UP_APP_BASE_URL=https://your-line-up-domain.com
VITE_APP_BASE_URL=https://your-line-up-domain.com
```

Amazon SES setup needed in AWS:

1. Verify the sender email address or domain in Amazon SES.
2. If your AWS account is still in the SES sandbox, verify recipient emails too or request production access.
3. Set `LINE_UP_FROM_EMAIL` to the verified sender.
4. Set the app base URL so invite links point to the deployed site instead of localhost.
5. Redeploy the Amplify backend.

Testing resend/revoke:

1. Create a pending invite.
2. Confirm it appears in Recent Invites with email send status.
3. Click `Resend Invite Email`.
4. If email is configured, the status should become `Sent`.
5. If email is not configured, the invite remains usable and you can copy the link manually.
6. Revoke the invite.
7. Confirm revoked, accepted, or expired invites cannot be resent from the pending invite controls.

## Testing Workspace Settings And Team Management

Settings uses existing Restaurant, UserProfile, Membership, Invite, and Storage records.

If you have not restarted the sandbox since adding Restaurant profile/logo fields, restart it:

```bash
npm run sandbox
```

Then run the app:

```bash
npm run dev
```

Account Owner settings:

1. Log in as an Account Owner.
2. Go to `/manager/settings`.
3. Confirm the page title says `Workspace Settings`.
4. Update restaurant name, address/city, website, and primary contact.
5. Save the restaurant profile.
6. Upload a logo image.
7. Confirm the logo preview appears.

Team Management:

1. Go to `/manager/invite-team`.
2. Invite a Staff user.
3. Go back to `/manager/settings`.
4. Confirm the invite appears under Pending Invites.
5. Copy the invite link if needed.
6. Revoke the invite.
7. Invite Staff again and accept the invite as that user.
8. Log back in as Account Owner.
9. Confirm Staff appears in Team Management.
10. Disable the Staff member.
11. Log in as that Staff member.
12. Confirm the staff user sees: `Your access to this workspace has been disabled.`

Role behavior:

- Account Owner can change non-owner member roles and disable non-owner members.
- Admin can view all team members, invite Staff, and disable Staff.
- Manager can view team members and invite Staff, but cannot change roles or disable members.
- Staff cannot access `/manager/settings`.

Pending Invites:

1. Create a pending invite.
2. Confirm it appears with email, role, status, email send status, and expiration.
3. Resend the invite email if email is configured.
4. Copy the manual invite link if email is not configured.
5. Revoke it.
6. Confirm it no longer appears in the pending list.

Restaurant A vs Restaurant B settings safety:

1. Create Restaurant A.
2. Add members, invites, and a logo.
3. Create Restaurant B with a different account.
4. Go to `/manager/settings`.
5. Confirm Restaurant B cannot see Restaurant A members, invites, logo, or settings.

## Testing Billing And Trial Status

Billing uses Stripe Checkout. Line Up never collects card details directly.

Before testing, restart the Amplify sandbox after the billing schema/function changes:

```bash
npm run sandbox
```

Then run the app:

```bash
npm run dev
```

Account Owner billing test:

1. Log in as an Account Owner.
2. Go to `/manager`.
3. Confirm the dashboard shows trial or subscription status.
4. Go to `/manager/billing`.
5. Confirm restaurant name, plan, subscription status, trial end date, and billing email appear.
6. Change the billing email and save it.
7. Click `Set Up Billing`.
8. If Stripe is configured, you should be redirected to Stripe Checkout.
9. If Stripe is not configured, you should see a clear setup error and remain in Line Up.
10. Complete Checkout with a Stripe test card.
11. Confirm the webhook updates the Restaurant subscription status if webhook forwarding is configured.
12. Return to `/manager/billing`.
13. Click `Manage Billing`.
14. Confirm you are redirected to Stripe Customer Portal, or see a clear setup error if the portal is not configured.

Role test:

1. Use the local development role switcher to change your role to `Staff`.
2. Visit `/manager/billing`.
3. Confirm Staff cannot access the billing page.
4. Change your role back to Account Owner or Admin.

Required Stripe environment variables:

```text
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID_STARTER=price_...
STRIPE_PRICE_ID_GROWTH=price_...
STRIPE_PRICE_ID_PRO=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
LINE_UP_APP_BASE_URL=http://localhost:5173
VITE_APP_BASE_URL=http://localhost:5173
```

How to create the Stripe Price IDs:

1. In Stripe, create a Product for Line Up.
2. Add three recurring monthly Prices:
   - Starter: $99/month, up to 20 users.
   - Growth: $199/month, up to 50 users.
   - Pro: $349/month, up to 100 users.
3. Copy each Price ID, which starts with `price_`.
4. Use those values for `STRIPE_PRICE_ID_STARTER`, `STRIPE_PRICE_ID_GROWTH`, and `STRIPE_PRICE_ID_PRO`.

How to configure Stripe Checkout:

1. Set `STRIPE_SECRET_KEY`.
2. Set `STRIPE_PRICE_ID_STARTER`, `STRIPE_PRICE_ID_GROWTH`, and `STRIPE_PRICE_ID_PRO`.
3. Set `LINE_UP_APP_BASE_URL` to the app URL users should return to after Checkout.
4. Restart/redeploy the Amplify backend.

How to configure Stripe Customer Portal:

1. In Stripe, open Billing settings.
2. Configure Customer Portal features such as payment method updates, invoices, and cancellation rules.
3. Save the portal configuration.
4. Use `/manager/billing` and click `Manage Billing` after a Stripe customer exists.

How to configure Stripe webhooks:

1. Deploy the backend or run a sandbox that exposes the `stripeWebhookUrl` output.
2. In Stripe, create a webhook endpoint using that URL.
3. Subscribe to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`
4. Copy the webhook signing secret, which starts with `whsec_`.
5. Set `STRIPE_WEBHOOK_SECRET`.
6. Restart/redeploy the Amplify backend.

Local webhook testing:

- Stripe webhooks need a public URL.
- For local testing, use Stripe CLI forwarding to send events to the deployed/sandbox webhook URL if available.
- If you only run `npm run dev`, Checkout can redirect locally, but Stripe cannot call your local browser app directly.

Billing enforcement:

- Owner/Admin can always access `/manager/billing`.
- Settings and Dashboard remain reachable when billing needs attention.
- Staff sees a clear subscription message if the workspace is paused.
- Creating training pages, quizzes, uploads, and new invites is blocked when the trial is expired and there is no active subscription.
- Existing data is not deleted or hidden.

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
3. Create a quiz with a title, optional Training Category, optional Training Page, number of questions, passing score, and draft/published status.
4. Select the quiz if it is not already selected.
5. Click `Generate Questions from Training Material`.
6. Review the generated draft questions.
7. Edit a generated question prompt, answer choice, correct answer, or explanation.
8. Delete any generated question you do not want.
9. Add a manual draft question if needed.
10. Save the draft questions to the quiz.
11. Publish the quiz if it is not already published.

Generate from Testable Staff Knowledge:

1. Go to `/manager/content`.
2. Create or edit a Training Page.
3. Add at least one Testable Staff Knowledge item.
4. Publish the Training Page.
5. Go to `/manager/quizzes`.
6. Create a quiz and choose that Training Page or the Training Category it belongs to.
7. Click `Generate Questions from Training Material`.
8. Confirm Line Up creates draft questions from the Testable Staff Knowledge.
9. Edit at least one draft question.
10. Save the draft questions.

What the generator uses:

- Testable Staff Knowledge
- allergens
- ingredients
- talking points
- service notes
- wine producer, region, grape/varietal, and vintage when available
- training page type and category

The generator does not use an AI API yet. It is rule-based and uses other real answers from the same restaurant as wrong answer choices when possible.

Manual questions still work:

1. Select a quiz.
2. Use the `Add Question` form.
3. Put each answer choice on its own line.
4. Make sure the correct answer exactly matches one answer choice.
5. Save the question.

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

## Testing File Uploads And Attached Resources

This checkpoint adds Amplify Storage/S3 plus two data models:

- `FileAsset`
- `ManagedSetupRequest`

After pulling these changes, restart the Amplify sandbox so AWS can create the Storage bucket and new model tables:

```bash
npm run sandbox
```

Then start the app in another terminal:

```bash
npm run dev
```

Manager Training Page attachments:

1. Log in as Account Owner, Admin, or Manager.
2. Go to `/manager/content`.
3. Create a Training Page if needed.
4. Click `Edit` on that Training Page.
5. Use `Attach Source File`.
6. Upload a PDF, image, menu, Word doc, text file, CSV, or spreadsheet.
7. Confirm the file appears under that Training Page.
8. Click `View` to open a temporary signed file URL.
9. Click `Remove` to delete a test attachment.

Staff attached resources:

1. Publish the Training Page with an attachment.
2. Log in as Staff.
3. Go to `/training-library`.
4. Confirm the published Training Page shows `Attached Resources`.
5. Click the attached resource and confirm it opens.
6. Confirm Staff cannot upload or remove files.

Restaurant A vs Restaurant B file safety:

1. Attach a file to a Restaurant A Training Page.
2. Create or log into Restaurant B.
3. Go to `/training-library` and `/manager/content`.
4. Confirm Restaurant B does not show Restaurant A attached files.

Managed Setup request:

1. Log in as an owner/admin/manager with a restaurant workspace.
2. Go to `/managed-setup`.
3. Fill out the managed setup form.
4. Attach one or more source files.
5. Submit.
6. Confirm the success message says the request was received.

Public Managed Setup visitor:

- Public visitors can fill out the form, but file upload is disabled until they create/sign into a restaurant workspace.
- This is intentional for now so the app does not accept unauthenticated public uploads into S3.

How uploads are stored:

- Storage keys are scoped by path, such as `restaurants/{restaurantId}/training-docs/{trainingDocId}/...`.
- `FileAsset` records store the file metadata and connect files to a restaurant and optional Training Page.
- Staff only sees attached files when the Training Page is published.

## Why restaurantId Matters

This is the most important tenant-separation rule:

Every restaurant-owned record has a `restaurantId`.

That includes the user's role connection, Training Categories, Training Pages, quizzes, quiz questions, and quiz attempts.
It also includes File Assets and Managed Setup Requests.

The frontend now loads the current user's active role connection first, then uses that restaurant's `restaurantId` for Training Category and Training Page queries.

## Platform Ownership And Developer Access

Line Up now keeps company access separate from restaurant access:

- `Platform Owner` is a Line Up company role. It can open `/platform`, view restaurant account metadata, and grant or remove platform access.
- `Platform Developer` can open the internal platform area, but cannot list customer workspaces or read restaurant training content by default.
- `Account Owner`, `Admin`, `Manager`, and `Staff` remain roles inside one restaurant workspace.

The first Platform Owner is bootstrapped through AWS after deployment. It cannot be selected during public signup. Once the first owner signs out and back in, they can grant access to other users who already have a Line Up login.

Testing platform access:

1. Deploy the backend so Cognito creates `lineup-platform-owners` and `lineup-platform-developers`.
2. Follow `docs/platform-ownership.md` to add the first Platform Owner.
3. Sign out and back in.
4. Open `/platform`.
5. Confirm the owner can see workspace metadata but not customer training pages.
6. Have a developer create their own Line Up login.
7. Grant that email `Platform Developer` access.
8. Have the developer sign out and back in.
9. Confirm the developer can open `/platform` but cannot see the restaurant account list or manage access.
10. Invite the developer to a dedicated test restaurant when they need to test manager/staff workflows.

Infrastructure ownership is separate from this screen. AWS root, GitHub, Stripe, the domain, billing, MFA, recovery methods, and production secrets must be controlled and transferred at the provider/account level. See:

```text
docs/platform-ownership.md
```

## Pilot Support Workflow

Every active restaurant user can open `/report-issue` from the navigation and submit a problem or feature request. The backend verifies that the reporter has an active Membership in the selected restaurant before creating a `SupportTicket`.

Automatically captured context includes:

- restaurant, user, and restaurant role
- page where the problem was reported
- browser and viewport information
- submission time
- a unique `LU-...` reference number
- rule-based severity, triage summary, and suggested diagnostic checks

Platform Owners can open `/platform/support` to review tickets across restaurant workspaces, add internal resolution notes, and move a ticket to Investigating, Waiting, or Resolved. Platform Developers cannot open this inbox because reports can contain customer information.

Testing support intake:

1. Sign in as a restaurant Staff user.
2. Open `Report Issue` from the navigation.
3. Submit an access problem such as `Staff cannot see the dinner menu`.
4. Confirm a reference number appears and the ticket is listed under `Your Reports`.
5. Sign out and sign in as a Platform Owner.
6. Open `/platform/support`.
7. Confirm the ticket shows the correct restaurant, reporter, role, route, and suggested checks.
8. Add resolution notes and mark the ticket Investigating, then Resolved.
9. Sign back in as the reporter and confirm the status changed.
10. Confirm a Platform Developer cannot access `/platform/support`.

Optional real-time email alerts require these Amplify build environment variables and an Amazon SES-verified sender:

```text
LINE_UP_FROM_EMAIL
LINE_UP_SUPPORT_EMAIL
```

If email is not configured, ticket creation still succeeds and the ticket appears in Platform Support. The current automatic triage is intentionally rule-based; an AI model can replace or enhance it later without changing the support ticket workflow.

## Production Hardening Still Needed

Current security level:

- DynamoDB records carry restaurant-specific Cognito group fields, and Amplify Data enforces those fields at the API layer.
- Trial workspace creation and invite acceptance run in backend functions so the browser cannot choose another restaurant's membership.
- Manager/staff routes are role-protected in the app.
- Staff-facing reads are filtered to the current restaurant workspace.
- A live two-restaurant test confirmed Restaurant B could not list or open Rezdora records.

Security audit:

```text
docs/security-audit.md
```

What is hardened now:

- requiring an active role connection to a restaurant workspace
- checking the user's role before protected routes load
- filtering Training Categories and Training Pages by the current restaurant's `restaurantId`
- filtering Quizzes, Quiz Questions, and Quiz Attempts by the current restaurant's `restaurantId`
- showing only published pages in the staff Training Library
- showing only published quizzes on the staff quiz page
- showing attached resources only on published staff Training Pages
- verifying Training Category ownership before archive/update
- verifying Training Page ownership before update/archive/delete
- verifying Quiz ownership before publish/unpublish
- verifying Quiz Question ownership before edit/delete
- verifying a quiz and its questions belong to the staff user's restaurant before saving an attempt
- checking invite role permissions before creating invites
- sending invite emails from a backend function instead of the browser
- rechecking invite status, expiration, and invited email before acceptance
- assigning restaurant and manager Cognito groups from trusted backend functions
- enforcing restaurant-specific Data read/write rules in AppSync
- updating role and disabled status through a backend function that also updates Cognito groups
- verifying Checkout, Customer Portal, and invite-email permissions against active Membership records server-side

Remaining security limitations:

- Published-only staff content visibility is a product-level filter; tenant access is backend-enforced.
- Dynamic group authorization protects restaurant boundaries, while the trusted UI and backend functions enforce the intended owner/admin/manager workflow.
- Storage path access is still broadly authenticated at the S3 access-rule level, with app-layer tenant checks before upload/list/delete.
- Platform support impersonation is not implemented. Future customer support access should require restaurant approval, a reason, expiration, and an audit log.

What must be done before opening beyond a controlled first-client pilot:

- Add audit logs for role changes, invites, content publishing, and quiz attempts.
- Add stricter backend Storage authorization or a server-side file service before accepting sensitive documents from many unrelated restaurants.
- Remove or hard-disable development role switching outside local development.

Testing Restaurant A vs Restaurant B isolation:

1. Create Restaurant A owner.
2. Add training content and a quiz.
3. Invite Staff A to Restaurant A.
4. Confirm Staff A can view Restaurant A published content and take Restaurant A quizzes.
5. Confirm Staff A cannot access `/manager`, `/manager/content`, `/manager/quizzes`, `/manager/staff-progress`, or `/manager/invite-team`.
6. Create Restaurant B owner.
7. Confirm Restaurant B cannot see Restaurant A content, quizzes, invites, or results.
8. Confirm Staff A cannot see Restaurant B data.

Testing dev/test leakage:

1. Confirm there is no Data Test link in public navigation.
2. Confirm development role testing appears only when running locally with `npm run dev`.
3. Confirm deployed/production builds do not show the development role switcher.

## Next Product Step

After this production-hardening pass is stable, the next build should be one of these:

- stricter backend file authorization
- audit logging and operational error monitoring
- better quiz editing and question management
- manager reports by team member and training category
- audit logs for billing, invites, roles, content publishing, and quiz attempts

## Pilot Readiness

The first-use flow now connects restaurant setup to the work a manager actually needs to finish:

1. Start a trial and create the restaurant workspace.
2. Choose the first training area, such as Current Menu, Wine, Cocktails, or Service Standards.
3. Paste existing notes or load a `.txt`, `.md`, or `.csv` file.
4. Review the pages Line Up finds and choose Draft or Published for each page.
5. Continue directly to training review, automatic quiz generation, or team invitations.

PDF and Word extraction is not automatic yet. Managers can paste their text or use Request Setup Help for larger document migrations.

Staff can select **Mark as reviewed** on a published Training Page after studying it. The Staff Progress page shows these review confirmations separately from quiz attempts. This distinction is intentional: a review confirms that staff saw the material, while a passing quiz demonstrates knowledge.

To test the guided pilot flow:

1. Create a new restaurant trial and confirm it opens Getting Started.
2. Choose one training area and continue.
3. Paste two tech sheets separated by `---`, then select Find Training Pages.
4. Check the titles, types, sections, details, allergens, and visibility.
5. Publish one page and leave one as a draft, then save both.
6. Confirm only the published page appears in the Training Library.
7. Mark the published page as reviewed from the staff view.
8. Confirm the review appears in Staff Progress.
9. Generate and publish a quiz from the imported material.
10. Complete the quiz and confirm the attempt appears beside the review activity in Staff Progress.

Before inviting a restaurant team, follow the full checklist in:

```text
docs/pilot-launch-checklist.md
```

The recommended first pilot is intentionally small: create a few real Training Pages, invite one manager and one staff member, publish one quiz, and confirm the complete study-to-results flow before importing the restaurant's full library.
