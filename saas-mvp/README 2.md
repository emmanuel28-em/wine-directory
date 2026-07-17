# Restaurant Training SaaS MVP

This folder is the new real SaaS MVP. It is separate from the old static Rezdora training site.

Checkpoint 1 only includes:

- React + Vite app structure
- Basic routing
- Public landing page
- Start Free Trial page
- Login page
- Manager dashboard placeholder
- Staff library placeholder
- Shared layout/navigation
- Basic styling inspired by the static app

It does **not** include login, database, file storage, payments, or seeded Rezdora content yet.

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

## Current Pages

- `/` public landing page
- `/trial` start free trial page
- `/login` login placeholder
- `/manager` manager dashboard placeholder
- `/staff` staff library placeholder

## Important Beginner Note

The free trial form saves temporary information in the browser with `localStorage`.

That is only for Checkpoint 1 so the flow feels real while we build the screens.

In a later checkpoint:

- Amplify Auth will handle real login.
- Amplify Data will save restaurants, users, content, quizzes, and results.
- Amplify Storage will save images, PDFs, menus, and logos.

## Next Checkpoint

Checkpoint 2 should add AWS Amplify Gen 2 project files and prepare Auth.

Do not add the database or Storage until the Auth flow is understandable and working.
