import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PageLoading() {
  return (
    <main
      className="flex flex-1 items-center justify-center px-6 py-12 text-muted-foreground"
      aria-busy="true"
      aria-label="Loading"
    >
      <LoaderCircle className="size-5 animate-spin" />
    </main>
  );
}

export function PageError({
  title = "Failed to load this page",
  error,
}: {
  title?: string;
  error: unknown;
}) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="max-w-md text-center" role="alert">
        <AlertCircle className="mx-auto size-8 text-destructive" />
        <h1 className="mt-4 text-lg font-semibold">{title}</h1>
        <p className="mt-2 break-words text-sm text-muted-foreground">
          {message}
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-5"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    </main>
  );
}

export class PageErrorBoundary extends Component<
  { children: ReactNode },
  { error: unknown }
> {
  state: { error: unknown } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("failed to render page", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <PageError
          title="Failed to render this page"
          error={this.state.error}
        />
      );
    }
    return this.props.children;
  }
}
