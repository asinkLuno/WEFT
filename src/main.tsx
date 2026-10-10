import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initI18n } from "./i18n";

// Wait for the stored/detected language before the first render.
initI18n().then(() => {
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
