import { useEffect, useMemo, useState } from "react";
import { useAmplifySetup } from "../amplify/AmplifySetupProvider.jsx";
import { listCollectionsForRestaurant } from "../lib/collections.js";
import {
  getFileAssetUrl,
  isPreviewableImageFileAsset,
  listFileAssetsForRestaurant
} from "../lib/fileAssets.js";
import { listTrainingDocsForRestaurant, parseContentJson } from "../lib/trainingDocs.js";
import { loadPublicWorkspace } from "../lib/workspace.js";

const ALL = "all";
const preferredSectionOrder = [
  "Dinner Menu", "Lunch Menu", "Brunch Menu", "Cocktails", "BTG Wines",
  "Pasta Tasting", "Wine Pairings", "Desserts", "Spirits", "SOPs", "Service Standards"
];
const typeLabels = {
  food: "Food", wine: "Wine", cocktail: "Cocktail", sop: "SOP",
  pastaTasting: "Pasta Tasting", custom: "Training"
};

function clean(value) {
  return String(value || "").trim();
}

function normalized(value) {
  return clean(value).toLowerCase();
}

function getSectionIds(doc) {
  const content = parseContentJson(doc.contentJson);
  if (Array.isArray(content.sectionIds) && content.sectionIds.length) return content.sectionIds;
  return doc.collectionId ? [doc.collectionId] : [];
}

function getSimpleCategory(doc) {
  const parts = clean(doc.category).split("/").map((part) => part.trim()).filter(Boolean);
  return [...new Set(parts)].at(-1) || typeLabels[doc.type] || "Training";
}

function getSearchText(doc, sectionNames) {
  const content = parseContentJson(doc.contentJson);
  return [
    doc.title, doc.category, typeLabels[doc.type], ...sectionNames, content.summary,
    content.body, content.details, content.allergens, content.ingredients,
    content.talkingPoints, content.serviceNotes,
    ...(Array.isArray(content.tags) ? content.tags : [])
  ].map(normalized).join(" ");
}

function sortSections(a, b) {
  const aIndex = preferredSectionOrder.indexOf(a.name);
  const bIndex = preferredSectionOrder.indexOf(b.name);
  return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex) || a.name.localeCompare(b.name);
}

function ProductImage({ title, url }) {
  if (!url) {
    return <div className="public-card-image public-card-image-placeholder" aria-label={`No photo available for ${title}`}><span>{title.charAt(0)}</span></div>;
  }
  return <div className="public-card-image"><img src={url} alt={title} loading="lazy" /></div>;
}

function DetailBlock({ title, value }) {
  if (!clean(value)) return null;
  return <section className="public-detail-block"><h3>{title}</h3><p>{value}</p></section>;
}

export default function PublicLibraryPage() {
  const amplifySetup = useAmplifySetup();
  const [workspace, setWorkspace] = useState(null);
  const [collections, setCollections] = useState([]);
  const [docs, setDocs] = useState([]);
  const [imageUrls, setImageUrls] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [sectionId, setSectionId] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (amplifySetup.status !== "ready") return;
    let active = true;

    async function loadLibrary() {
      setStatus("loading");
      setMessage("");
      try {
        const publicWorkspace = await loadPublicWorkspace();
        if (!publicWorkspace.restaurant?.id) throw new Error(publicWorkspace.message || "The training library is not available yet.");
        const restaurantId = publicWorkspace.restaurant.id;
        const [nextCollections, nextDocs, fileAssets] = await Promise.all([
          listCollectionsForRestaurant(restaurantId, { authMode: "identityPool" }),
          listTrainingDocsForRestaurant(restaurantId, { authMode: "identityPool" }),
          listFileAssetsForRestaurant(restaurantId, { authMode: "identityPool" })
        ]);
        const resolvedImages = await Promise.all(
          fileAssets.filter(isPreviewableImageFileAsset).map(async (asset) => {
            try {
              return [asset.trainingDocId, await getFileAssetUrl({ fileAsset: asset, restaurantId })];
            } catch {
              return null;
            }
          })
        );
        if (!active) return;
        setWorkspace(publicWorkspace);
        const activeCollections = nextCollections.filter((item) => item.status !== "archived").sort(sortSections);
        const startingSection = activeCollections.find((item) => item.name === "Dinner Menu") || activeCollections[0];
        setCollections(activeCollections);
        setSectionId(startingSection?.id || ALL);
        setDocs(nextDocs.filter((doc) => doc.status === "published"));
        setImageUrls(Object.fromEntries(resolvedImages.filter(Boolean)));
        setStatus("ready");
      } catch (error) {
        if (!active) return;
        setStatus("error");
        setMessage(error.message || "Line Up could not load the training library.");
      }
    }

    loadLibrary();
    return () => { active = false; };
  }, [amplifySetup.status]);

  const collectionMap = useMemo(() => new Map(collections.map((item) => [item.id, item])), [collections]);
  const sectionCounts = useMemo(() => {
    const counts = {};
    docs.forEach((doc) => getSectionIds(doc).forEach((id) => { counts[id] = (counts[id] || 0) + 1; }));
    return counts;
  }, [docs]);
  const categories = useMemo(() => [...new Set(docs
    .filter((doc) => sectionId === ALL || getSectionIds(doc).includes(sectionId))
    .map(getSimpleCategory))].sort(), [docs, sectionId]);
  const visibleDocs = useMemo(() => {
    const query = normalized(searchTerm);
    return docs
      .filter((doc) => query || sectionId === ALL || getSectionIds(doc).includes(sectionId))
      .filter((doc) => query || category === ALL || getSimpleCategory(doc) === category)
      .filter((doc) => !query || getSearchText(doc, getSectionIds(doc).map((id) => collectionMap.get(id)?.name || "")).includes(query))
      .sort((a, b) => getSimpleCategory(a).localeCompare(getSimpleCategory(b)) || a.title.localeCompare(b.title));
  }, [docs, sectionId, category, searchTerm, collectionMap]);
  const selectedContent = selectedDoc ? parseContentJson(selectedDoc.contentJson) : null;

  function chooseSection(nextSectionId) {
    setSectionId(nextSectionId);
    setCategory(ALL);
  }

  return (
    <section className="public-library-page">
      <header className="public-library-hero">
        <p className="eyebrow">{workspace?.restaurant?.name || "Rezdora"}</p>
        <h1>Training Library</h1>
        <p>Find current dishes, wines, cocktails, and service information in one place.</p>
      </header>

      <div className="public-library-toolbar">
        <label className="public-library-search">
          <span>Search the library</span>
          <input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search a dish, wine, ingredient, or allergen" />
        </label>
      </div>

      {status === "loading" ? <div className="public-library-state">Loading the training library...</div> : null}
      {status === "error" ? (
        <div className="public-library-state public-library-error">
          <h2>The library could not load</h2><p>{message}</p>
          <button className="primary-button" type="button" onClick={() => window.location.reload()}>Try again</button>
        </div>
      ) : null}

      {status === "ready" ? (
        <>
          <nav className="public-section-tabs" aria-label="Training library sections">
            <button type="button" className={sectionId === ALL ? "is-active" : ""} onClick={() => chooseSection(ALL)}><span>All</span><small>{docs.length}</small></button>
            {collections.filter((item) => sectionCounts[item.id]).map((item) => (
              <button type="button" className={sectionId === item.id ? "is-active" : ""} onClick={() => chooseSection(item.id)} key={item.id}><span>{item.name}</span><small>{sectionCounts[item.id]}</small></button>
            ))}
          </nav>

          {categories.length > 1 ? (
            <div className="public-category-chips" aria-label="Category filters">
              <button type="button" className={category === ALL ? "is-active" : ""} onClick={() => setCategory(ALL)}>All</button>
              {categories.map((item) => <button type="button" className={category === item ? "is-active" : ""} onClick={() => setCategory(item)} key={item}>{item}</button>)}
            </div>
          ) : null}

          <div className="public-library-results-heading">
            <h2>{searchTerm.trim() ? "Search results" : sectionId === ALL ? "All training pages" : collectionMap.get(sectionId)?.name}</h2>
            <span>{visibleDocs.length} {visibleDocs.length === 1 ? "item" : "items"}</span>
          </div>

          {visibleDocs.length ? (
            <div className="public-product-grid">
              {visibleDocs.map((doc) => {
                const content = parseContentJson(doc.contentJson);
                return (
                  <button className="public-product-card" type="button" key={doc.id} onClick={() => setSelectedDoc(doc)}>
                    <ProductImage title={doc.title} url={imageUrls[doc.id]} />
                    <span className="public-product-copy">
                      <small>{getSimpleCategory(doc)}</small><strong>{doc.title}</strong>
                      <span>{content.summary || content.talkingPoints || "Open to read the training notes."}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="public-library-state">
              <h2>No matching training pages</h2><p>Try another search or section.</p>
              <button type="button" className="secondary-button" onClick={() => { setSearchTerm(""); chooseSection(ALL); }}>Clear filters</button>
            </div>
          )}
        </>
      ) : null}

      {selectedDoc && selectedContent ? (
        <div className="public-detail-overlay" role="dialog" aria-modal="true" aria-label={selectedDoc.title} onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedDoc(null); }}>
          <article className="public-detail-modal">
            <button className="public-detail-close" type="button" onClick={() => setSelectedDoc(null)} aria-label="Close details">×</button>
            <ProductImage title={selectedDoc.title} url={imageUrls[selectedDoc.id]} />
            <div className="public-detail-content">
              <p className="eyebrow">{getSimpleCategory(selectedDoc)}</p><h2>{selectedDoc.title}</h2>
              {selectedContent.summary ? <p className="public-detail-summary">{selectedContent.summary}</p> : null}
              <DetailBlock title="Description" value={selectedContent.body || selectedContent.details} />
              <DetailBlock title="Ingredients" value={selectedContent.ingredients} />
              <DetailBlock title="Allergens" value={selectedContent.allergens} />
              <DetailBlock title="Talking Points" value={selectedContent.talkingPoints} />
              <DetailBlock title="Service Notes" value={selectedContent.serviceNotes} />
            </div>
          </article>
        </div>
      ) : null}
    </section>
  );
}
