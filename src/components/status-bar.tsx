import { cn } from "cn";
import { Link2, Link2Off, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

export type LastLoad = { at: Date; refresh: boolean };

export function StatusBar({
  path,
  lastLoad,
}: {
  path: string | null;
  lastLoad: LastLoad | null;
}) {
  const { t, i18n } = useTranslation();
  // App language, not OS locale, so a Chinese UI never shows a US clock.
  const time =
    path && lastLoad ? lastLoad.at.toLocaleTimeString(i18n.language) : null;

  return (
    <footer className="sticky bottom-0 flex h-6 shrink-0 items-center gap-4 bg-primary px-3 text-xs text-primary-foreground">
      <span
        className="flex min-w-0 items-center gap-1.5"
        title={path ?? undefined}
      >
        {path ? (
          <Link2 className="size-3.5 shrink-0" />
        ) : (
          <Link2Off className="size-3.5 shrink-0" />
        )}
        <span className="truncate">{path ?? t("status.unbound")}</span>
      </span>

      {time && (
        <span
          role="status"
          className="ml-auto flex shrink-0 items-center gap-1.5"
        >
          {/* The changing key remounts the icon, which is what replays the animation. */}
          <RefreshCw
            key={lastLoad?.refresh ? lastLoad.at.getTime() : "loaded"}
            className={cn(
              "size-3.5",
              lastLoad?.refresh &&
                "animate-refresh-turn motion-reduce:animate-none",
            )}
          />
          {`${lastLoad?.refresh ? t("status.refreshed") : t("status.loaded")} ${time}`}
        </span>
      )}
    </footer>
  );
}
