"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageError, PageLoading } from "@/components/page-state";
import { getStory, onRefetch, type Story } from "@/lib/api";

export default function StoryPage() {
  const [story, setStory] = useState<Story | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      getStory()
        .then((data) => !cancelled && setStory(data))
        .catch((err) => !cancelled && setError(err));
    };
    load();
    const off = onRefetch(load);
    return () => {
      cancelled = true;
      off();
    };
  }, []);

  if (error) return <PageError title="Failed to load story" error={error} />;
  if (!story) return <PageLoading />;

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
