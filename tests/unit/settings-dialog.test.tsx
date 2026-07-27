import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SettingsDialog } from "@/components/settings-dialog";
import { setPlatformAdapterForTests } from "@/lib/platform";
import { createPlatformMock } from "../mocks/platform";

describe("settings dialog", () => {
  it("changes language and opens docs through the platform adapter", async () => {
    const user = userEvent.setup();
    const onLanguageChange = vi.fn();
    const platform = createPlatformMock();
    const restore = setPlatformAdapterForTests(platform);
    const trigger = document.body.appendChild(document.createElement("button"));
    trigger.focus();
    const { unmount } = render(
      <SettingsDialog
        open
        onClose={() => undefined}
        language="zh-CN"
        onLanguageChange={onLanguageChange}
      />,
    );

    const dialog = screen.getByRole("dialog");
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));
    const close = screen.getByRole("button", { name: "关闭" });
    close.focus();
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(screen.getByRole("button", { name: "完成" })).toHaveFocus();

    await user.selectOptions(screen.getByRole("combobox"), "en");
    expect(onLanguageChange).toHaveBeenCalledWith("en");

    await user.click(screen.getByRole("button", { name: "查看 MCP 配置文档" }));
    expect(platform.openUrl).toHaveBeenCalledWith(
      "https://asinkluno.github.io/WEFT/mcp/",
    );
    unmount();
    expect(trigger).toHaveFocus();
    trigger.remove();
    restore();
  });
});
