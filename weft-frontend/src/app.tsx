import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { Clock3, FileText, FileX, FolderOpen } from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { PageErrorBoundary, PageLoading } from "@/components/page-state";
import { SettingsDialog } from "@/components/settings-dialog";
import { QuickSwitcher } from "@/components/quick-switcher";
import { AppEvents } from "@/app/app-events";
import {
  closeStory,
  getAppState,
  getLoadError,
  hasLoadedStory,
  openRecentStory,
  openStory,
  reloadStory,
  triggerRefetch,
  type AppStateInfo,
  type OpenedStory,
} from "@/lib/api";
import { emit, listen, openUrl } from "@/lib/platform";

const StoryPage = lazy(() => import("@/app/story/page"));
const MoaiPage = lazy(() => import("@/app/moai/page"));
const MoaiLinkPage = lazy(() => import("@/app/moai-link/page"));
const DriftPage = lazy(() => import("@/app/drift/page"));
const NarrativePage = lazy(() => import("@/app/narrative/page"));

const NAV_ITEMS = [
  { label: "story", path: "/story" },
  { label: "moai", path: "/moai" },
  { label: "moai link", path: "/moai-link" },
  { label: "drift", path: "/drift" },
  { label: "narrative", path: "/narrative" },
] as const;

const PAGES: Record<string, React.ComponentType> = {
  "/story": StoryPage,
  "/moai": MoaiPage,
  "/moai-link": MoaiLinkPage,
  "/drift": DriftPage,
  "/narrative": NarrativePage,
};

type Language = "zh-CN" | "en";

const LANGUAGE_KEY = "weft.language";
const RECENT_STORIES_KEY = "weft.recentStories";
const MAX_RECENT_STORIES = 5;

const COPY = {
  "zh-CN": {
    title: "打开一个 WEFT 故事",
    description: "选择 YAML 文件后，即可查看故事、墨埃、漂移和叙事时间线。",
    formats: "支持 .yaml 和 .yml 文件",
    choose: "选择 YAML 文件",
    opening: "正在打开…",
    recent: "最近打开",
    noRecent: "还没有最近打开的故事",
    openFailed: "打开失败",
    fileLostTitle: "当前故事文件不见了",
    fileLostHint: "它可能被移动或删除。可在文件管理器中确认后再重新定位。",
    locate: "重新定位…",
    closeStory: "关闭故事",
    watching: "正在监听文件变化",
    invalidDropFile: "只支持 .yaml 或 .yml 文件",
    dropToOpen: "松开以打开此 YAML",
  },
  en: {
    title: "Open a WEFT story",
    description:
      "Choose a YAML file to explore its story, moai, drifts, and narrative timeline.",
    formats: "Supports .yaml and .yml files",
    choose: "Choose YAML file",
    opening: "Opening…",
    recent: "Recent stories",
    noRecent: "No recently opened stories yet",
    openFailed: "Failed to open",
    fileLostTitle: "Current story file is missing",
    fileLostHint:
      "It may have been moved or deleted outside WEFT. Verify it in your file manager and re-locate.",
    locate: "Locate…",
    closeStory: "Close story",
    watching: "Watching file for changes",
    invalidDropFile: "Only .yaml or .yml files are supported",
    dropToOpen: "Release to open this YAML",
  },
} as const;

function initialLanguage(): Language {
  const saved = localStorage.getItem(LANGUAGE_KEY);
  if (saved === "zh-CN" || saved === "en") return saved;
  return navigator.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

function loadRecentStories(): OpenedStory[] {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(RECENT_STORIES_KEY) ?? "[]",
    );
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (item): item is OpenedStory =>
          typeof item?.title === "string" && typeof item?.path === "string",
      )
      .slice(0, MAX_RECENT_STORIES);
  } catch {
    return [];
  }
}

function currentPath() {
  return window.location.hash.slice(1) || "/story";
}

export function App() {
  const [path, setPath] = useState(currentPath);
  const [hasStory, setHasStory] = useState<boolean | null>(null);
  const [appState, setAppState] = useState<AppStateInfo | null>(null);
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [recentStories, setRecentStories] =
    useState<OpenedStory[]>(loadRecentStories);
  const [fileLostPath, setFileLostPath] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [dragPath, setDragPath] = useState<string | null>(null);
  const copy = COPY[language];

  const refreshAppState = useCallback(() => {
    getAppState()
      .then(setAppState)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    hasLoadedStory()
      .then((loaded) => {
        setHasStory(loaded);
        if (loaded) refreshAppState();
        else
          getLoadError()
            .then((error) => {
              if (!error) return;
              const location = error.line
                ? ` (${error.line}${error.column ? `:${error.column}` : ""})`
                : "";
              setOpenError(`${error.message}${location} [${error.code}]`);
            })
            .catch(() => undefined);
      })
      .catch((error) => {
        setHasStory(false);
        setOpenError(error instanceof Error ? error.message : String(error));
      });

    if (!window.location.hash) {
      window.location.replace("#/story");
    }
    const navigate = () => setPath(currentPath());
    window.addEventListener("hashchange", navigate);
    return () => window.removeEventListener("hashchange", navigate);
  }, [refreshAppState]);

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;
    let disposed = false;
    listen<string>("weft-menu", (event) => {
      switch (event.payload) {
        case "open":
          void handleOpenStory();
          break;
        case "open_recent":
          setSwitcherOpen(true);
          break;
        case "close":
          void handleCloseStory();
          break;
        case "reload":
          void handleReload();
          break;
        case "preferences":
          setSettingsOpen(true);
          break;
        case "help_docs":
          openExternal("https://asinkluno.github.io/WEFT/");
          break;
        case "help_issue":
          openExternal("https://github.com/asinkLuno/WEFT/issues");
          break;
      }
    }).then((un) => {
      if (disposed) un();
      else unlisten = un;
    });
    return () => {
      disposed = true;
      unlisten?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const unlisteners: UnlistenFn[] = [];
    let disposed = false;
    Promise.all([
      listen<string>("weft-drag-enter", (event) => setDragPath(event.payload)),
      listen<string>("weft-drag-drop", (event) => {
        setDragPath(null);
        void handleDrop(event.payload);
      }),
      listen("weft-drag-leave", () => setDragPath(null)),
    ]).then((listeners) => {
      if (disposed) listeners.forEach((un) => un());
      else unlisteners.push(...listeners);
    });
    return () => {
      disposed = true;
      unlisteners.forEach((un) => un());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const Page = PAGES[path] ?? StoryPage;

  function rememberStory(story: OpenedStory) {
    setRecentStories((prev) => {
      const next = [
        story,
        ...prev.filter((recent) => recent.path !== story.path),
      ].slice(0, MAX_RECENT_STORIES);
      localStorage.setItem(RECENT_STORIES_KEY, JSON.stringify(next));
      return next;
    });
  }

  function changeLanguage(next: Language) {
    setLanguage(next);
    localStorage.setItem(LANGUAGE_KEY, next);
  }

  function finishOpening(story: OpenedStory) {
    rememberStory(story);
    window.location.hash = "/story";
    window.location.reload();
  }

  async function handleOpenStory() {
    setOpening(true);
    setOpenError(null);
    try {
      const story = await openStory();
      if (story !== null) finishOpening(story);
    } catch (error) {
      setOpenError(error instanceof Error ? error.message : String(error));
    } finally {
      setOpening(false);
    }
  }

  async function handleOpenRecent(story: OpenedStory) {
    setOpening(true);
    setOpenError(null);
    try {
      finishOpening(await openRecentStory(story.path));
    } catch (error) {
      setOpenError(error instanceof Error ? error.message : String(error));
    } finally {
      setOpening(false);
    }
  }

  async function handleCloseStory() {
    try {
      await closeStory();
      setFileLostPath(null);
      setHasStory(false);
      setAppState(null);
      window.location.hash = "/story";
    } catch (error) {
      setOpenError(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleLocate() {
    setOpening(true);
    try {
      const story = await openStory();
      if (story !== null) {
        setFileLostPath(null);
        finishOpening(story);
      }
    } catch (error) {
      setOpenError(error instanceof Error ? error.message : String(error));
    } finally {
      setOpening(false);
    }
  }

  async function handleReload() {
    try {
      await reloadStory();
      triggerRefetch();
      refreshAppState();
    } catch (error) {
      setOpenError(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleDrop(rawPath: string) {
    const path = rawPath.trim();
    if (!/\.(ya?ml)$/i.test(path)) {
      setOpenError(copy.invalidDropFile);
      return;
    }
    setOpenError(null);
    setOpening(true);
    try {
      const story = await openRecentStory(path);
      finishOpening(story);
    } catch (error) {
      setOpenError(error instanceof Error ? error.message : String(error));
    } finally {
      setOpening(false);
    }
  }

  function openExternal(url: string) {
    void openUrl(url);
  }

  const onFileLost = useCallback((lostPath: string) => {
    setFileLostPath(lostPath);
  }, []);

  useEffect(() => {
    if (hasStory === null) return;
    void emit("weft-menu-state", {
      close: hasStory,
      reload: hasStory && !fileLostPath,
    });
  }, [hasStory, fileLostPath]);

  if (hasStory === null) {
    return <div className="min-h-screen bg-background" />;
  }

  const dragOverlay = dragPath !== null && (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      aria-live="polite"
    >
      <div className="pointer-events-none rounded-xl border-2 border-dashed border-primary/50 bg-background/95 px-12 py-8 text-center shadow-lg">
        <FolderOpen className="mx-auto mb-3 size-8 text-primary" />
        <p className="text-sm font-medium">{copy.dropToOpen}</p>
        <p
          className="mt-1 max-w-xs truncate text-xs text-muted-foreground"
          title={dragPath}
        >
          {dragPath.split(/[\\/]/).pop()}
        </p>
      </div>
    </div>
  );

  const dialogs = (
    <>
      {dragOverlay}
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        language={language}
        onLanguageChange={changeLanguage}
      />
      <QuickSwitcher
        open={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        recent={recentStories}
        onPick={(story) => {
          setSwitcherOpen(false);
          void handleOpenRecent(story);
        }}
        language={language}
      />
    </>
  );

  if (!hasStory) {
    return (
      <>
        <main className="flex min-h-screen items-center justify-center px-6 py-12">
          <div className="w-full max-w-lg">
            <div className="text-center">
              <img
                src="/logo-icon.svg"
                alt="WEFT"
                width={40}
                height={40}
                className="mx-auto mb-6"
              />
              <h1 className="text-2xl font-semibold tracking-tight">
                {copy.title}
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {copy.description}
              </p>
              <div className="mt-8 rounded-xl border border-dashed bg-card/50 px-8 py-10">
                <FileText className="mx-auto mb-4 size-10 text-muted-foreground" />
                <p className="mb-5 text-sm text-muted-foreground">
                  {copy.formats}
                </p>
                <Button
                  type="button"
                  size="lg"
                  onClick={handleOpenStory}
                  disabled={opening}
                >
                  <FolderOpen data-icon="inline-start" />
                  {opening ? copy.opening : copy.choose}
                </Button>
              </div>
            </div>

            <section className="mt-8" aria-labelledby="recent-stories-heading">
              <h2
                id="recent-stories-heading"
                className="mb-3 flex items-center gap-2 text-sm font-medium"
              >
                <Clock3 className="size-4 text-muted-foreground" />
                {copy.recent}
              </h2>
              {recentStories.length > 0 ? (
                <div className="overflow-hidden rounded-xl border bg-card">
                  {recentStories.map((story) => (
                    <button
                      key={story.path}
                      type="button"
                      className="block w-full border-b px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-accent disabled:opacity-50"
                      onClick={() => handleOpenRecent(story)}
                      disabled={opening}
                    >
                      <span className="block truncate text-sm font-medium">
                        {story.title}
                      </span>
                      <span
                        className="mt-1 block truncate text-xs text-muted-foreground"
                        title={story.path}
                      >
                        {story.path}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">
                  {copy.noRecent}
                </p>
              )}
            </section>
            {openError && (
              <p className="mt-4 text-sm text-destructive" role="alert">
                {copy.openFailed}: {openError}
              </p>
            )}
          </div>
        </main>
        {dialogs}
      </>
    );
  }

  if (fileLostPath) {
    return (
      <>
        <AppEvents onFileLost={onFileLost} />
        <main className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-md text-center">
            <FileX className="mx-auto mb-4 size-10 text-muted-foreground" />
            <h1 className="text-xl font-semibold tracking-tight">
              {copy.fileLostTitle}
            </h1>
            <p className="mt-3 break-all rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
              {fileLostPath}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              {copy.fileLostHint}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button type="button" onClick={handleLocate} disabled={opening}>
                <FolderOpen data-icon="inline-start" />
                {opening ? copy.opening : copy.locate}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseStory}
              >
                {copy.closeStory}
              </Button>
            </div>
            {openError && (
              <p className="mt-4 text-sm text-destructive" role="alert">
                {copy.openFailed}: {openError}
              </p>
            )}
          </div>
        </main>
        {dialogs}
      </>
    );
  }

  const fileName = appState?.story_path
    ? appState.story_path.split(/[\\/]/).pop()
    : null;

  return (
    <>
      <div className="min-h-screen flex flex-col">
        <AppEvents onFileLost={onFileLost} />
        <header className="flex items-center gap-6 border-b border-border px-6 py-3">
          <a
            href="#/story"
            className="flex items-center gap-2 text-lg font-semibold tracking-wide"
          >
            <img src="/logo-icon.svg" alt="WEFT" width={20} height={20} />
            WEFT
          </a>
          <NavigationMenu>
            <NavigationMenuList className="gap-1">
              {NAV_ITEMS.map((item) => (
                <NavigationMenuItem key={item.path}>
                  <NavigationMenuLink href={`#${item.path}`}>
                    {item.label}
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
          <div className="ml-auto flex items-center gap-3">
            {openError && (
              <span
                className="max-w-80 truncate text-sm text-destructive"
                title={openError}
              >
                {copy.openFailed}: {openError}
              </span>
            )}
            {fileName && (
              <span
                className="flex items-center gap-1.5 max-w-60 truncate text-sm text-muted-foreground"
                title={appState?.story_path ?? fileName}
              >
                <span
                  className="size-1.5 rounded-full bg-emerald-500"
                  aria-label={copy.watching}
                />
                <span className="truncate">{fileName}</span>
              </span>
            )}
          </div>
        </header>
        <PageErrorBoundary key={path}>
          <Suspense fallback={<PageLoading />}>
            <Page />
          </Suspense>
        </PageErrorBoundary>
      </div>
      {dialogs}
    </>
  );
}
