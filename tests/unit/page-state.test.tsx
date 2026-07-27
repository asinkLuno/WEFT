import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageError, PageLoading } from "@/components/page-state";

describe("page state", () => {
  it("exposes loading state accessibly", () => {
    render(<PageLoading />);

    expect(screen.getByLabelText("Loading")).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  it("shows an error with a retry action", () => {
    render(<PageError title="Could not load" error={new Error("broken")} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Could not load");
    expect(screen.getByRole("alert")).toHaveTextContent("broken");
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
  });
});
