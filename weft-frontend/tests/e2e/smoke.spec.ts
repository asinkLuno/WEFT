import { expect, test } from "@playwright/test";

test("loads the WEFT shell", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("WEFT");
  await expect(page.locator("#root")).not.toBeEmpty();
});
