import { fetchAuthSession } from "aws-amplify/auth";
import { getDataClient } from "./dataClient.js";

// Workspace creation is handled by a backend function so the browser cannot
// manufacture restaurant ownership or Cognito access groups.
export async function createTrialWorkspace({ restaurantName, managerName, restaurantAddress = "", restaurantWebsite = "" }) {
  const dataClient = getDataClient();
  const result = await dataClient.mutations.provisionTrialWorkspace({
    restaurantName: restaurantName.trim(),
    managerName: managerName.trim(),
    address: restaurantAddress.trim(),
    website: restaurantWebsite.trim()
  });

  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join(" "));
  }

  if (!result.data?.success) {
    throw new Error(result.data?.error || "Restaurant workspace could not be created.");
  }

  // Refresh the token so the newly assigned restaurant groups are available immediately.
  await fetchAuthSession({ forceRefresh: true });
  return result.data;
}
