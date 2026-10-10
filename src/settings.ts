import { Store } from "@tauri-apps/plugin-store";

export type Language = "en" | "zh";

const RECENT_LIMIT = 5;

// Started at import time so the load overlaps with app startup.
const store = Store.load("settings.json");

export async function getLanguage(): Promise<Language> {
  const saved = await (await store).get<string>("language");
  if (saved === "en" || saved === "zh") return saved;
  return navigator.language.startsWith("zh") ? "zh" : "en";
}

export async function setLanguage(lng: Language) {
  await (await store).set("language", lng);
}

// Must match the [data-theme=...] blocks in src/index.css.
export const THEMES = [
  "neutral",
  "blue",
  "violet",
  "teal",
  "green",
  "orange",
  "rose",
] as const;

export type Theme = (typeof THEMES)[number];

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

export async function getTheme(): Promise<Theme> {
  const saved = await (await store).get<string>("theme");
  return THEMES.find((theme) => theme === saved) ?? "neutral";
}

export async function setTheme(theme: Theme) {
  applyTheme(theme);
  await (await store).set("theme", theme);
}

export async function getRecentFiles(): Promise<string[]> {
  return (await (await store).get<string[]>("recentFiles")) ?? [];
}

// Moves the file to the front, drops older duplicates, caps the list.
export async function rememberRecentFile(path: string): Promise<string[]> {
  const s = await store;
  const rest = ((await s.get<string[]>("recentFiles")) ?? []).filter(
    (p) => p !== path,
  );
  const recent = [path, ...rest].slice(0, RECENT_LIMIT);
  await s.set("recentFiles", recent);
  return recent;
}
