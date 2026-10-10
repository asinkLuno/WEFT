import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLanguage, type Language } from "../settings";
import en from "./locales/en.json";
import zh from "./locales/zh.json";

// Returns the language it settled on; src/menu.ts needs it to build the menu.
export async function initI18n(): Promise<Language> {
  const lng = await getLanguage();

  await i18n.use(initReactI18next).init({
    lng,
    fallbackLng: "en",
    resources: { en: { translation: en }, zh: { translation: zh } },
    interpolation: { escapeValue: false }, // React already escapes
  });

  return lng;
}
