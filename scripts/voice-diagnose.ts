/** Bounded real WebRTC model comparison; retains numeric/command metadata, never speech text. */
import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { build } from "esbuild";
import { chromium } from "@playwright/test";
if (!process.env.OPENAI_API_KEY?.trim() || process.env.LIVE_AUDIO_TEST !== "1")
  throw Error("Explicit synthetic provider prerequisites missing");
mkdirSync("artifacts/voice/diagnose-client", { recursive: true });
await build({
  entryPoints: ["scripts/voice-diagnose/browser.ts"],
  bundle: true,
  platform: "browser",
  format: "iife",
  outfile: "artifacts/voice/diagnose-client/main.js",
  logLevel: "silent",
});
writeFileSync(
  "artifacts/voice/diagnose-client/index.html",
  '<button>Start synthetic diagnostic</button><script src="/main.js"></script>',
);
const results: unknown[] = [];
const fast = process.argv.includes("--fast");
for (const model of fast
  ? ["gpt-4o-mini-transcribe"]
  : ["gpt-4o-mini-transcribe", "gpt-4o-transcribe"]) {
  const server = spawn(
    process.execPath,
    ["--import", "tsx", "scripts/voice-diagnose/server.ts"],
    {
      env: {
        ...process.env,
        APP_ORIGIN: "http://localhost:5185",
        ALLOW_ADULT_VOICE_DEV: "true",
        DIAGNOSTIC_MODEL: model,
        DIAGNOSTIC_FAST: String(fast),
      },
      stdio: "ignore",
    },
  );
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    for (let i = 0; i < 40; i++) {
      try {
        if ((await fetch("http://localhost:5185/api/voice/status")).ok) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 250));
    }
    browser = await chromium.launch({
      args: [
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
        `--use-file-for-fake-audio-capture=${resolve("tests/voice/audio/fixture-05.wav")}`,
      ],
    });
    const page = await browser.newPage({ permissions: ["microphone"] });
    await page.goto("http://localhost:5185");
    await page.getByRole("button").click();
    await page.waitForFunction(
      () =>
        Boolean((window as any).__diagnose.snapshot().diagnostics.connected),
      {},
      { timeout: 45000 },
    );
    const begin = Date.now();
    for (let i = 0; i < 4; i++) {
      await new Promise((r) => setTimeout(r, 30000));
      console.log(
        JSON.stringify({
          model,
          seconds: Math.round((Date.now() - begin) / 1000),
        }),
      );
    }
    const result = {
      model,
      silenceMs: fast ? 150 : 300,
      prefixMs: fast ? 600 : 300,
      durationMs: Date.now() - begin,
      ...(await page.evaluate(() => (window as any).__diagnose.snapshot())),
    };
    results.push(result);
    await page.evaluate(() => (window as any).__diagnose.stop());
  } catch {
    results.push({
      model,
      status: "FAIL",
      reason:
        "Connection or bounded diagnostic failed; no provider payload retained",
    });
  } finally {
    await browser?.close();
    server.kill("SIGTERM");
    await new Promise((r) => server.once("exit", r));
    writeFileSync(
      `artifacts/voice/${fast ? "fast-vad" : "model"}-diagnostic.json`,
      JSON.stringify(
        {
          date: new Date().toISOString(),
          scope:
            "Two-minute repeated synthetic stop per model; actual WebRTC, no renewal or general accuracy claim",
          results,
        },
        null,
        2,
      ),
    );
  }
}
console.log("Bounded model diagnostics finished; browsers closed.");
