import { test as base } from "@playwright/test";

const drift = {
  id: "crossing",
  title: "Crossing the Gobrin Ice",
  start_time: { base_time: [1, 1, 1], ref_time: null },
  end_time: null,
  description: "A milestone in the journey.",
  moais: ["genly"],
  flat_start: [1, 1, 1],
  flat_end: null,
  start_tick: 1,
  end_tick: null,
  start_time_display: "1/1/1",
  end_time_display: null,
};

const responses = {
  get_story: {
    title: "The Left Hand of Darkness",
    description: "A test story loaded through the browser platform adapter.",
    date_mode: "gethen",
  },
  get_calendar_metadata: {
    name: "gethen",
    title: "Karhide Calendar",
    description: "The calendar used by the isolated Playwright fixture.",
    units: ["year", "month", "day"],
    source: "plugin",
  },
  get_moai: {
    genly: {
      name: "Genly Ai",
      base_time: null,
      description: "Envoy of the Ekumen",
      materials: [],
      extra_props: null,
      journal: {},
      base_time_display: null,
    },
  },
  get_drift: { journey: [drift] },
  get_narrative: {
    journey: {
      subject: ["genly"],
      observer: "genly",
      drifts: [drift],
    },
  },
  get_moai_link: {
    nodes: [{ id: "genly", name: "Genly Ai" }],
    links: [],
  },
};

export const test = base.extend<{ nativeFixture: void }>({
  nativeFixture: [
    async ({ page }, use) => {
      await page.addInitScript((fixtureResponses) => {
        const handlers = new Map<
          string,
          Set<(event: { payload: unknown }) => void>
        >();
        const openedStory = {
          title: "The Left Hand of Darkness",
          path: "/fixtures/gethen.yml",
        };

        Object.defineProperty(globalThis, "__WEFT_PLATFORM_ADAPTER__", {
          configurable: true,
          value: {
            async invoke(command: string, args?: { path?: string }) {
              switch (command) {
                case "has_story":
                  return sessionStorage.getItem("weft.e2e.story") === "open";
                case "open_story":
                  sessionStorage.setItem("weft.e2e.story", "open");
                  return openedStory;
                case "open_recent_story":
                  sessionStorage.setItem("weft.e2e.story", "open");
                  return {
                    ...openedStory,
                    path: args?.path ?? openedStory.path,
                  };
                case "close_story":
                  sessionStorage.removeItem("weft.e2e.story");
                  return undefined;
                case "get_load_error":
                  return null;
                case "get_app_state":
                  return {
                    story_path: openedStory.path,
                    story_title: openedStory.title,
                    last_reload_at: null,
                  };
                default:
                  return fixtureResponses[
                    command as keyof typeof fixtureResponses
                  ];
              }
            },
            async listen(
              event: string,
              handler: (event: { payload: unknown }) => void,
            ) {
              const listeners = handlers.get(event) ?? new Set();
              listeners.add(handler);
              handlers.set(event, listeners);
              return () => listeners.delete(handler);
            },
            async emit() {},
            async openUrl() {},
          },
        });
      }, responses);

      await use();
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
