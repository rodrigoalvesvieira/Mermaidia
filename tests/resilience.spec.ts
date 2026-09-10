import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { start, snapshot } from "./helpers";
test("no audio transmission before opt-in; server refuses child cloud and offline still moves", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (r) => {
    if (/voice\/(enable|session|interpret)|openai\.com/.test(r.url()))
      requests.push(r.url());
  });
  await start(page);
  expect(requests).toEqual([]);
  await page
    .getByRole("button", { name: "Start listening", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("Voice is how we explore")).toBeVisible();
  await page.keyboard.press("Escape");
  expect(requests).toEqual([]);
  await page.context().setOffline(true);
  await page.keyboard.press("ArrowUp");
  await page.waitForTimeout(300);
  expect((await snapshot(page)).motion).toBe("forward");
  await page.keyboard.press("s");
  await page.context().setOffline(false);
});
test("recover missing GLB and context loss with retry", async ({ page }) => {
  await page.route("**/assets/models/elise.glb", (route) => route.abort());
  await page.goto("/");
  await page.locator(".destination").first().click();
  await page.getByRole("button", { name: "Start swimming" }).click();
  await expect(
    page.getByRole("heading", { name: "Let’s try again" }),
  ).toBeVisible();
  await page.unroute("**/assets/models/elise.glb");
  await page.getByRole("button", { name: "Open the ocean again" }).click();
  await expect(page.locator(".loading")).toHaveCount(0);
  await page.evaluate(() => (window as any).__mermaidia.loseContext());
  await expect(
    page.getByRole("heading", { name: "Let’s try again" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open the ocean again" }).click();
  await expect(page.locator(".loading")).toHaveCount(0);
});
test("tablet, reduced motion, focus, corrupt save and accessible menu/card", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() =>
    localStorage.setItem("mermaidia-v1", "{invalid"),
  );
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/");
  expect(
    (await new AxeBuilder({ page }).analyze()).violations.filter((v) =>
      ["critical", "serious"].includes(v.impact || ""),
    ),
  ).toEqual([]);
  await page.getByRole("button", { name: "Grown-up settings" }).click();
  await expect(page.getByLabel("Reduce decorative motion")).toBeChecked();
  await page.keyboard.press("Escape");
  await page.locator(".destination").first().click();
  await page.getByRole("button", { name: "Start swimming" }).click();
  await expect(page.locator(".loading")).toHaveCount(0);
  await page.keyboard.press("?");
  await expect(page.getByRole("dialog")).toBeVisible();
  const audit = await new AxeBuilder({ page }).analyze();
  expect(
    audit.violations.filter((v) =>
      ["critical", "serious"].includes(v.impact || ""),
    ),
  ).toEqual([]);
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() =>
      Boolean(document.activeElement?.closest("dialog")),
    ),
  ).toBe(true);
});
test("pausing and changing destinations clear pending movement", async ({
  page,
}) => {
  await start(page);
  await page.keyboard.press("ArrowUp");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  expect((await snapshot(page)).motion).toBe("hover");
  await page.getByRole("button", { name: "Keep swimming" }).click();
  expect((await snapshot(page)).motion).toBe("hover");
  await page.getByRole("button", { name: "Ocean map", exact: true }).click();
  await page.locator(".destination").filter({ hasText: "Antarctica" }).click();
  await page.getByRole("button", { name: "Start swimming" }).click();
  await expect(page.locator(".loading")).toHaveCount(0);
  expect((await snapshot(page)).motion).toBe("hover");
});
