import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AppEvents } from "@/app/app-events";
import { onRefetch } from "@/lib/api";
import { setPlatformAdapterForTests } from "@/lib/platform";
import { createPlatformMock } from "../mocks/platform";

describe("native app events", () => {
  it("invalidates data after reload and displays structured errors", async () => {
    const platform = createPlatformMock();
    const restore = setPlatformAdapterForTests(platform);
    const refetch = vi.fn();
    const onFileLost = vi.fn();
    const unsubscribe = onRefetch(refetch);
    render(<AppEvents onFileLost={onFileLost} language="en" />);

    await act(async () => undefined);
    act(() => platform.dispatch("weft-file-lost", { path: "/gone/story.yml" }));
    expect(onFileLost).toHaveBeenCalledWith("/gone/story.yml");

    act(() => platform.dispatch("weft-reloaded", { story_title: "Gethen" }));
    expect(refetch).toHaveBeenCalledOnce();
    expect(screen.getByRole("status")).toHaveTextContent("Story reloaded at");

    act(() =>
      platform.dispatch("weft-error", {
        error: {
          code: "STORY_NOT_LOADED",
          stage: "load",
          path_display: "drift.arrival",
          line: 12,
          column: 4,
        },
      }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("No story loaded");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "drift.arrival · line 12:4",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Open a WEFT story file in the desktop app first",
    );

    await userEvent.click(
      within(screen.getByRole("alert")).getByRole("button", {
        name: "Dismiss",
      }),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    unsubscribe();
    restore();
  });
});
