import { useEffect, useState } from "react";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import DriftPage from "@/app/drift/page";
import { HotReload } from "@/app/hot-reload";
import MoaiLinkPage from "@/app/moai-link/page";
import MoaiPage from "@/app/moai/page";
import NarrativePage from "@/app/narrative/page";
import StoryPage from "@/app/story/page";

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

  useEffect(() => {
    if (!window.location.hash) {
      window.location.replace("#/story");
    }
    const navigate = () => setPath(currentPath());
    window.addEventListener("hashchange", navigate);
    return () => window.removeEventListener("hashchange", navigate);
  }, []);

  const Page = PAGES[path] ?? StoryPage;

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
      </header>
      <Page />
    </div>
  );
}
