# Wine Directory

A beginner-friendly personal project for organizing Italian wine tech sheets.

## What this first version does

- Shows a browseable list of wines
- Separates current BTG wines from previous BTG wines
- Filters by region, subregion, and grape
- Searches across producer, wine name, grape, region, pricing, and notes
- Includes a randomized quiz mode built from the wine data
- Uses a simple data structure that can later move into a database

## Files

- `index.html` is the page structure.
- `styles.css` controls how the site looks.
- `script.js` makes the filters, cards, and quiz work.
- `wine-data.js` stores the wine list used by the directory and quiz.
- `images/` is where bottle photos can go.
- `wine-sheet-template.csv` can be imported into Google Sheets as a starter BTG list.
- `scripts/update-wine-data.mjs` can rebuild `wine-data.js` from a Google Sheet CSV.
- `.github/workflows/update-wine-data.yml` runs the update on a schedule in GitHub Actions.

## How to open it

Open `index.html` in a browser.

## How to add a wine

In `wine-data.js`, copy one wine object inside the `window.wineDirectoryData` list and edit the values:

```js
{
  name: "Predappio Sangiovese",
  producer: "Chiara Condello",
  vintage: "2023",
  status: "current",
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

The quiz uses the wine entries in `wine-data.js` as the source of truth.

Each round creates 10 randomized questions from the current wine list. When a new wine is added with region, grape, producer, style, farming, and price information, it automatically becomes part of future quiz rounds.

## Google Sheet automation

The project can be connected to a Google Sheet so the wine list can be updated without editing code.

Use these column names in the first row of the sheet:

```text
status
name
producer
vintage
region
subregion
grapes
style
body
image
farming
price
oneLiner
details
pairing
```

Use `current` for wines currently on BTG and `previous` for older BTG wines.

The `grapes` column can use commas or semicolons for more than one grape:

```text
Nerello Mascalese, Nerello Cappuccio
```

To connect the sheet:

1. In Google Sheets, create a new blank sheet.
2. Import `wine-sheet-template.csv` to start with the current wine list.
3. Use the `status` column to enter `current` or `previous`.
4. Use `File` > `Share` > `Publish to web`.
5. Publish the sheet as `Comma-separated values (.csv)`.
6. Copy the published CSV link.
7. In GitHub, open the repository settings.
8. Go to `Secrets and variables` > `Actions`.
9. Add a repository secret named `WINE_CSV_URL`.
10. Paste the published CSV link as the secret value.

The workflow runs every day and can also be run manually from the `Actions` tab.
