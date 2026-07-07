import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const BACKEND = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

interface StoryData {
  title: string;
  summary: string | null;
  description: string | null;
  date_mode: string;
}

async function getStory(): Promise<StoryData> {
  const res = await fetch(`${BACKEND}/story`, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`/story returned ${res.status}`);
  return res.json();
}

export default async function StoryPage() {
  const story = await getStory();

  return (
    <main className="flex-1 px-6 py-8">
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{story.title}</CardTitle>
            <CardDescription>timeline mode: {story.date_mode}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {story.summary && (
              <p className="text-base text-muted-foreground leading-relaxed">
                {story.summary}
              </p>
            )}
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
