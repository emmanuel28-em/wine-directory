import fs from "node:fs";

const sourceUrl = process.env.WINE_CSV_URL;

if (!sourceUrl) {
  throw new Error("Missing WINE_CSV_URL. Add it as a repository secret or workflow variable.");
}

const response = await fetch(sourceUrl);

if (!response.ok) {
  throw new Error(`Could not download wine CSV: ${response.status} ${response.statusText}`);
}

const csvText = await response.text();
const rows = parseCsv(csvText);
const [headers, ...records] = rows;
const normalizedHeaders = headers.map(normalizeHeader);

const wines = records
  .map((record) => rowToWine(record, normalizedHeaders))
  .filter((wine) => wine.name && wine.producer);

fs.writeFileSync(
  "wine-data.js",
  `window.wineDirectoryData = ${JSON.stringify(wines, null, 2)};\n`
);

console.log(`Updated wine-data.js with ${wines.length} wines.`);

function rowToWine(record, headers) {
  const row = Object.fromEntries(headers.map((header, index) => [header, record[index] || ""]));

  return {
    name: row.name,
    producer: row.producer,
    vintage: row.vintage,
    status: normalizeStatus(row.status),
    region: row.region,
    subregion: row.subregion || row.subRegion,
    grapes: splitList(row.grapes || row.varietal),
    style: row.style,
    body: row.body,
    image: row.image,
    farming: row.farming || row.farmingPractices,
    price: row.price,
    oneLiner: row.oneLiner,
    details: row.details || row["300Level"] || row.level300,
    pairing: row.pairing
  };
}

function normalizeStatus(value) {
  const status = value.trim().toLowerCase();

  if (status === "previous" || status === "past") {
    return "previous";
  }

  return "current";
}

function splitList(value) {
  return value
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeHeader(header) {
  return header
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/[-_\s]+(.)?/g, (_, character = "") => character.toUpperCase())
    .replace(/^\d/, (digit) => digit)
    .replace(/^./, (character) => character.toLowerCase());
}

function parseCsv(csv) {
  const rows = [];
  let row = [];
  let field = "";
  let insideQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    const nextCharacter = csv[index + 1];

    if (character === '"' && insideQuotes && nextCharacter === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      insideQuotes = !insideQuotes;
    } else if (character === "," && !insideQuotes) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !insideQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }

      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((items) => items.some((item) => item.trim()));
}
