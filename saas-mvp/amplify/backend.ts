import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { storage } from "./storage/resource";

// Amplify Gen 2 backend entry point.
// Storage keeps training source files in S3.
defineBackend({
  auth,
  data,
  storage
});
