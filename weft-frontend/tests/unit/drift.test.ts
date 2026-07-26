import { describe, expect, it } from "vitest";
import { compareDriftTime } from "@/app/drift/gantt";
import type { Drift } from "@/lib/api";

const driftAt = (...flatStart: number[]) =>
  ({ flat_start: flatStart }) as Drift;

describe("drift transformations", () => {
  it("sorts events lexicographically by normalized start time", () => {
    const events = [
      driftAt(2024, 3, 1),
      driftAt(2023, 12, 30),
      driftAt(2024, 1, 5),
    ];

    expect(
      events.toSorted(compareDriftTime).map((event) => event.flat_start),
    ).toEqual([
      [2023, 12, 30],
      [2024, 1, 5],
      [2024, 3, 1],
    ]);
  });
});
