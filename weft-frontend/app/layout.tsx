import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { HotReload } from "./hot-reload";
import "./globals.css";
import { BACKEND } from "@/lib/api";

export const metadata: Metadata = {
  title: "WEFT",
  description: "WEFT",
};

const NAV_ITEMS = [
  { label: "story", href: "/story" },
  { label: "moai", href: "/moai" },
  { label: "moai link", href: "/moai-link" },
  { label: "drift", href: "/drift" },
  { label: "narrative", href: "/narrative" },
] as const;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <HotReload backend={BACKEND} />
        <header className="flex items-center gap-6 border-b border-border px-6 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold tracking-wide"
          >
            <Image src="/logo-icon.svg" alt="WEFT" width={20} height={20} />
            WEFT
          </Link>
          <NavigationMenu>
            <NavigationMenuList className="gap-1">
              {NAV_ITEMS.map((item) => (
                <NavigationMenuItem key={item.href}>
                  <NavigationMenuLink href={item.href}>
                    {item.label}
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </header>
        {children}
      </body>
    </html>
  );
}
