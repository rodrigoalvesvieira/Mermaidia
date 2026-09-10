/** Actual ten-minute audio-only provider renewal test. No clock mocking or WebGL. */
import "dotenv/config";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import { chromium } from "@playwright/test";
const output = "artifacts/voice";
const clientDir = `${output}/soak-client`;
mkdirSync(clientDir, { recursive: true });
await build({
  entryPoints: ["scripts/voice-soak/browser.ts"],
  bundle: true,
  platform: "browser",
  format: "iife",
  target: "es2022",
  outfile: `${clientDir}/soak.js`,
  sourcemap: false,
  logLevel: "silent",
});
writeFileSync(
  `${clientDir}/index.html`,
  `<!doctype html><html lang="en"><meta charset="utf-8"><title>Mermaidia synthetic voice renewal check</title><h1>Synthetic audio renewal check</h1><button id="start">Start synthetic voice test</button><button id="stop">Stop listening</button><output>off</output><script src="/soak.js"></script></html>`,
);
if (process.argv.includes("--prepare-only")) {
  console.log(
    "Audio-only harness bundled; no server, microphone or provider session started.",
  );
} else {
  const report: any = {
    date: new Date().toISOString(),
    status: "BLOCKED",
    durationTargetMs: 600_000,
    scope:
      "Actual ten-minute synthetic-microphone continuity and nine-minute renewal, not a twenty-minute or child-speech test",
    implementation:
      "Real VoiceController and registerVoiceRoutes; no mocked clock, transcript injection, Three.js or WebGL",
    prerequisites: [],
    samples: [],
    apiResponses: [],
    pageErrorCount: 0,
    consoleErrorCount: 0,
  };
  const save = () =>
    writeFileSync(
      `${output}/soak-report.json`,
      JSON.stringify(report, null, 2) + "\n",
    );
  if (!process.env.OPENAI_API_KEY?.trim())
    report.prerequisites.push("Server key absent");
  if (process.env.LIVE_AUDIO_TEST !== "1")
    report.prerequisites.push(
      "LIVE_AUDIO_TEST=1 required for actual synthetic provider audio",
    );
  if (report.prerequisites.length) {
    save();
    process.exitCode = 2;
    console.log("Voice soak BLOCKED; no provider session started.");
  } else {
    const fixtures = JSON.parse(
      readFileSync("tests/voice/audio-fixtures.json", "utf8"),
    );
    const fixture = fixtures.find(
      (f: any) =>
        f.id === "fixture-05" &&
        f.expected?.length === 1 &&
        f.expected[0].type === "stop",
    );
    if (!fixture) throw Error("Expected original stop fixture unavailable");
    report.fixture = {
      id: fixture.id,
      path: fixture.path,
      sha256: createHash("sha256")
        .update(readFileSync(fixture.path))
        .digest("hex"),
      source: "Original synthetic formant speech, no human recording",
    };
    const port = Number(process.env.VOICE_SOAK_PORT || 5184);
    const origin = `http://localhost:${port}`;
    const server = spawn(
      process.execPath,
      ["--import", "tsx", "scripts/voice-soak/server.ts"],
      {
        env: {
          ...process.env,
          PORT: String(port),
          APP_ORIGIN: origin,
          ALLOW_ADULT_VOICE_DEV: "true",
          VOICE_FIXTURE_RUN: "true",
        },
        stdio: "ignore",
      },
    );
    let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
    let runStarted = 0;
    let phase = "server readiness";
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    try {
      let ready = false;
      for (let i = 0; i < 60; i++) {
        try {
          if ((await fetch(`${origin}/api/health`)).ok) {
            ready = true;
            break;
          }
        } catch {
          /* bounded poll */
        }
        await sleep(250);
      }
      if (!ready) throw Error("Server readiness failed");
      const readiness = await (
        await fetch(`${origin}/api/voice/status`)
      ).json();
      report.models = {
        transcription: readiness.transcriptionModel,
        interpretation: readiness.astraModel,
      };
      if (!readiness.available) throw Error("Adult fixture mode unavailable");
      phase = "provider connection";
      browser = await chromium.launch({
        headless: true,
        args: [
          "--use-fake-device-for-media-stream",
          "--use-fake-ui-for-media-stream",
          `--use-file-for-fake-audio-capture=${resolve(fixture.path)}`,
        ],
      });
      report.browser = browser.version();
      const page = await browser.newPage({
        permissions: ["microphone"],
        viewport: { width: 640, height: 360 },
      });
      page.on("pageerror", () => report.pageErrorCount++);
      page.on("console", (message) => {
        if (message.type() === "error") report.consoleErrorCount++;
      });
      page.on("response", (response) => {
        const url = new URL(response.url());
        if (url.origin === origin && url.pathname.startsWith("/api/voice/"))
          report.apiResponses.push({
            atMs: runStarted ? Date.now() - runStarted : null,
            path: url.pathname,
            status: response.status(),
          });
      });
      await page.goto(origin);
      await page
        .getByRole("button", {
          name: "Start synthetic voice test",
          exact: true,
        })
        .click();
      await page.waitForFunction(
        () => (window as any).__voiceSoak?.snapshot().diagnostics.connected,
        {},
        { timeout: 45_000 },
      );
      runStarted = Date.now();
      report.connectedStartedAt = new Date(runStarted).toISOString();
      report.status = "RUNNING";
      const initial = await page.evaluate(() =>
        (window as any).__voiceSoak.snapshot(),
      );
      report.initial = initial;
      phase = "ten-minute continuity";
      let lastProgressMinute = -1;
      while (Date.now() - runStarted < report.durationTargetMs) {
        await sleep(
          Math.min(5_000, report.durationTargetMs - (Date.now() - runStarted)),
        );
        const snapshot = await page.evaluate(() =>
          (window as any).__voiceSoak.snapshot(),
        );
        report.samples.push({
          elapsedMs: Date.now() - runStarted,
          diagnostics: snapshot.diagnostics,
          resources: snapshot.resources,
        });
        const minute = Math.floor((Date.now() - runStarted) / 60_000);
        if (minute !== lastProgressMinute) {
          console.log(
            JSON.stringify({
              minute,
              commands: snapshot.diagnostics.commandCount,
              renewals: snapshot.diagnostics.renewals,
              connected: snapshot.diagnostics.connected,
            }),
          );
          lastProgressMinute = minute;
        }
        save();
        if (
          Date.now() - runStarted >= 45_000 &&
          snapshot.diagnostics.commandCount === 0
        )
          throw Error("No initial actual-audio command received");
        if (
          snapshot.statuses.some((s: any) =>
            ["failed", "disconnected", "unavailable"].includes(s.status),
          )
        )
          throw Error("Provider continuity failed");
      }
      report.actualWallMs = Date.now() - runStarted;
      report.beforeStop = await page.evaluate(() =>
        (window as any).__voiceSoak.snapshot(),
      );
      phase = "stop and resource cleanup";
      const disableResponse = page.waitForResponse(
        (r) =>
          r.url() === `${origin}/api/voice/disable` &&
          r.request().method() === "POST",
        { timeout: 10_000 },
      );
      await page
        .getByRole("button", { name: "Stop listening", exact: true })
        .click();
      report.disableStatus = (await disableResponse).status();
      await sleep(1_000);
      report.afterStop = await page.evaluate(() =>
        (window as any).__voiceSoak.snapshot(),
      );
      report.revokedSessionProbeStatus = await page.evaluate(() =>
        (window as any).__voiceSoak.probeRevocation(),
      );
      const before = report.beforeStop;
      const after = report.afterStop;
      report.checks = {
        realTenMinutes: report.actualWallMs >= 600_000,
        initialCommands: before.commands.some(
          (c: any) => c.renewal === 0 && c.types.includes("stop"),
        ),
        renewedAtLeastOnce: before.diagnostics.renewals >= 1,
        renewalEndpointSucceeded: report.apiResponses.some(
          (r: any) => r.path === "/api/voice/renew" && r.status === 200,
        ),
        freshPeerAfterRenewal:
          before.resources.createdPeers >= 2 &&
          before.resources.peerStates.at(-1) === "connected",
        commandsAfterRenewal: before.commands.some(
          (c: any) => c.renewal >= 1 && c.types.includes("stop"),
        ),
        onlyExpectedCommands: before.commands.every((c: any) =>
          c.types.every((type: string) => type === "stop"),
        ),
        noResourceGrowth: report.samples.every(
          (s: any) =>
            s.resources.liveTracks <= 1 &&
            s.resources.peerStates.filter((state: string) => state !== "closed")
              .length <= 1,
        ),
        stopped:
          after.diagnostics.tracks === 0 &&
          !after.diagnostics.connected &&
          !after.diagnostics.pending &&
          after.resources.allTracksEnded &&
          after.resources.allPeersClosed,
        sessionRevoked:
          report.disableStatus === 204 &&
          report.revokedSessionProbeStatus === 401,
        noPageErrors: report.pageErrorCount === 0,
      };
      report.status = Object.values(report.checks).every(Boolean)
        ? "PASS"
        : "FAIL";
      if (report.status !== "PASS") process.exitCode = 1;
    } catch {
      report.status = "FAIL";
      report.failure = `Failure during ${phase}; inspect sanitized status, counters and API status evidence.`;
      if (runStarted) report.actualWallMs = Date.now() - runStarted;
      process.exitCode = 1;
    } finally {
      await browser?.close();
      server.kill("SIGTERM");
      report.browserClosed = true;
      report.finishedAt = new Date().toISOString();
      save();
      console.log(
        `Voice soak ${report.status}; browser closed; artifacts/voice/soak-report.json`,
      );
    }
  }
}
