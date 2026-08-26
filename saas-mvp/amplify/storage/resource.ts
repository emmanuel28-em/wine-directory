import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
  name: "lineUpTrainingFiles",
  access: (allow) => ({
    // Files are organized by restaurantId in the key path.
    // App-layer helpers still verify restaurant membership before upload/list/delete.
    "restaurants/*": [
      allow.authenticated.to(["read", "write", "delete"])
    ],
    // Public uploads are intentionally not enabled yet.
    // Managed setup files are accepted after a user signs into a restaurant workspace.
    "managed-setup/*": [
      allow.authenticated.to(["read", "write", "delete"])
    ]
  })
});
