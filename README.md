# Rezdora Training Site

A beginner-friendly static training site for Rezdora staff.

The site currently supports:

- Wine tech sheets
- Cocktail specs
- Food/menu study cards
- Search by any word
- Topic filters
- Quiz mode
- Local mastery progress in the browser

This is still a static site. There is no real login, database, payment system, or saved admin publishing yet.

## Current Pages

### Staff Site

`index.html`

This is the page staff should use. It loads the training content from `data.js`, renders cards, and runs quizzes.

### Admin Prototype

`admin.html`

This is a helper page for creating clean JSON. It does not save changes to the live site yet.

Use it to draft new wine, cocktail, food, SOP, or custom docs, then copy the generated JSON into `data.js` manually.

### Prototype Folder

`prototypes/`

This folder contains experimental future-product screens. These are not the main staff site.

## Important Files

- `index.html` is the staff-facing training page.
- `data.js` stores wines, cocktails, food items, and quiz source content.
- `script.js` powers search, filters, cards, quiz mode, and mastery progress.
- `styles.css` controls the staff site design.
- `admin.html` is the admin/content builder prototype.
- `admin.js` generates JSON from the admin form.
- `admin.css` styles the admin prototype.
- `images/` stores bottle, cocktail, and food images.
- `docs/` stores planning and business documents.
- `scripts/update-wine-data.mjs` is an older Google Sheet importer.

## How Content Works

The staff site loads this file:

```html
<script src="data.js"></script>
```

Inside `data.js`, content is stored in:

```js
window.wineDirectoryData = [
  // training items live here
];
```

The name `wineDirectoryData` is historical. The file now stores more than wine.

## How To Add A Wine Manually

Open `data.js`.

Copy an existing wine object, paste it inside the list, and edit the values.

Basic wine example:

```js
{
  name: "Wine Name",
  producer: "Producer Name",
  vintage: "2024",
  status: "current",
  menuSection: "btg",
  region: "Piemonte",
  subregion: "Alba",
  grapes: ["Nebbiolo"],
  style: "Red",
  body: "Medium",
  image: "images/example.jpg",
  farming: "Organic",
  price: "$20 glass / $80 bottle",
  oneLiner: "Short staff-facing summary.",
  details: "Longer study notes.",
  pairing: "Food pairing or service notes."
}
```

Use `menuSection: "pairing"` for wine pairing wines.

Use `menuSection: "bottle"` for bottle-list wines.

If it is a current BTG wine, `menuSection` can be left blank or set to `"btg"`.

## How To Add A Cocktail Manually

Open `data.js`.

Copy an existing cocktail object and edit it.

Basic cocktail example:

```js
{
  type: "cocktail",
  name: "Cocktail Name",
  status: "current",
  replaces: "Old cocktail name",
  category: "Signature",
  baseSpirit: "Gin",
  ingredients: ["Gin", "Vermouth", "Lemon"],
  method: "Shaken",
  glassware: "Coupe",
  garnish: "Lemon twist",
  allergies: ["Citrus", "Alcohol"],
  style: "Bright / citrus",
  image: "images/example.jpg",
  price: "$22",
  oneLiner: "Short guest-facing description.",
  details: "Build, inspiration, or service notes.",
  pairing: "Guest-facing talking points."
}
```

## How To Add A Food Item Manually

Open `data.js`.

Copy an existing food object and edit it.

Basic food example:

```js
{
  type: "food",
  name: "Dish Name",
  status: "current",
  category: "Antipasta",
  menu: "Dinner",
  course: "Antipasta",
  menuDescription: "Menu wording.",
  pronunciation: "pronunciation guide",
  mise: "Small Fork",
  winePairings: [],
  allergies: ["Dairy", "Gluten"],
  ingredients: ["Ingredient one", "Ingredient two"],
  oneLiner: "Short staff-facing summary.",
  details: "Longer dish details."
}
```

## How Quiz Mode Works

Quiz questions are generated from `data.js`.

Wine questions use fields like:

- Grapes
- Region
- Subregion
- Style
- One-liner

Cocktail questions use fields like:

- Base spirit
- Ingredients
- Allergies
- Glassware
- Garnish
- Talking points

Food questions use fields like:

- Allergies
- Mise
- Ingredients
- One-liner
- Details

Blank fields and `N/A` fields are skipped.

Mastery progress is saved in the browser with `localStorage`. This is only local to that browser. It is not real staff account tracking yet.

## How To Test Locally

Simple way:

1. Open `index.html` in your browser.
2. Use the search bar, tabs, and Quiz Mode.
3. Open `admin.html` if you want to generate new JSON.

Better local web-server way:

```bash
python3 -m http.server 8765
```

Then visit:

```text
http://127.0.0.1:8765/index.html
```

Admin prototype:

```text
http://127.0.0.1:8765/admin.html
```

## How To Deploy To GitHub Pages

If editing in the GitHub website:

1. Upload/replace the changed files.
2. Make sure `index.html`, `data.js`, `script.js`, and `styles.css` are updated together.
3. Commit the changes to `main`.
4. Wait for GitHub Pages to rebuild.
5. Visit the live site.
6. Hard refresh if old content is cached.

Live site:

```text
https://emmanuel28-em.github.io/wine-directory/
```

## Old Google Sheet Importer Warning

`scripts/update-wine-data.mjs` was built for an older wine-only workflow.

It can overwrite `data.js`.

Do not run it unless the Google Sheet contains all current content you want to keep, including food and cocktails.

## Phase 2 Ideas

Phase 2 should stay simple and still avoid full SaaS complexity.

Recommended next steps:

1. Let `admin.html` save draft docs to localStorage.
2. Add an export button so admin-created docs can be copied into `data.js`.
3. Split `script.js` into smaller beginner-friendly files later.
4. Create a safer content template for wine, cocktail, food, and SOP items.
5. Only after the static workflow is comfortable, plan the real database/admin version.
