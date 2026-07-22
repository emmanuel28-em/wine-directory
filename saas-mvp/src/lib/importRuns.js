import { getDataClient } from "./dataClient.js";
import { requireRestaurantId } from "./permissions.js";
import { getWorkspaceGroups } from "./workspaceGroups.js";

function assertResult(result, fallback) {
  if (result.errors?.length) throw new Error(result.errors.map((error) => error.message).join(" "));
  if (!result.data) throw new Error(fallback);
  return result.data;
}

export async function startImportRun({ restaurantId, userProfileId, sourceType, sourceName, detectedCount, selectedCount }) {
  requireRestaurantId(restaurantId);
  return assertResult(
    await getDataClient().models.ImportRun.create({
      restaurantId,
      ...getWorkspaceGroups(restaurantId),
      sourceType,
      sourceName,
      status: "processing",
      detectedCount,
      selectedCount,
      createdCount: 0,
      skippedCount: 0,
      errorMessage: "",
      startedAt: new Date().toISOString(),
      createdBy: userProfileId
    }),
    "Import history could not be started."
  );
}

export async function finishImportRun({ importRunId, status, createdCount, skippedCount, errorMessage = "" }) {
  if (!importRunId) return null;
  return assertResult(
    await getDataClient().models.ImportRun.update({
      id: importRunId,
      status,
      createdCount,
      skippedCount,
      errorMessage,
      completedAt: new Date().toISOString()
    }),
    "Import history could not be completed."
  );
}
