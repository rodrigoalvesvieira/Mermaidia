import { test, expect } from "@playwright/test";
import { start, snapshot } from "./helpers";
import { habitats } from "../content/catalog";
import fs from "node:fs";
test("deterministic scene captures and rendered controls", async ({ page }) => {
  test.setTimeout(180000);
  const renderingErrors: string[] = [];
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /shader|WebGL|GL_INVALID/i.test(message.text())
    )
      renderingErrors.push(message.text());
  });
  fs.mkdirSync("artifacts/visual", { recursive: true });
  await page.goto("/");
  await page.screenshot({ path: "artifacts/visual/map.png", fullPage: true });
  for (const h of habitats) {
    await start(page, h.name, 0, true);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `artifacts/visual/${h.id}-underwater.png` });
    await page.getByRole("button", { name: "Surface", exact: false }).click();
    await expect
      .poll(async () => (await snapshot(page)).surface, { timeout: 25000 })
      .toBe(true);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `artifacts/visual/${h.id}-surface.png` });
    await start(page, h.name, 2, true);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `artifacts/visual/${h.id}-landmark.png` });
  }
  await start(page, "Australian coast", 0, true);
  await page.screenshot({
    path: "artifacts/visual/elise-closeup.png",
    clip: { x: 390, y: 230, width: 350, height: 390 },
  });
  await page.keyboard.press("?");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.screenshot({ path: "artifacts/visual/discovery.png" });
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Discovery journal", exact: true })
    .click();
  await page.screenshot({ path: "artifacts/visual/journal.png" });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByRole("button", { name: "Sound & settings" }).click();
  await page.getByLabel("Picture detail").selectOption("low");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.locator(".loading")).toHaveCount(0);
  await page.screenshot({ path: "artifacts/visual/low-quality.png" });
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.screenshot({ path: "artifacts/visual/tablet.png" });
  await page.route("**/assets/models/elise.glb", async (route) => {
    await new Promise((r) => setTimeout(r, 2000));
    await route.continue();
  });
  await page.goto("/?visual=1");
  await page.locator(".destination").first().click();
  await page.getByRole("button", { name: "Start swimming" }).click();
  await expect(
    page.getByRole("heading", { name: "A little ocean is waking up…" }),
  ).toBeVisible();
  await page.screenshot({ path: "artifacts/visual/loading.png" });
  expect(renderingErrors).toEqual([]);
});
