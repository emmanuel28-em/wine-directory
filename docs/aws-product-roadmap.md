# Rezdora Directory to Restaurant Training Platform

This roadmap keeps the project moving in small, manageable steps. The current website is the prototype. The AWS version is the future business product.

## Goal

Build a training platform that restaurants can use for wine, cocktails, food, service standards, quizzes, and staff progress tracking.

## Product Direction

The future product should not be locked to one restaurant. Rezdora can be the first real example, but the software should eventually support many restaurants.

Core idea:

- One app
- Many restaurants
- Each restaurant has its own staff, content, quizzes, and progress

## Phase 1: Clean Prototype

Purpose: make the current website easier to demo and easier to keep improving.

Tasks:

- Keep Food and Beverage as the main tabs.
- Keep search working across cards.
- Keep quizzes separated by topic.
- Add food, cocktail, wine, and future beverage content in a consistent format.
- Keep uploading updates manually until the site is stable enough for a real admin system.

Status: In progress

## Phase 2: Tenant-Ready Data

Purpose: prepare the project for multiple restaurants before moving to AWS.

Tasks:

- Add a restaurant identifier to every item.
- Add clear item categories: wine, cocktail, food, spirit, grappa, amaro.
- Add clear sections: current BTG, wine pairing, bottle list, brunch, lunch, dinner.
- Make quiz progress ready to connect to real users later.

Example:

```js
{
  restaurantId: "rezdora",
  type: "wine",
  section: "btg",
  status: "current"
}
```

Status: Not started

## Phase 3: Sign-In

Purpose: let each staff member have their own progress.

AWS service:

- Amazon Cognito

User roles:

- Owner
- Admin
- Manager
- Staff

Staff should be able to:

- Study content
- Take quizzes
- Earn badges
- See their own progress

Managers should be able to:

- See team progress
- See who is up to date
- See weak areas by topic

Status: Not started

## Phase 4: Database

Purpose: stop editing the website code every time content changes.

AWS service:

- DynamoDB

Data to store:

- Restaurants
- Users
- Wines
- Cocktails
- Food dishes
- Quiz attempts
- Badges
- Admin notes

Status: Not started

## Phase 5: Image Uploads

Purpose: make bottle, cocktail, and food photos easier to manage.

AWS service:

- S3

Admins should be able to:

- Upload an image
- Attach it to a card
- Replace it later without breaking the site

Status: Not started

## Phase 6: Admin Dashboard

Purpose: let a manager update the site without touching code.

Admin features:

- Add a wine
- Add a cocktail
- Add a dish
- Mark items current or previous
- Upload images
- Edit quiz fields
- Publish updates

Status: Not started

## Phase 7: Subscription Business

Purpose: turn the software into something restaurants can pay for.

Possible pricing:

- Starter: one restaurant, simple training library
- Pro: quizzes, badges, manager dashboard
- Premium: multiple locations, setup help, custom training

Payment service:

- Stripe

Status: Not started

## Next Tiny Step

Before building AWS, make the current data model more future-proof.

First technical task:

- Add `restaurantId: "rezdora"` to each content item.

This is small, but it starts teaching the app the most important business idea: every piece of content belongs to a specific restaurant.
