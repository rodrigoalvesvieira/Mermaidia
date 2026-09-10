import { test, expect } from "@playwright/test";
import { start, snapshot } from "./helpers";
import { habitats } from "../content/catalog";
for (const h of habitats)
  test(`${h.name}: all three starting spots and recoverable play`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (let i = 0; i < 3; i++) {
      await start(page, h.name, i);
      const state = await snapshot(page);
      expect(state.habitatId).toBe(h.id);
      expect(state.spawnId).toBe(h.spawns[i].id);
      expect(state.position.every(Number.isFinite)).toBe(true);
      await page
        .getByRole("button", { name: "Swim forward", exact: true })
        .click();
      await page.waitForTimeout(400);
      await page
        .getByRole("button", { name: "Stop swimming", exact: true })
        .click();
      expect((await snapshot(page)).motion).toBe("hover");
      await page
        .getByRole("button", { name: "Ocean map", exact: true })
        .click();
    }
    expect(errors).toEqual([]);
  });
test("keyboard movement, turns, lateral, surface, dive, return, actual question key and persistence", async ({
  page,
}) => {
  await start(page);
  const initial = await snapshot(page);
  await page.keyboard.press("?");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".discovery-text h2")).not.toBeEmpty();
  expect((await snapshot(page)).motion).toBe("hover");
  await page.getByRole("button", { name: "Hear about me" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.keyboard.press("ArrowUp");
  await page.waitForTimeout(900);
  expect((await snapshot(page)).position[2]).toBeLessThan(
    initial.position[2] - 0.3,
  );
  await page.keyboard.press("Space");
  expect((await snapshot(page)).speed).toBe(1);
  expect((await snapshot(page)).motion).toBe("forward");
  await page.keyboard.press("Space");
  await page.keyboard.press("Space");
  expect((await snapshot(page)).speed).toBe(2);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(700);
  expect((await snapshot(page)).heading).toBeGreaterThan(0.4);
  await page.keyboard.press("s");
  const stop = await snapshot(page);
  await page.waitForTimeout(250);
  expect((await snapshot(page)).position).toEqual(stop.position);
  await page.keyboard.press("e");
  await page.waitForTimeout(1600);
  expect((await snapshot(page)).motion).toBe("hover");
  await page.getByRole("button", { name: "Swim faster" }).click();
  expect((await snapshot(page)).speed).toBe(2);
  expect((await snapshot(page)).motion).toBe("hover");
  await page.keyboard.press("Space");
  expect((await snapshot(page)).motion).toBe("hover");
  await page.getByRole("button", { name: "Surface", exact: false }).click();
  await expect
    .poll(async () => (await snapshot(page)).surface, { timeout: 20000 })
    .toBe(true);
  await page.getByRole("button", { name: "Dive", exact: false }).click();
  await expect.poll(async () => (await snapshot(page)).surface).toBe(false);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByRole("button", { name: "Take me back to the start" }).click();
  expect((await snapshot(page)).position).toEqual(initial.position);
  await page
    .getByRole("button", { name: "Discovery journal", exact: true })
    .click();
  await expect(page.locator(".journal-grid button")).toHaveCount(1);
  await page.reload();
  await page.getByRole("button", { name: /Your discovery journal/ }).click();
  await expect(page.locator(".journal-grid button")).toHaveCount(1);
});
