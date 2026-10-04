import React from "react";
import ReactDOM from "react-dom/client";
import "@aws-amplify/ui-react/styles.css";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AmplifySetupProvider } from "./amplify/AmplifySetupProvider.jsx";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AmplifySetupProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AmplifySetupProvider>
  </React.StrictMode>
);
