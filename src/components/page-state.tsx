import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { COPY, initialLanguage } from "@/lib/i18n";

export function PageLoading() {
  const copy = COPY[initialLanguage()];
  return (
    <main
      className="flex flex-1 items-center justify-center px-6 py-12 text-muted-foreground"
      aria-busy="true"
      aria-label={copy.page_loading}
    >
      <LoaderCircle className="size-5 animate-spin" />
    </main>
  );
}

export function PageError({
  title,
  error,
}: {
  title?: string;
  error: unknown;
}) {
  const copy = COPY[initialLanguage()];
  const message = error instanceof Error ? error.message : String(error);
  const heading = title ?? copy.page_error_default;

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="max-w-md text-center" role="alert">
        <AlertCircle className="mx-auto size-8 text-destructive" />
        <h1 className="mt-4 text-lg font-semibold">{heading}</h1>
        <p className="mt-2 break-words text-sm text-muted-foreground">
          {message}
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-5"
          onClick={() => window.location.reload()}
        >
          {copy.page_retry}
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
          title={COPY[initialLanguage()].page_error_render}
          error={this.state.error}
        />
      );
    }
    return this.props.children;
  }
}
