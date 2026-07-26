import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.mock("tauri-plugin-pytauri-api", () => ({
  pyInvoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  emit: vi.fn(),
  listen: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-opener", () => ({
  openUrl: vi.fn(),
}));
