import { generateClient } from "aws-amplify/data";

let cachedClient;
let cachedGuestClient;

// This creates the frontend database client after Amplify.configure() has run.
// Creating it too early causes Amplify Data to miss the GraphQL configuration.
export function getDataClient(options = {}) {
  const authMode = options.authMode || "identityPool";

  if (authMode === "identityPool") {
    if (!cachedGuestClient) {
      cachedGuestClient = generateClient({ authMode: "identityPool" });
    }

    return cachedGuestClient;
  }

  if (authMode !== "userPool") {
    throw new Error(`Unsupported data auth mode: ${authMode}`);
  }

  if (!cachedClient) {
    cachedClient = generateClient();
  }

  return cachedClient;
}
