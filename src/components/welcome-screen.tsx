import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function WelcomeScreen({
  recent,
  onOpen,
}: {
  recent: string[];
  onOpen: (path: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <>
      <h1 className="text-2xl font-semibold">weft</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("recentFiles")}</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("noRecentFiles")}
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {recent.map((path) => (
                <li key={path}>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-start font-normal"
                    onClick={() => onOpen(path)}
                  >
                    {path}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
