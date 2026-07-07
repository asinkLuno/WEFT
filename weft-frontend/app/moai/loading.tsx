export default function MoaiLoading() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="mx-auto max-w-7xl columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4 px-6 py-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="mb-4 break-inside-avoid">
            <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 animate-pulse">
              <div className="h-5 w-2/3 rounded bg-muted mb-2" />
              <div className="h-3 w-1/3 rounded bg-muted mb-3" />
              <div className="h-4 w-full rounded bg-muted mb-1" />
              <div className="h-4 w-4/5 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
