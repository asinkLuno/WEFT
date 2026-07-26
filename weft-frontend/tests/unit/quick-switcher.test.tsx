import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { QuickSwitcher } from "@/components/quick-switcher";

describe("quick switcher", () => {
  it("filters recent stories and picks the first match with Enter", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(
      <QuickSwitcher
        open
        onClose={() => undefined}
        recent={[
          { title: "Earthsea", path: "/stories/earthsea.yml" },
          { title: "Gethen", path: "/stories/gethen.yml" },
        ]}
        onPick={onPick}
        language="en"
      />,
    );

    const search = screen.getByPlaceholderText("Search recent stories…");
    await user.type(search, "geth{Enter}");

    expect(screen.queryByText("Earthsea")).not.toBeInTheDocument();
    expect(onPick).toHaveBeenCalledWith({
      title: "Gethen",
      path: "/stories/gethen.yml",
    });
  });
});
