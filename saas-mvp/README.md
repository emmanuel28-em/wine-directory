# Restaurant Training SaaS MVP

This folder is the new real SaaS MVP. It is separate from the old static Rezdora training site.

## Current Checkpoint

Checkpoint 1 created:

- React + Vite app structure
- Basic routing
- Public landing page
- Start Free Trial page
- Login page
- Manager dashboard placeholder
- Staff library placeholder
- Shared layout/navigation
- Basic styling inspired by the static app

Checkpoint 2 adds:

- Amplify Gen 2 backend files
- Amplify Auth / Amazon Cognito setup
- Email and password signup/login UI
- Logout button
- Protected manager and staff routes

Checkpoint 3 adds:

- Amplify Data schema
- First SaaS database models
- A temporary protected `/data-test` page
- Create/list testing for `Restaurant` records

Checkpoint 4 adds:

- Real `/trial` signup flow
- Cognito user creation
- Restaurant record creation
- UserProfile record creation
- owner Membership record creation
- Manager dashboard workspace summary

Checkpoint 5 adds:

- Manager content management at `/manager/content`
- Create, edit, publish, archive, and delete `TrainingDoc` records
- Staff library that loads published training docs from the database
- Restaurant-specific content filtering by `restaurantId`

Checkpoint 5B adds:

- Flexible Training Categories
- Training Pages that can belong to a Training Category
- Paste-from-Google-Docs style body field
- Tags, ingredients, service notes, and richer content fields
- Testable Staff Knowledge stored for future quizzes
- Staff library grouped by Training Category, then type/category

It does **not** include file storage, payments, roles enforcement, staff invites, generated quizzes, AI parsing, or seeded Rezdora content yet.

Managed setup offer adds:

- Public `/managed-setup` inquiry page
- Landing page language for Self-Service vs Done-For-You Setup
- Manager dashboard card for importing existing docs
- Local success message for submitted inquiries

Managed setup inquiries are not saved to the database yet.

Existing content import adds:

- A reusable import utility for moving existing restaurant training material into a real restaurant workspace
- A manager button called `Import Existing Training Content`
- Import into the currently logged-in manager's active `restaurantId`
- Duplicate protection using same restaurant, same title, and same content type
- Rezdora's original static-site content imported as real Training Categories and Training Pages

The bundled original-content import is only offered to the Rezdora workspace so another restaurant cannot accidentally import Rezdora's library.

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

## Auth Setup For Checkpoint 2

The code uses Amplify Auth and Amplify Data, so real signup/login and database testing need a cloud sandbox.

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

You should see the real Amplify sign up / sign in form.

## Data Setup For Checkpoint 3

After `npm run sandbox` finishes updating the backend, visit:

```text
http://127.0.0.1:5173/data-test
```

You must be logged in to access this page.

On `/data-test`, you can:

- create one `Restaurant` record
- list existing `Restaurant` records
- refresh the list

This is a temporary page. It exists only to prove that Amplify Data can create and read records before we build the real manager UI.

## Trial Signup Flow For Checkpoint 4

With `npm run sandbox` running in one terminal and `npm run dev` running in another, visit:

```text
http://127.0.0.1:5173/trial
```

Enter:

- restaurant name
- manager name
- email
- password

Use a new email address for a clean test. If your email supports plus-addressing, you can use something like:

```text
yourname+trial1@example.com
```

After submitting:

1. Cognito creates the login user.
2. If AWS asks for email confirmation, enter the code from your email.
3. The app signs you in.
4. The app creates a `Restaurant`.
5. The app creates a `UserProfile`.
6. The app creates a `Membership` with role `owner` and status `active`.
7. You are redirected to `/manager`.

The manager dashboard should show:

- restaurant name
- trial status
- trial end date
- manager name/email
- next setup steps

## Manager Content Flow For Checkpoint 5

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

## Clear Manager UX For Checkpoint 5B

Because Checkpoint 5B changes the Amplify Data schema, run or restart:

```bash
npm run sandbox
```

Wait for the sandbox to finish updating before testing collections.

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
- `/login` Amplify signup/login page
- `/manager` protected manager dashboard
- `/manager/content` protected manager content page
- `/staff` protected staff library
- `/data-test` protected database test page

## Testing Protected Routes

Logged out:

- Visit `/manager`
- You should be redirected to `/login`
- Visit `/staff`
- You should be redirected to `/login`
- Visit `/data-test`
- You should be redirected to `/login`

Logged in:

- Sign up or sign in at `/login`
- Visit `/manager`
- Visit `/staff`
- Visit `/data-test`
- Both should load
- Use the `Log out` button in the header
- Try `/manager` again and it should redirect back to `/login`

## Why restaurantId Matters

This is the most important SaaS rule:

Every restaurant-owned record has a `restaurantId`.

That includes:

- Membership
- TrainingDoc
- Quiz
- QuizQuestion
- QuizAttempt

Later, the app will only load records where `restaurantId` matches the signed-in user's restaurant. That is how one restaurant avoids seeing another restaurant's content.

## Important Beginner Note

Checkpoint 4 creates the first restaurant workspace, but it still does not invite staff or manage training content.

Checkpoint 5 adds content management, but it still does not invite staff or create quizzes.

Checkpoint 5B adds flexible collections and paste-friendly docs, but it still does not parse docs with AI or upload files.

In a later checkpoint:

- Amplify Storage will save images, PDFs, menus, and logos.

## Next Checkpoint

Checkpoint 6 should add the first quiz workflow:

- create quiz questions for a training doc
- let staff take a simple quiz
- save quiz attempts by user and restaurant

Do not add Storage or payments until restaurant/user records are understandable and working.
