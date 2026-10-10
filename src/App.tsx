import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { type LastLoad, StatusBar } from "@/components/status-bar";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { ViewerScreen } from "@/components/viewer-screen";
import { WelcomeScreen } from "@/components/welcome-screen";
import { getRecentFiles, rememberRecentFile } from "./settings";

type OpenedFile = { path: string; content: string };

function App() {
  const { t } = useTranslation();
  const [file, setFile] = useState<OpenedFile | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [lastLoad, setLastLoad] = useState<LastLoad | null>(null);

  const load = useCallback(
    async (path: string, refresh = false) => {
      try {
        const content = await invoke<string>("read_yaml_file", { path });
        setFile({ path, content });
        setLastLoad({ at: new Date(), refresh });
        setError("");
        return true;
      } catch (e) {
        setError(
          `${t("openFileFailed")}: ${e === "notYaml" ? t("notYaml") : e}`,
        );
        return false;
      }
    },
    [t],
  );

  const openFile = useCallback(
    async (path?: string) => {
      const chosen =
        path ??
        (await open({
          title: t("openFile"),
          filters: [{ name: "YAML", extensions: ["yaml", "yml"] }],
        }));
      if (typeof chosen !== "string") return; // dialog cancelled
      if (await load(chosen)) setRecent(await rememberRecentFile(chosen));
    },
    [load, t],
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

  // Bind the open file so external edits come back as events, and unbind on close.
  // Keyed on the path, so a reload caused by a change does not re-arm the watch mid-save.
  useEffect(() => {
    const path = file?.path;
    invoke("bind_yaml_file", { path: path ?? null }).catch((e) =>
      setError(String(e)),
    );
    if (!path) return;
    let disposed = false;
    const unlistens: UnlistenFn[] = [];
    const track = (u: UnlistenFn) => (disposed ? u() : unlistens.push(u));
    // Rust already debounced the burst, so one event means one re-read.
    listen("file-changed", () => load(path, true)).then(track);
    return () => {
      disposed = true;
      for (const u of unlistens) u();
    };
  }, [file?.path, load]);

  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
        {/* Bound -> viewer, unbound -> welcome. Closing the file switches back. */}
        {file ? (
          <ViewerScreen path={file.path} content={file.content} />
        ) : (
          <WelcomeScreen recent={recent} onOpen={openFile} />
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        )}
      </main>
      <StatusBar path={file?.path ?? null} lastLoad={lastLoad} />
    </div>
  );
}

export default App;
