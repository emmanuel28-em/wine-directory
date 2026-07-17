import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import { listCollectionsForRestaurant } from "../lib/collections.js";
import { getFileAssetUrl, listFileAssetsForRestaurant } from "../lib/fileAssets.js";
import { listTrainingDocsForRestaurant, parseContentJson } from "../lib/trainingDocs.js";

const typeLabels = {
  wine: "Wine",
  cocktail: "Cocktail",
  food: "Food",
  sop: "SOP",
  pastaTasting: "Pasta Tasting",
  custom: "Custom"
};

function groupDocsByCollectionAndType(docs, collections) {
  const collectionMap = new Map(collections.map((collection) => [collection.id, collection]));
  const groups = new Map();

  docs.forEach((doc) => {
    const collection = collectionMap.get(doc.collectionId);
    const collectionKey = collection?.id || "unassigned";
    const collectionName = collection?.name || "Unassigned";
    const collectionDescription = collection?.description || "Training pages that are not inside a Training Category yet.";
    const typeKey = doc.type || "custom";

    if (!groups.has(collectionKey)) {
      groups.set(collectionKey, {
        id: collectionKey,
        name: collectionName,
        description: collectionDescription,
        typeGroups: new Map()
      });
    }

    const collectionGroup = groups.get(collectionKey);

    if (!collectionGroup.typeGroups.has(typeKey)) {
      collectionGroup.typeGroups.set(typeKey, []);
    }

    collectionGroup.typeGroups.get(typeKey).push(doc);
  });

  return [...groups.values()].map((collectionGroup) => ({
    ...collectionGroup,
    typeGroups: [...collectionGroup.typeGroups.entries()].map(([type, typeDocs]) => ({
      type,
      docs: typeDocs
    }))
  }));
}

export default function StaffLibrary() {
  const workspace = useCurrentWorkspace();
  const [collections, setCollections] = useState([]);
  const [docs, setDocs] = useState([]);
  const [fileAssets, setFileAssets] = useState([]);
  const [message, setMessage] = useState("");

  async function loadStaffLibrary() {
    if (workspace.status !== "ready") {
      return;
    }

    setMessage("");

    try {
      const [restaurantCollections, restaurantDocs, restaurantFiles] = await Promise.all([
        listCollectionsForRestaurant(workspace.restaurant.id),
        listTrainingDocsForRestaurant(workspace.restaurant.id),
        listFileAssetsForRestaurant(workspace.restaurant.id)
      ]);

      setCollections(restaurantCollections);
      setDocs(restaurantDocs.filter((doc) => doc.status === "published"));
      setFileAssets(restaurantFiles);
    } catch (error) {
      setMessage(error.message || "Could not load the staff library.");
    }
  }

  useEffect(() => {
    if (workspace.status === "ready") {
      loadStaffLibrary();
    }

    if (workspace.status === "empty" || workspace.status === "error") {
      setCollections([]);
      setDocs([]);
      setFileAssets([]);
    }
  }, [workspace.status, workspace.restaurant?.id]);

  const groupedContent = groupDocsByCollectionAndType(docs, collections);

  async function openAttachedResource(fileAsset) {
    try {
      const url = await getFileAssetUrl({
        fileAsset,
        restaurantId: workspace.restaurant.id
      });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setMessage(error.message || "Could not open this resource.");
    }
  }

  return (
    <section className="page-section">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Staff library</p>
          <h1>{workspace.restaurant?.name || "Training Library"}</h1>
          <p>Training Categories are the sections. Training Pages are the actual things staff studies.</p>
        </div>
        <button className="secondary-button" type="button" onClick={loadStaffLibrary}>
          Refresh
        </button>
      </div>

      {workspace.status === "loading" ? (
        <div className="empty-panel">Loading staff library...</div>
      ) : null}

      {workspace.status === "empty" || workspace.status === "error" ? (
        <div className="form-card">
          <h2>Library setup needed</h2>
          <p>{workspace.message || message}</p>
          <Link className="primary-button full-width" to="/trial">
            Create Trial Workspace
          </Link>
        </div>
      ) : null}

      {workspace.status === "ready" && docs.length === 0 ? (
        <div className="empty-panel">
          No published training pages yet. A manager needs to publish training material before staff can study.
        </div>
      ) : null}

      {workspace.status === "ready" && docs.length > 0 ? (
        <div className="staff-library-sections">
          {groupedContent.map((collectionGroup) => (
            <section className="library-section collection-section" key={collectionGroup.id}>
              <div className="section-heading compact-heading">
                <p className="eyebrow">Training Category</p>
                <h2>{collectionGroup.name}</h2>
                <p>{collectionGroup.description}</p>
              </div>

              {collectionGroup.typeGroups.map((typeGroup) => (
                <section className="library-section" key={`${collectionGroup.id}-${typeGroup.type}`}>
                  <div className="type-heading">
                    <h3>{typeLabels[typeGroup.type] || typeGroup.type}</h3>
                  </div>

                  <div className="library-preview">
                    {typeGroup.docs.map((doc) => {
                      const content = parseContentJson(doc.contentJson);
                      const attachedFiles = fileAssets.filter((fileAsset) => fileAsset.trainingDocId === doc.id);

                      return (
                        <article className="training-card" key={doc.id}>
                          <span className="type-pill">{typeLabels[doc.type] || doc.type}</span>
                          <h2>{doc.title}</h2>
                          <p className="card-category">{doc.category || "Uncategorized"}</p>
                          <p>{content.summary || "No one-liner yet."}</p>

                          {content.body ? (
                            <details className="study-notes">
                              <summary>Full Notes</summary>
                              <p className="preserve-lines">{content.body}</p>
                            </details>
                          ) : null}

                          {content.details ? (
                            <details className="study-notes">
                              <summary>Extra Training Notes</summary>
                              <p>{content.details}</p>
                            </details>
                          ) : null}

                          {content.ingredients ? (
                            <div className="info-block">
                              <h3>Ingredients</h3>
                              <p className="preserve-lines">{content.ingredients}</p>
                            </div>
                          ) : null}

                          {content.allergens ? (
                            <div className="info-block">
                              <h3>Allergens</h3>
                              <p>{content.allergens}</p>
                            </div>
                          ) : null}

                          {content.talkingPoints ? (
                            <div className="info-block">
                              <h3>Talking Points</h3>
                              <p>{content.talkingPoints}</p>
                            </div>
                          ) : null}

                          {content.serviceNotes ? (
                            <div className="info-block">
                              <h3>Service Notes</h3>
                              <p>{content.serviceNotes}</p>
                            </div>
                          ) : null}

                          {attachedFiles.length > 0 ? (
                            <div className="info-block">
                              <h3>Attached Resources</h3>
                              <div className="attachment-list">
                                {attachedFiles.map((fileAsset) => (
                                  <button className="secondary-button" type="button" key={fileAsset.id} onClick={() => openAttachedResource(fileAsset)}>
                                    View {fileAsset.fileName}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </section>
          ))}
        </div>
      ) : null}

      {workspace.status === "ready" ? (
        <section className="setup-steps staff-next-steps">
          <div className="dashboard-grid">
            <article className="stat-card" id="quizzes">
              <span>Quizzes</span>
              <h2>Take a Quiz</h2>
              <p>Show that you understand the training pages your restaurant publishes.</p>
              <Link className="secondary-button card-action" to="/quizzes">
                Start Quiz
              </Link>
            </article>

            <article className="stat-card" id="progress">
              <span>My Progress</span>
              <h2>Review My Progress</h2>
              <p>See your quiz scores and whether you are ready for service.</p>
              <Link className="secondary-button card-action" to="/my-progress">
                View Progress
              </Link>
            </article>

            <article className="stat-card" id="report-issue">
              <span>Report Issue</span>
              <h2>Report an issue coming next</h2>
              <p>Staff will be able to flag outdated or confusing training pages for managers.</p>
            </article>
          </div>
        </section>
      ) : null}
    </section>
  );
}
