export default function StoryLoading() {
  return (
    <main className="flex-1 px-6 py-8">
      <div className="mx-auto max-w-3xl animate-pulse">
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-6 space-y-4">
          <div className="h-7 w-1/3 rounded bg-muted" />
          <div className="h-4 w-1/4 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-4/5 rounded bg-muted" />
        </div>
      </div>
    </main>
  );
}
