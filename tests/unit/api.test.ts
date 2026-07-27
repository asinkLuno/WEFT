import { afterEach, describe, expect, it } from "vitest";
import {
  getStory,
  onRefetch,
  openRecentStory,
  openStory,
  triggerRefetch,
} from "@/lib/api";
import { setPlatformAdapterForTests } from "@/lib/platform";
import { createPlatformMock } from "../mocks/platform";

afterEach(() => triggerRefetch());

describe("frontend API adapter", () => {
  it("deduplicates cached queries until a refetch", async () => {
    const platform = createPlatformMock({
      get_story: { title: "Earthsea" },
    });
    const restore = setPlatformAdapterForTests(platform);

    await Promise.all([getStory(), getStory()]);
    expect(platform.invoke).toHaveBeenCalledTimes(1);

    triggerRefetch();
    await getStory();
    expect(platform.invoke).toHaveBeenCalledTimes(2);
    restore();
  });

  it("routes file selection and recent files through replaceable IPC", async () => {
    const platform = createPlatformMock({
      open_story: { title: "WEFT", path: "/stories/weft.yml" },
      open_recent_story: { title: "Recent", path: "/stories/recent.yml" },
    });
    const restore = setPlatformAdapterForTests(platform);

    await openStory();
    await openRecentStory("/stories/recent.yml");

    expect(platform.invoke).toHaveBeenNthCalledWith(1, "open_story", undefined);
    expect(platform.invoke).toHaveBeenNthCalledWith(2, "open_recent_story", {
      path: "/stories/recent.yml",
    });
    restore();
  });

  it("notifies active refetch subscribers only", () => {
    let calls = 0;
    const unsubscribe = onRefetch(() => calls++);

    triggerRefetch();
    unsubscribe();
    triggerRefetch();

    expect(calls).toBe(1);
  });
});
