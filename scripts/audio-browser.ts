import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const origin = "http://localhost:5181";
const server = spawn(process.execPath, ["--import", "tsx", "server/index.ts"], {
  env: {
    ...process.env,
    PORT: "5181",
    APP_ORIGIN: origin,
    ALLOW_ADULT_VOICE_DEV: "false",
  },
  stdio: "ignore",
});
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
mkdirSync("artifacts/audio", { recursive: true });
try {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`${origin}/api/health`)).ok) break;
    } catch {
      /* server startup */
    }
    if (i === 59) throw Error("Server did not start");
    await sleep(500);
  }
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.addInitScript("globalThis.__name = (fn) => fn");
    await page.goto(origin);
    const assets = JSON.parse(
      readFileSync("assets/manifests/audio.json", "utf8"),
    ) as { id: string; localPath: string }[];
    const result = await page.evaluate(async (assets) => {
      const context = new AudioContext();
      const decoded = [];
      for (const a of assets) {
        const response = await fetch(a.localPath.replace(/^public/, ""));
        if (!response.ok) throw Error("Missing " + a.id);
        const b = await context.decodeAudioData(await response.arrayBuffer());
        decoded.push({
          id: a.id,
          seconds: b.duration,
          channels: b.numberOfChannels,
        });
      }
      await context.close();
      const modulePath = "/src/audio/AudioMixer.ts";
      const { AudioMixer } = await import(/* @vite-ignore */ modulePath);
      const mixer = new AudioMixer();
      const narrationEvents: boolean[] = [];
      const errors: string[] = [];
      mixer.onNarrating = (v: boolean) => narrationEvents.push(v);
      mixer.onError = (e: string) => errors.push(e);
      await mixer.unlock();
      const settle = async () => {
        const start = Date.now();
        while (mixer.diagnostics.loops !== 2 && Date.now() - start < 5000)
          await new Promise((r) => setTimeout(r, 20));
      };
      await settle();
      const baseline = mixer.diagnostics;
      const cycles = [];
      for (let cycle = 0; cycle < 5; cycle++)
        for (const theme of ["reef", "caribbean", "ice", "wreck", "deep"]) {
          mixer.setHabitat(theme);
          await settle();
          mixer.setSurface(true);
          mixer.setSurface(false);
          cycles.push({ ...mixer.diagnostics });
        }
      await mixer.narrate("narration-welcome");
      const during = mixer.diagnostics;
      mixer.stopNarration();
      const afterNarration = mixer.diagnostics;
      mixer.dispose();
      const disposed = mixer.diagnostics;
      return {
        decoded,
        baseline,
        cycles,
        during,
        afterNarration,
        disposed,
        narrationEvents,
        errors,
      };
    }, assets);
    const ok =
      result.decoded.length === assets.length &&
      result.cycles.every(
        (c) => c.activeSources === 2 && c.loops === 2 && c.buffers <= 20,
      ) &&
      result.during.speaking &&
      result.during.activeSources === 3 &&
      result.afterNarration.activeSources === 2 &&
      !result.afterNarration.speaking &&
      result.disposed.activeSources === 0 &&
      result.disposed.buffers === 0 &&
      result.errors.length === 0;
    writeFileSync(
      "artifacts/audio/browser-report.json",
      JSON.stringify(
        {
          date: new Date().toISOString(),
          browser: browser.version(),
          status: ok ? "PASS" : "FAIL",
          method:
            "Actual Chromium Web Audio decode and mixer lifecycle; no auditory review claim",
          ...result,
        },
        null,
        2,
      ) + "\n",
    );
    if (!ok) throw Error("Audio browser gate failed");
    console.log(
      `Decoded ${assets.length} shipped WAV files. Five habitat cycles and narration teardown passed.`,
    );
  } finally {
    await browser.close();
  }
} finally {
  server.kill("SIGTERM");
}
