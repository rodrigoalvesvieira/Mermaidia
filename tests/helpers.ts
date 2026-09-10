import { expect, type Page } from "@playwright/test";
export async function start(
  page: Page,
  name = "Great Barrier Reef",
  index = 0,
  visual = false,
) {
  await page.goto(visual ? "/?visual=1" : "/");
  await page.locator(".destination").filter({ hasText: name }).click();
  await page.locator(".start-card").nth(index).click();
  await page.getByRole("button", { name: "Start swimming" }).click();
  await expect(page.locator(".loading")).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => (window as any).__mermaidia?.ready()))
    .toBe(true);
  await page.waitForTimeout(200);
}
export const snapshot = (page: Page) =>
  page.evaluate(() => (window as any).__mermaidia.snapshot());
