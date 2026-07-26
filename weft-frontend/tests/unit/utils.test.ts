import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("combines conditional classes", () => {
    expect(cn("base", false && "hidden", { active: true })).toBe("base active");
  });

  it("resolves conflicting Tailwind classes", () => {
    expect(cn("px-2 text-sm", "px-4")).toBe("text-sm px-4");
  });
});
