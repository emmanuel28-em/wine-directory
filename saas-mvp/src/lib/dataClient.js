import { generateClient } from "aws-amplify/data";

let cachedClient;

// This creates the frontend database client after Amplify.configure() has run.
// Creating it too early causes Amplify Data to miss the GraphQL configuration.
export function getDataClient() {
  if (!cachedClient) {
    cachedClient = generateClient();
  }

  return cachedClient;
}
