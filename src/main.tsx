import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initI18n } from "./i18n";
import { initMenu } from "./menu";
import { applyTheme, getTheme } from "./settings";
import "./index.css";

// Resolve language and theme before the first render so neither the window nor
// the menu flashes the defaults.
Promise.all([initI18n(), getTheme()]).then(async ([lng, theme]) => {
  applyTheme(theme);
  await initMenu(lng, theme);
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
