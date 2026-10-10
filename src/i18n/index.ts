import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLanguage, type Language, setLanguage } from "../settings";
import en from "./locales/en.json";
import zh from "./locales/zh.json";

// Rust builds the menu, so it gets the labels in the language `i18n` is set to.
function setMenu(lng: Language) {
  return invoke("set_menu", {
    lng,
    labels: {
      file: i18n.t("menu.file"),
      open: i18n.t("menu.openFile"),
      close: i18n.t("menu.closeFile"),
      language: i18n.t("menu.language"),
    },
  });
}

export async function initI18n() {
  const lng = await getLanguage();

  await i18n.use(initReactI18next).init({
    lng,
    fallbackLng: "en",
    resources: { en: { translation: en }, zh: { translation: zh } },
    interpolation: { escapeValue: false }, // React already escapes
  });

  // Rust builds the menu before the webview boots, so correct it with the
  // stored/detected language, and rebuild it on every switch from the menu.
  await setMenu(lng);
  await listen<string>("language-changed", async ({ payload }) => {
    const next = payload as Language;
    await i18n.changeLanguage(next);
    await setLanguage(next);
    await setMenu(next);
  });
}
