import { chromium } from "@playwright/test";
import { habitats } from "../content/catalog";
import { mkdirSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import os from "node:os";
mkdirSync("artifacts/performance", { recursive: true });
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: [
    "--enable-gpu",
    "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream",
  ],
});
const page = await browser.newPage({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
});
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
const report: any = {
  date: new Date().toISOString(),
  build: readdirSync("artifacts/test-client/assets")
    .filter((name) => /\.(js|css)$/.test(name))
    .map((name) => ({
      file: name,
      sha256: createHash("sha256")
        .update(readFileSync(`artifacts/test-client/assets/${name}`))
        .digest("hex"),
    })),
  hardware: os.cpus()[0]?.model,
  os: os.release(),
  browser: browser.version(),
  mode: "headless installed Chrome with --enable-gpu; actual native adapter recorded in every sample",
  viewport: "1280x720 DPR 1 medium",
  microphone:
    "Synthetic browser device only for default local permission preflight; no cloud speech session",
  finished: false,
  tours: [],
  cycles: [],
  soak: [],
  errors,
  liveVoice:
    "Disabled explicitly on the benchmark server; actual provider fixtures are verified separately.",
};
const save = () =>
  writeFileSync(
    "artifacts/performance/report.json",
    JSON.stringify(report, null, 2),
  );
async function enter(name: string) {
  if (
    await page
      .getByRole("button", { name: "Ocean map", exact: true })
      .isVisible()
  ) {
    await page.getByRole("button", { name: "Ocean map", exact: true }).click();
  } else if (!(await page.locator(".destination").first().isVisible())) {
    await page.goto(process.env.TEST_URL || "http://localhost:5174");
  }
  await page.locator(".destination").filter({ hasText: name }).click();
  await page.getByRole("button", { name: "Start swimming" }).click();
  await page.locator(".loading").waitFor({ state: "hidden", timeout: 30000 });
  await page.waitForTimeout(1500);
}
const stats = () =>
  page.evaluate(() => ({
    ...(window as any).__mermaidia.stats(),
    audio: (window as any).__mermaidia.audioStats(),
    voice: (window as any).__mermaidia.voiceStats(),
    heapBytes: (performance as any).memory?.usedJSHeapSize,
    visibility: document.visibilityState,
  }));
try {
  save();
  const readiness = await (
    await page.request.get(
      (process.env.TEST_URL || "http://localhost:5174") + "/api/voice/status",
    )
  ).json();
  if (readiness.available)
    throw Error(
      "Run the benchmark server with ALLOW_ADULT_VOICE_DEV=false; real speech is measured separately.",
    );
  for (const h of habitats) {
    await enter(h.name);
    const adapter = (await stats()).renderer;
    if (/swiftshader|llvmpipe|software/i.test(adapter))
      throw Error("Native GPU is unavailable: " + adapter);
    await page.evaluate(() => (window as any).__mermaidia.resetStats());
    const begin = Date.now();
    for (let step = 0; step < 12; step++) {
      if (step === 4 || step === 8) await page.keyboard.press("Space");
      await page.keyboard.press(
        step % 4 === 0
          ? "ArrowUp"
          : step % 4 === 1
            ? "ArrowRight"
            : step % 4 === 2
              ? "e"
              : "s",
      );
      await page.waitForTimeout(5000);
    }
    const measured = await stats();
    const durationMs = Date.now() - begin;
    report.tours.push({
      habitat: h.id,
      durationMs,
      averageFps: (measured.frames * 1000) / durationMs,
      ...measured,
    });
    save();
  }
  for (let cycle = 0; cycle < 5; cycle++)
    for (const h of habitats) {
      await enter(h.name);
      report.cycles.push({ cycle, habitat: h.id, ...(await stats()) });
      save();
    }
  const begun = Date.now();
  let step = 0;
  while (Date.now() - begun < 600000) {
    const h = habitats[step % 5];
    await enter(h.name);
    await page.keyboard.press("?");
    if (await page.getByRole("dialog").isVisible())
      await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Discovery journal", exact: true })
      .click();
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Start listening", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .waitFor({ state: "visible", timeout: 10000 });
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Surface", exact: false }).click();
    await page.waitForTimeout(13000);
    await page.getByRole("button", { name: "Dive", exact: false }).click();
    await page.waitForTimeout(2500);
    await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(1000);
    await page.keyboard.press("s");
    report.soak.push({
      elapsedMs: Date.now() - begun,
      habitat: h.id,
      ...(await stats()),
    });
    save();
    step++;
  }
  report.soakDurationMs = Date.now() - begun;
  report.budgets = {
    frameTimeP95: report.tours.every((t: any) => t.p95 <= 33.3),
    sustainedFrameRate: report.tours.every((t: any) => t.averageFps >= 30),
    nativeRenderer: report.tours.every(
      (t: any) => !/swiftshader|llvmpipe|software/i.test(t.renderer),
    ),
    visibleSamples: [...report.tours, ...report.cycles, ...report.soak].every(
      (t: any) => t.visibility === "visible",
    ),
    drawCalls: report.tours.every((t: any) => t.calls <= 200),
    triangles: report.tours.every((t: any) => t.triangles <= 500000),
    cyclesStable: habitats.every((h) => {
      const samples = report.cycles.filter((c: any) => c.habitat === h.id);
      const first = samples[0],
        last = samples.at(-1);
      return (
        last.geometries <= first.geometries * 1.1 &&
        last.textures <= Math.max(1, first.textures) * 1.1 &&
        last.audio.activeSources <= Math.max(2, first.audio.activeSources)
      );
    }),
    noPageErrors: errors.length === 0,
  };
  report.voiceSoakLimit =
    "Cloud voice explicitly disabled for isolated rendering measurements. Each attempted listen opens setup. Actual provider fixtures and deterministic renewal tests are separate evidence.";
  report.finished = true;
  save();
  if (Object.values(report.budgets).some((passed) => !passed))
    process.exitCode = 1;
} finally {
  await browser.close();
  save();
}
