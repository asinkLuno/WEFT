import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getRecentFiles, rememberRecentFile } from "./settings";
import "./App.css";

type OpenedFile = { path: string; content: string };

function App() {
  const { t } = useTranslation();
  const [file, setFile] = useState<OpenedFile | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [error, setError] = useState("");

  const openFile = useCallback(
    async (path?: string) => {
      const chosen =
        path ??
        (await open({
          title: t("openFile"),
          filters: [{ name: "YAML", extensions: ["yaml", "yml"] }],
        }));
      if (typeof chosen !== "string") return; // dialog cancelled
      try {
        const content = await invoke<string>("read_yaml_file", {
          path: chosen,
        });
        setFile({ path: chosen, content });
        setRecent(await rememberRecentFile(chosen));
        setError("");
      } catch (e) {
        setError(`${t("openFileFailed")}: ${e}`);
      }
    },
    [t],
  );

  useEffect(() => {
    let disposed = false;
    const unlistens: UnlistenFn[] = [];
    const track = (u: UnlistenFn) => (disposed ? u() : unlistens.push(u));
    (async () => {
      track(await listen("file-open", () => openFile()));
      track(await listen("file-close", () => setFile(null)));
      setRecent(await getRecentFiles());
    })();
    return () => {
      disposed = true;
      for (const u of unlistens) u();
    };
  }, [openFile]);

  return (
    <main className="container">
      <h1>weft</h1>

      <h2>{t("recentFiles")}</h2>
      {recent.length === 0 ? (
        <p>{t("noRecentFiles")}</p>
      ) : (
        <ul>
          {recent.map((path) => (
            <li key={path}>
              <button type="button" onClick={() => openFile(path)}>
                {path}
              </button>
            </li>
          ))}
        </ul>
      )}

      {file && (
        <>
          <h2>{file.path}</h2>
          <pre>{file.content}</pre>
        </>
      )}
      {error && <p>{error}</p>}
    </main>
  );
}

export default App;
