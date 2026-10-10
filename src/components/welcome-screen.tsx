import {
  ChevronRight,
  Clock,
  FileText,
  FolderOpen,
  ScrollText,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Split on both separators so a Windows path does not come back whole.
function splitPath(path: string) {
  const parts = path.split(/[\\/]/);
  return { name: parts.pop() ?? path, dir: parts.join("/") };
}

export function WelcomeScreen({
  recent,
  onOpen,
}: {
  recent: string[];
  onOpen: (path?: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <header className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <ScrollText className="size-6" />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">weft</h1>
          <p className="text-sm text-muted-foreground">{t("tagline")}</p>
        </div>
        <Button size="lg" className="mt-1" onClick={() => onOpen()}>
          <FolderOpen />
          {t("openFile")}
        </Button>
      </header>

      <Card className="w-full max-w-md gap-3 py-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Clock className="size-4 text-muted-foreground" />
            {t("recentFiles")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <div className="flex flex-col items-center gap-1 py-6 text-center">
              <p className="text-sm text-muted-foreground">
                {t("noRecentFiles")}
              </p>
              <p className="text-xs text-muted-foreground">{t("yamlOnly")}</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-1">
              {recent.map((path) => {
                const { name, dir } = splitPath(path);
                return (
                  <li key={path}>
                    <Button
                      type="button"
                      variant="ghost"
                      className="group h-auto w-full justify-start gap-3 py-1.5 text-left font-normal"
                      title={path}
                      onClick={() => onOpen(path)}
                    >
                      <FileText className="size-4 text-muted-foreground" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-medium leading-tight">
                          {name}
                        </span>
                        <span className="truncate text-xs leading-tight text-muted-foreground">
                          {dir}
                        </span>
                      </span>
                      <ChevronRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
