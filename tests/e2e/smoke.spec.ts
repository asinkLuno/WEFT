import { expect, test } from "./fixtures";

test("starts without leaking story state between tests", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("WEFT");
  await expect(
    page.getByRole("heading", { name: "Open a WEFT story" }),
  ).toBeVisible();
  await expect(page.getByText("No recently opened stories yet")).toBeVisible();
});

test("opens an isolated story fixture", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Choose YAML file" }).click();

  await expect(
    page.getByText("The Left Hand of Darkness", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Karhide Calendar", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("gethen", { exact: true })).toBeVisible();
});

test("navigates through the key story views", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Choose YAML file" }).click();
  await expect(
    page.getByText("The Left Hand of Darkness", { exact: true }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Moai", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Moai" })).toBeVisible();
  await expect(page.getByText("Genly Ai", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Drift", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Drift" })).toBeVisible();
  await expect(
    page.getByText("Crossing the Gobrin Ice", { exact: true }).first(),
  ).toBeVisible();

  await page.getByRole("link", { name: "Narrative", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Narrative" })).toBeVisible();
  await expect(page.getByText("Observer: genly")).toBeVisible();
});

test("keeps narrow navigation usable and marks the current page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Choose YAML file" }).click();

  await expect(page.getByRole("link", { name: "Story" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
