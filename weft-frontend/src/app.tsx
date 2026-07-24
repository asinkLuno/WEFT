import { lazy, Suspense, useEffect, useState } from "react";
import { Clock3, FileText, FolderOpen, Languages } from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { PageErrorBoundary, PageLoading } from "@/components/page-state";
import { HotReload } from "@/app/hot-reload";
import {
  getLoadError,
  getStory,
  openRecentStory,
  openStory,
  type OpenedStory,
} from "@/lib/api";

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
    language: "语言",
    openFailed: "打开失败",
    openYaml: "打开 YAML",
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
    language: "Language",
    openFailed: "Failed to open",
    openYaml: "Open YAML",
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
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [recentStories, setRecentStories] =
    useState<OpenedStory[]>(loadRecentStories);
  const copy = COPY[language];

  useEffect(() => {
    getStory()
      .then(() => setHasStory(true))
      .catch(() => {
        setHasStory(false);
        getLoadError()
          .then((error) => {
            if (!error) return;
            const location = error.line
              ? ` (${error.line}${error.column ? `:${error.column}` : ""})`
              : "";
            setOpenError(`${error.message}${location} [${error.code}]`);
          })
          .catch(() => undefined);
      });

    if (!window.location.hash) {
      window.location.replace("#/story");
    }
    const navigate = () => setPath(currentPath());
    window.addEventListener("hashchange", navigate);
    return () => window.removeEventListener("hashchange", navigate);
  }, []);

  const Page = PAGES[path] ?? StoryPage;

  function rememberStory(story: OpenedStory) {
    const next = [
      story,
      ...recentStories.filter((recent) => recent.path !== story.path),
    ].slice(0, MAX_RECENT_STORIES);
    setRecentStories(next);
    localStorage.setItem(RECENT_STORIES_KEY, JSON.stringify(next));
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

  if (hasStory === null) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!hasStory) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          <div className="mb-8 flex justify-end">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Languages className="size-4" />
              <span>{copy.language}</span>
              <select
                className="h-9 rounded-md border bg-background px-3 text-foreground shadow-xs"
                value={language}
                onChange={(event) =>
                  changeLanguage(event.target.value as Language)
                }
              >
                <option value="zh-CN">中文</option>
                <option value="en">English</option>
              </select>
            </label>
          </div>

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
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <HotReload />
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
          <Button
            type="button"
            variant="outline"
            onClick={handleOpenStory}
            disabled={opening}
          >
            <FolderOpen data-icon="inline-start" />
            {opening ? copy.opening : copy.openYaml}
          </Button>
        </div>
      </header>
      <PageErrorBoundary key={path}>
        <Suspense fallback={<PageLoading />}>
          <Page />
        </Suspense>
      </PageErrorBoundary>
    </div>
  );
}
