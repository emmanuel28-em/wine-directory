import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";

// Amplify Gen 2 backend entry point.
// Checkpoint 3 adds Data. Storage will come later.
defineBackend({
  auth,
  data
});
