import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: the Tauri webview serves the built `out/` (no Node server).
  output: "export",
  // Emit `/foo/index.html` so Tauri's custom protocol resolves routes cleanly.
  trailingSlash: true,
  // Default image loader needs a server; disable optimization for static export.
  images: { unoptimized: true },
};

export default nextConfig;
