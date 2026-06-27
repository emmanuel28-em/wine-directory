# Italian Wine Atlas

A beginner-friendly personal project for organizing Italian wine tech sheets.

## What this first version does

- Shows a browseable list of wines
- Filters by region, subregion, and grape
- Searches across producer, wine name, grape, region, pricing, and notes
- Includes a randomized quiz mode built from the wine data
- Uses a simple data structure that can later move into a database

## Files

- `index.html` is the page structure.
- `styles.css` controls how the site looks.
- `script.js` stores the sample wine data and makes the filters work.
- `images/` is where bottle photos can go.

## How to open it

Open `index.html` in a browser.

## How to add a wine

In `script.js`, copy one wine object inside the `wines` list and edit the values:

```js
{
  name: "Predappio Sangiovese",
  producer: "Chiara Condello",
  vintage: "2023",
  region: "Emilia-Romagna",
  subregion: "Predappio, Romagna",
  grapes: ["Sangiovese"],
  style: "Red",
  body: "Medium",
  image: "images/bottle-photo-name.jpg",
  farming: "Organic",
  price: "$20 glass / $70 bottle",
  oneLiner: "Short service-friendly summary.",
  details: "Longer 300-level study notes.",
  pairing: "Food pairing notes."
}
```

If you do not have a bottle photo yet, use an empty value:

```js
image: "",
```

## Manual entry workflow

1. Copy the tech sheet title into `name`, but remove the producer and vintage if they are already separate fields.
2. Copy `Producer` into `producer`.
3. Copy `Varietal` into the `grapes` list.
4. Copy `Region` and `Sub-Region` into `region` and `subregion`.
5. Copy `Farming Practices`, `Vintage`, and `Price`.
6. Save the bottle photo in the `images/` folder and put the filename in `image`.
7. Put the `One Liner` into `oneLiner`.
8. Put the `300-level` section into `details`.
9. Put restaurant pairing advice into `pairing`.

## Good next steps

1. Add fields for soil, elevation, aging, alcohol, and pairing notes.
2. Add harder quiz questions based on pairings and 300-level notes.
3. Add a grape profile page for grapes like Nebbiolo and Sangiovese.
4. Add a map view after the wine data is more complete.

## Quiz mode

The quiz uses the wine entries in `script.js` as the source of truth.

Each round creates 10 randomized questions from the current wine list. When a new wine is added with region, grape, producer, style, farming, and price information, it automatically becomes part of future quiz rounds.
