import { getUrl, remove, uploadData } from "aws-amplify/storage";
import { getDataClient } from "./dataClient.js";
import { assertSameRestaurant, requireRestaurantId } from "./permissions.js";
import { getWorkspaceGroups } from "./workspaceGroups.js";

const allowedTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
];

const allowedExtensions = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".heic",
  ".heif",
  ".doc",
  ".docx",
  ".txt",
  ".csv",
  ".xls",
  ".xlsx"
];

const previewableImageExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

function getFileExtension(fileName) {
  const cleanName = String(fileName || "").toLowerCase();
  const dotIndex = cleanName.lastIndexOf(".");
  return dotIndex >= 0 ? cleanName.slice(dotIndex) : "";
}

function hasAllowedExtension(file) {
  return allowedExtensions.includes(getFileExtension(file?.name));
}

export function isPreviewableImageFileAsset(fileAsset) {
  const fileType = String(fileAsset?.fileType || "").toLowerCase();
  const fileName = fileAsset?.fileName || fileAsset?.name || fileAsset?.storageKey || "";

  return (
    ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(fileType) ||
    previewableImageExtensions.includes(getFileExtension(fileName))
  );
}

function assertNoErrors(result, fallbackMessage) {
  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join(" "));
  }

  if (!result.data) {
    throw new Error(fallbackMessage);
  }

  return result.data;
}

function cleanPathPart(value) {
  return String(value || "file")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "file";
}

function assertAllowedFile(file) {
  if (!file) {
    throw new Error("Choose a file to upload.");
  }

  if (file.type && !allowedTypes.includes(file.type) && !hasAllowedExtension(file)) {
    throw new Error("This file type is not supported yet. Upload a PDF, image, Word doc, text, CSV, or spreadsheet.");
  }
}

function buildStorageKey({ restaurantId, trainingDocId, managedSetupRequestId, file }) {
  const fileName = cleanPathPart(file.name);
  const uniquePart = `${Date.now()}-${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`;

  if (trainingDocId) {
    return `restaurants/${restaurantId}/training-docs/${trainingDocId}/${uniquePart}-${fileName}`;
  }

  if (managedSetupRequestId) {
    return `managed-setup/${restaurantId}/${managedSetupRequestId}/${uniquePart}-${fileName}`;
  }

  return `restaurants/${restaurantId}/general/${uniquePart}-${fileName}`;
}

async function verifyTrainingDoc({ dataClient, trainingDocId, restaurantId }) {
  if (!trainingDocId) {
    return;
  }

  const result = await dataClient.models.TrainingDoc.get({ id: trainingDocId });

  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join(" "));
  }

  assertSameRestaurant(result.data, restaurantId, "Training Page");
}

export async function uploadFileAsset({ restaurantId, trainingDocId = null, managedSetupRequestId = null, file, uploadedBy }) {
  requireRestaurantId(restaurantId);
  assertAllowedFile(file);

  const dataClient = getDataClient();
  await verifyTrainingDoc({ dataClient, trainingDocId, restaurantId });

  const storageKey = buildStorageKey({
    restaurantId,
    trainingDocId,
    managedSetupRequestId,
    file
  });

  await uploadData({
    path: storageKey,
    data: file,
    options: {
      contentType: file.type || "application/octet-stream"
    }
  }).result;

  return assertNoErrors(
    await dataClient.models.FileAsset.create({
      restaurantId,
      ...getWorkspaceGroups(restaurantId),
      trainingDocId,
      managedSetupRequestId,
      name: file.name,
      fileName: file.name,
      fileType: file.type || "unknown",
      fileSize: file.size || 0,
      storageKey,
      uploadedBy
    }),
    "File metadata was not saved."
  );
}

export async function listFileAssetsForRestaurant(restaurantId) {
  requireRestaurantId(restaurantId);
  const dataClient = getDataClient();
  const result = await dataClient.models.FileAsset.list({
    filter: {
      restaurantId: {
        eq: restaurantId
      }
    }
  });

  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join(" "));
  }

  return [...(result.data || [])].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

export async function listFileAssetsForTrainingDoc({ restaurantId, trainingDocId }) {
  requireRestaurantId(restaurantId);
  const files = await listFileAssetsForRestaurant(restaurantId);
  return files.filter((file) => file.trainingDocId === trainingDocId);
}

export async function getFileAssetUrl({ fileAsset, restaurantId }) {
  assertSameRestaurant(fileAsset, restaurantId, "File");
  const result = await getUrl({
    path: fileAsset.storageKey,
    options: {
      expiresIn: 900
    }
  });

  return result.url.toString();
}

export async function deleteFileAsset({ fileAsset, restaurantId }) {
  assertSameRestaurant(fileAsset, restaurantId, "File");
  const dataClient = getDataClient();

  await remove({
    path: fileAsset.storageKey
  });

  const result = await dataClient.models.FileAsset.delete({ id: fileAsset.id });

  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join(" "));
  }
}

export async function createManagedSetupRequest({ workspace, inquiry }) {
  const restaurantId = workspace?.restaurant?.id || null;
  const dataClient = restaurantId ? getDataClient() : getDataClient({ authMode: "identityPool" });

  if (restaurantId) {
    requireRestaurantId(restaurantId);
  }

  return assertNoErrors(
    await dataClient.models.ManagedSetupRequest.create({
      restaurantId,
      ...(restaurantId ? getWorkspaceGroups(restaurantId) : {}),
      restaurantName: inquiry.restaurantName.trim(),
      contactFirstName: inquiry.contactFirstName.trim(),
      contactLastName: inquiry.contactLastName.trim(),
      email: inquiry.email.trim().toLowerCase(),
      title: inquiry.title.trim(),
      materialsJson: JSON.stringify(inquiry.materials || []),
      priorityJson: JSON.stringify(inquiry.priorities || []),
      notes: inquiry.notes.trim(),
      status: "new"
    }),
    "Managed setup request was not saved."
  );
}
