import { lazy, Suspense, useEffect, useState } from "react";
import { FileText, FolderOpen } from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { HotReload } from "@/app/hot-reload";
import { getStory, openStory } from "@/lib/api";

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

function currentPath() {
  return window.location.hash.slice(1) || "/story";
}

export function App() {
  const [path, setPath] = useState(currentPath);
  const [hasStory, setHasStory] = useState<boolean | null>(null);
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);

  useEffect(() => {
    getStory()
      .then(() => setHasStory(true))
      .catch(() => setHasStory(false));

    if (!window.location.hash) {
      window.location.replace("#/story");
    }
    const navigate = () => setPath(currentPath());
    window.addEventListener("hashchange", navigate);
    return () => window.removeEventListener("hashchange", navigate);
  }, []);

  const Page = PAGES[path] ?? StoryPage;

  async function handleOpenStory() {
    setOpening(true);
    setOpenError(null);
    try {
      const title = await openStory();
      if (title !== null) {
        window.location.hash = "/story";
        window.location.reload();
      }
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
        <div className="w-full max-w-md text-center">
          <img
            src="/logo-icon.svg"
            alt="WEFT"
            width={40}
            height={40}
            className="mx-auto mb-6"
          />
          <h1 className="text-2xl font-semibold tracking-tight">
            打开一个 WEFT 故事
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            选择 YAML 文件后，即可查看故事、墨埃、漂移和叙事时间线。
          </p>
          <div className="mt-8 rounded-xl border border-dashed bg-card/50 px-8 py-10">
            <FileText className="mx-auto mb-4 size-10 text-muted-foreground" />
            <p className="mb-5 text-sm text-muted-foreground">
              支持 .yaml 和 .yml 文件
            </p>
            <Button
              type="button"
              size="lg"
              onClick={handleOpenStory}
              disabled={opening}
            >
              <FolderOpen data-icon="inline-start" />
              {opening ? "正在打开…" : "选择 YAML 文件"}
            </Button>
          </div>
          {openError && (
            <p className="mt-4 text-sm text-destructive" role="alert">
              打开失败：{openError}
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
              打开失败：{openError}
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={handleOpenStory}
            disabled={opening}
          >
            <FolderOpen data-icon="inline-start" />
            {opening ? "正在打开…" : "打开 YAML"}
          </Button>
        </div>
      </header>
      <Suspense fallback={<main className="flex-1 px-6 py-8" />}>
        <Page />
      </Suspense>
    </div>
  );
}
