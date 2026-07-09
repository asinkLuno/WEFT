import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fetchJson, type Story } from "@/lib/api";

export default async function StoryPage() {
  const story = await fetchJson<Story>("/story");

  return (
    <main className="flex-1 px-6 py-8">
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{story.title}</CardTitle>
            <CardDescription>timeline mode: {story.date_mode}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {story.description && (
              <div className="prose prose-sm max-w-none text-muted-foreground">
                {story.description}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
