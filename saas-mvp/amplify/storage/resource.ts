import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
  name: "lineUpTrainingFiles",
  access: (allow) => ({
    // Files are organized by restaurantId in the key path.
    // App-layer helpers still verify restaurant membership before upload/list/delete.
    "restaurants/*": [
      allow.guest.to(["read"]),
      allow.authenticated.to(["read", "write", "delete"])
    ],
    "managed-setup/*": [
      allow.authenticated.to(["read", "write", "delete"])
    ]
  })
});
