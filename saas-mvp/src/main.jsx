import React from "react";
import ReactDOM from "react-dom/client";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AmplifySetupProvider } from "./amplify/AmplifySetupProvider.jsx";
import { AuthSessionProvider } from "./auth/AuthSessionProvider.jsx";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Authenticator.Provider>
      <AmplifySetupProvider>
        <AuthSessionProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthSessionProvider>
      </AmplifySetupProvider>
    </Authenticator.Provider>
  </React.StrictMode>
);
