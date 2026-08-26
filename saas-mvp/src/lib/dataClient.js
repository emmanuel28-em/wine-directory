import { generateClient } from "aws-amplify/data";

let cachedClient;
let cachedGuestClient;

// This creates the frontend database client after Amplify.configure() has run.
// Creating it too early causes Amplify Data to miss the GraphQL configuration.
export function getDataClient(options = {}) {
  if (options.authMode === "identityPool") {
    if (!cachedGuestClient) {
      cachedGuestClient = generateClient({ authMode: "identityPool" });
    }

    return cachedGuestClient;
  }

  if (!cachedClient) {
    cachedClient = generateClient();
  }

  return cachedClient;
}
