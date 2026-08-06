import assert from "node:assert/strict";
import test from "node:test";
import { buildTrainingDocImageAssetMap } from "./trainingImages.js";

test("reuses a matching menu-item photo while preferring direct uploads", () => {
  const docs = [
    { id: "dinner-affettati", type: "food", title: "Affettati Misti" },
    { id: "lunch-affettati", type: "food", title: "Affettati Misti" },
    { id: "brunch-affettati", type: "food", title: "Affettati Misti" }
  ];
  const dinnerPhoto = { id: "dinner-photo", trainingDocId: "dinner-affettati", fileType: "image/jpeg", fileName: "affettati.jpg" };
  const lunchPhoto = { id: "lunch-photo", trainingDocId: "lunch-affettati", fileType: "image/jpeg", fileName: "affettati-lunch.jpg" };

  const imageMap = buildTrainingDocImageAssetMap({ trainingDocs: docs, fileAssets: [dinnerPhoto, lunchPhoto] });

  assert.equal(imageMap.get("dinner-affettati"), dinnerPhoto);
  assert.equal(imageMap.get("lunch-affettati"), lunchPhoto);
  assert.equal(imageMap.get("brunch-affettati"), dinnerPhoto);
});

test("does not share a photo between different content types", () => {
  const docs = [
    { id: "food-hugo", type: "food", title: "Hugo" },
    { id: "cocktail-hugo", type: "cocktail", title: "Hugo" }
  ];
  const cocktailPhoto = { id: "cocktail-photo", trainingDocId: "cocktail-hugo", fileType: "image/jpeg", fileName: "hugo.jpg" };

  const imageMap = buildTrainingDocImageAssetMap({ trainingDocs: docs, fileAssets: [cocktailPhoto] });

  assert.equal(imageMap.has("food-hugo"), false);
  assert.equal(imageMap.get("cocktail-hugo"), cocktailPhoto);
});
