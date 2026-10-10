import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import i18n from "i18next";
import {
  type Language,
  setLanguage,
  setTheme,
  THEMES,
  type Theme,
} from "./settings";

// The menu is built in Rust, so it gets every label in the current language plus
// the current language/theme, which is what ticks the right items.
function pushMenu(lng: Language, theme: Theme) {
  return invoke("set_menu", {
    lng,
    theme,
    labels: {
      file: i18n.t("menu.file"),
      open: i18n.t("menu.openFile"),
      close: i18n.t("menu.closeFile"),
      settings: i18n.t("menu.settings"),
      language: i18n.t("menu.language"),
      theme: i18n.t("menu.theme"),
      themes: THEMES.map((id) => ({ id, label: i18n.t(`theme.${id}`) })),
    },
  });
}

export async function initMenu(lng: Language, theme: Theme) {
  await pushMenu(lng, theme);

  // Both handlers rebuild the menu: the labels change with the language, and
  // the checkmarks move with either.
  await listen<string>("language-changed", async ({ payload }) => {
    lng = payload as Language;
    await i18n.changeLanguage(lng);
    await setLanguage(lng);
    await pushMenu(lng, theme);
  });

  await listen<string>("theme-changed", async ({ payload }) => {
    theme = payload as Theme;
    await setTheme(theme);
    await pushMenu(lng, theme);
  });
}
