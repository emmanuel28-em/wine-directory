import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const amplifyOutputsPath = path.join(projectRoot, "amplify_outputs.json");

function amplifyOutputsPlugin() {
  return {
    name: "serve-amplify-outputs",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split("?")[0] !== "/amplify_outputs.json") {
          next();
          return;
        }

        if (!fs.existsSync(amplifyOutputsPath)) {
          next();
          return;
        }

        // Vite does not automatically publish files from the project root.
        // This lets the browser read the Amplify config created by `npx ampx sandbox`.
        response.setHeader("Content-Type", "application/json");
        response.end(fs.readFileSync(amplifyOutputsPath, "utf8"));
      });
    },
    generateBundle() {
      if (!fs.existsSync(amplifyOutputsPath)) {
        return;
      }

      // When the app is built for hosting, include the generated Amplify config
      // so the deployed app can still find it at /amplify_outputs.json.
      this.emitFile({
        type: "asset",
        fileName: "amplify_outputs.json",
        source: fs.readFileSync(amplifyOutputsPath, "utf8")
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), amplifyOutputsPlugin()]
});
