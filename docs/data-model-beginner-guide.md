# Beginner Guide: The Data Model

The data model is the plan for how the app stores information.

Think of it like designing a filing cabinet before putting papers inside it.

For this restaurant training platform, the core structure is:

```text
Restaurant
  Section
    Folder
      Doc
        Quiz
          Progress
```

## 1. Restaurant

A restaurant is one customer using the platform.

Examples:

- Rezdora
- Another restaurant
- A restaurant group with multiple locations

Plain English:

```text
Which business owns this training content?
```

Example:

```js
{
  restaurantId: "rezdora",
  restaurantName: "Rezdora",
  plan: "starter"
}
```

## 2. User

A user is a person who logs in.

Examples:

- Owner
- Admin
- Manager
- Server
- Bartender
- Host

Plain English:

```text
Who is this person, and which restaurant do they belong to?
```

Example:

```js
{
  userId: "user_123",
  restaurantId: "rezdora",
  name: "Emmanuel",
  role: "admin"
}
```

The `restaurantId` keeps users inside the correct restaurant.

## 3. Section

A section is the top-level area of the training library.

Examples:

- Food
- Beverage
- Service
- HR
- Manager SOPs
- Private Dining

Plain English:

```text
What big area does this belong to?
```

Example:

```js
{
  sectionId: "section_food",
  restaurantId: "rezdora",
  name: "Food"
}
```

## 4. Folder

A folder organizes docs inside a section.

Folders can also sit inside other folders.

Examples:

- Dinner Menu
- Antipasta
- BTG Wines
- Opening SOPs
- Five Course Pairing

Plain English:

```text
Where should this doc live inside the section?
```

Example:

```js
{
  folderId: "folder_dinner_antipasta",
  restaurantId: "rezdora",
  sectionId: "section_food",
  parentFolderId: "folder_dinner_menu",
  name: "Antipasta"
}
```

If a folder does not sit inside another folder, `parentFolderId` can be blank.

## 5. Doc

A doc is the actual item employees open and study.

Examples:

- Burrata Reale
- Flavio Roddolo Dolcetto
- Strawberry Fields
- Opening Checklist
- Allergy Guide
- Steps of Service

Plain English:

```text
What page/file/card does the employee actually read?
```

Example:

```js
{
  docId: "doc_burrata_reale",
  restaurantId: "rezdora",
  folderId: "folder_dinner_antipasta",
  docFormat: "food",
  name: "Burrata Reale",
  accessRoles: ["owner", "admin", "manager", "staff"],
  content: {
    oneLiner: "Our burrata reale with maitake and truffle puree.",
    allergies: ["Dairy", "Mushroom", "Vinegar", "Allium", "Seeds"],
    ingredients: ["Burrata", "Truffle and maitake puree", "Roasted maitake"]
  }
}
```

## 6. Quiz

A quiz belongs to a doc or a folder.

Examples:

- Quiz on Burrata Reale
- Quiz on Current BTG Wines
- Quiz on Opening SOPs

Plain English:

```text
What should staff be tested on?
```

Example:

```js
{
  quizId: "quiz_btg_wines_basic",
  restaurantId: "rezdora",
  folderId: "folder_btg_wines",
  level: "basic",
  questionCount: 5
}
```

## 7. Progress

Progress tracks what each employee has completed.

Plain English:

```text
Who studied what, and how well did they do?
```

Example:

```js
{
  progressId: "progress_123",
  restaurantId: "rezdora",
  userId: "user_456",
  quizId: "quiz_btg_wines_basic",
  score: 80,
  passed: true,
  completedAt: "2026-07-01"
}
```

## The Most Important Rule

Every important thing has a `restaurantId`.

That includes:

- Users
- Sections
- Folders
- Docs
- Quizzes
- Progress

This keeps Restaurant A from seeing Restaurant B's information.

## Simple Mental Model

```text
Restaurant = the business
User = the person
Section = the big shelf
Folder = the binder
Doc = the page
Quiz = the test
Progress = the report card
```

## What We Build First

For now, we do not need AWS yet.

The next beginner-friendly step is to make a sample data file that uses this structure.

That sample file will teach the app how the future dynamic version should think.
