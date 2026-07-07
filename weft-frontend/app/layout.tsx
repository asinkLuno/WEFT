import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="flex items-center gap-6 border-b border-border px-6 py-3">
          <a href="/" className="text-lg font-semibold tracking-wide">
            WEFT
          </a>
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
