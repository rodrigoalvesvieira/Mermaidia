import "dotenv/config";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { chromium } from "@playwright/test";
import {
  interpretWithAstra,
  safeVoiceError,
  voiceReadiness,
} from "../server/voice";
import type { VoiceCommand } from "../src/shared/contracts";
mkdirSync("artifacts/voice", { recursive: true });
const report: {
  date: string;
  status: string;
  models: Record<string, string>;
  fixtureType: string;
  prerequisites: string[];
  results: unknown[];
  astra?: unknown;
  summary?: unknown;
} = {
  date: new Date().toISOString(),
  status: "BLOCKED",
  models: {
    transcription: voiceReadiness().transcriptionModel,
    interpretation: "gpt-6-astra",
  },
  fixtureType:
    "Original synthetic formant speech through Chromium fake audio capture and actual WebRTC provider; no child recordings",
  prerequisites: [],
  results: [],
};
if (!process.env.OPENAI_API_KEY)
  report.prerequisites.push(
    "OPENAI_API_KEY with access to gpt-4o-mini-transcribe and gpt-6-astra is absent.",
  );
if (process.env.LIVE_AUDIO_TEST !== "1")
  report.prerequisites.push(
    "Set LIVE_AUDIO_TEST=1 to explicitly enable adult/synthetic provider fixtures and API usage.",
  );
const save = () =>
  writeFileSync(
    process.env.VOICE_REPORT_PATH || "artifacts/voice/live-report.json",
    JSON.stringify(report, null, 2) + "\n",
  );
if (report.prerequisites.length) {
  save();
  console.log("BLOCKED: " + report.prerequisites.join(" "));
  console.log("No audio was captured or sent. This is not a live pass.");
  process.exitCode = 2;
} else {
  type Fixture = {
    id: string;
    path: string;
    text: string;
    expected: VoiceCommand[] | null;
  };
  // The Australian scene has no matching jelly target; all other fixtures include modal speech.
  const fixtures = (
    JSON.parse(
      readFileSync(
        process.env.VOICE_FIXTURE_MANIFEST || "tests/voice/audio-fixtures.json",
        "utf8",
      ),
    ) as Fixture[]
  ).filter(
    (f) =>
      !f.expected?.some(
        (c) => c.type === "approach" && c.targetId === "jelly-1",
      ) &&
      (!process.env.VOICE_FIXTURE_IDS ||
        process.env.VOICE_FIXTURE_IDS.split(",").includes(f.id)),
  );
  if (!fixtures.length) throw Error("No matching voice fixtures");
  execFileSync(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "build",
      "--mode",
      "test",
      "--outDir",
      "artifacts/voice/test-client",
    ],
    { stdio: "ignore" },
  );
  const origin = "http://localhost:5180";
  const server = spawn(
    process.execPath,
    ["--import", "tsx", "server/index.ts"],
    {
      env: {
        ...process.env,
        PORT: "5180",
        APP_ORIGIN: origin,
        ALLOW_ADULT_VOICE_DEV: "true",
        VOICE_FIXTURE_RUN: "true",
        NODE_ENV: "production",
        STATIC_DIR: resolve("artifacts/voice/test-client"),
      },
      stdio: "ignore",
    },
  );
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  type Snapshot = {
    position: number[];
    heading: number;
    motion: string;
    mode: string;
    speed: number;
    surface: boolean;
  };
  try {
    for (let i = 0; i < 60; i++) {
      try {
        if ((await fetch(`${origin}/api/health`)).ok) break;
      } catch {
        /* bounded readiness polling */
      }
      if (i === 59) throw Error("Local fixture server failed to start");
      await sleep(500);
    }
    report.status = "RUNNING";
    save();
    for (const fixture of fixtures) {
      const browser = await chromium.launch({
        args: [
          "--use-fake-device-for-media-stream",
          "--use-fake-ui-for-media-stream",
          `--use-file-for-fake-audio-capture=${resolve(fixture.path)}`,
        ],
      });
      try {
        const connectionErrors: unknown[] = [];
        let interpretationRequests = 0;
        const page = await browser.newPage({
          viewport: { width: 1280, height: 720 },
          permissions: ["microphone"],
        });
        page.on("request", (request) => {
          if (request.url() === `${origin}/api/voice/interpret`)
            interpretationRequests++;
        });
        page.on("response", async (response) => {
          if (
            response.url().startsWith(`${origin}/api/voice/`) &&
            response.status() >= 400
          ) {
            const body = await response.json().catch(() => ({}));
            connectionErrors.push({
              path: new URL(response.url()).pathname,
              status: response.status(),
              provider: body.provider ?? null,
              diagnostic: body.diagnostic ?? null,
            });
          }
        });
        await page.addInitScript("globalThis.__name = (fn) => fn");
        // Read-only timing observation; it does not replace or inject the microphone stream.
        await page.addInitScript(() => {
          const original = navigator.mediaDevices.getUserMedia.bind(
            navigator.mediaDevices,
          );
          navigator.mediaDevices.getUserMedia = async (c) => {
            const stream = await original(c);
            (window as any).__captureStartedAt = Date.now();
            return stream;
          };
        });
        // Observe actual final-event match metadata only; never retain the transcript.
        await page.addInitScript((fixtureText: string) => {
          const original = RTCPeerConnection.prototype.createDataChannel;
          RTCPeerConnection.prototype.createDataChannel = function (...args) {
            const channel = original.apply(this, args);
            channel.addEventListener("message", (event) => {
              try {
                const data = JSON.parse(event.data);
                if (
                  data.type !==
                    "conversation.item.input_audio_transcription.completed" ||
                  typeof data.transcript !== "string"
                )
                  return;
                const plain = (s: string) =>
                  s
                    .toLowerCase()
                    .replace(/[^a-z0-9'\s]/g, " ")
                    .replace(/\s+/g, " ")
                    .trim();
                const fold = (s: string) =>
                  plain(s.normalize("NFD").replace(/\p{M}/gu, ""));
                (window as any).__fixtureRecognition = {
                  finalEvents:
                    ((window as any).__fixtureRecognition?.finalEvents ?? 0) +
                    1,
                  fixtureTextMatched:
                    plain(data.transcript) === plain(fixtureText),
                  diacriticFoldMatched:
                    fold(data.transcript) === fold(fixtureText),
                  empty: data.transcript.trim().length === 0,
                };
              } catch {
                /* Malformed provider messages remain ignored. */
              }
            });
            return channel;
          };
        }, fixture.text);
        await page.goto(origin);
        await page.getByRole("button", { name: "Grown-up settings" }).click();
        // Use the ordinary preference to hold capture until fixture preconditions
        // are ready. This is controlled audio-path testing, not an auto-start UX test.
        await page.getByLabel("Spoken controls on by default").uncheck();
        await page.getByLabel("Mute all sound", { exact: true }).check();
        await page.getByRole("button", { name: "Done", exact: true }).click();
        await page.locator(".destination").first().click();
        await page
          .getByRole("button", { name: "Start swimming", exact: false })
          .click();
        await page.waitForFunction(
          () => Boolean((window as any).__mermaidia?.ready()),
          {},
          { timeout: 30000 },
        );
        // Normal pause/close ends onboarding narration before controlled capture.
        await page.getByRole("button", { name: "Pause", exact: true }).click();
        await page
          .getByRole("button", { name: "Keep swimming", exact: true })
          .click();
        const expected = fixture.expected ?? [];
        if (expected.some((c) => c.type === "speed" && c.delta < 0))
          await page
            .getByRole("button", { name: "Swim faster", exact: true })
            .click();
        if (expected.some((c) => c.type === "return")) {
          await page
            .getByRole("button", { name: "Move right", exact: true })
            .click();
          await sleep(1700);
        }
        let before = (await page.evaluate(() =>
          (window as any).__mermaidia.snapshot(),
        )) as Snapshot;
        await page
          .getByRole("button", { name: "Start listening", exact: true })
          .click();
        if (expected.some((c) => c.type === "stop"))
          await page.keyboard.press("ArrowUp");
        if (expected.some((c) => c.type === "close")) {
          await page.keyboard.press("?");
          await page.getByRole("dialog").waitFor();
          before = await page.evaluate(() =>
            (window as any).__mermaidia.snapshot(),
          );
          if (before.mode !== "inspecting")
            throw Error("Discovery precondition failed");
        }
        if (expected.some((c) => c.type === "resume")) {
          await page
            .getByRole("button", { name: "Pause", exact: true })
            .click();
          before = await page.evaluate(() =>
            (window as any).__mermaidia.snapshot(),
          );
          if (before.mode !== "paused")
            throw Error("Pause precondition failed");
        }
        const start = Date.now();
        let success = false,
          firstActionAt: number | undefined,
          after = before;
        const matches = (s: Snapshot) => {
          if (!expected.length)
            return (
              s.motion === "hover" &&
              Math.hypot(...s.position.map((x, i) => x - before.position[i])) <
                0.05 &&
              Math.abs(s.heading - before.heading) < 0.01
            );
          return expected.every((c) => {
            switch (c.type) {
              case "swim":
                return (
                  s.motion === "forward" &&
                  Math.hypot(
                    ...s.position.map((x, i) => x - before.position[i]),
                  ) > 0.1
                );
              case "stop":
                return s.motion === "hover";
              case "turn":
                return (
                  (s.heading - before.heading) * Math.sign(c.degrees) > 0.05
                );
              case "lateral":
                return (s.position[0] - before.position[0]) * c.direction > 0.1;
              case "vertical":
                return (s.position[1] - before.position[1]) * c.direction > 0.1;
              case "dive":
                return s.position[1] < before.position[1] - 0.1;
              case "surface":
                return s.motion === "route" || s.surface;
              case "speed":
                return (
                  s.speed === Math.max(0, Math.min(2, before.speed + c.delta))
                );
              case "return":
                return (
                  Math.hypot(
                    ...s.position.map((x, i) => x - before.position[i]),
                  ) > 0.3 && s.motion === "hover"
                );
              case "inspect":
                return s.mode === "inspecting";
              case "pause":
              case "help":
                return s.mode === "paused";
              case "journal":
                return s.mode === "journal";
              case "approach":
                return s.motion === "route";
              case "close":
              case "resume":
                return s.mode === "exploring";
            }
          });
        };
        const timeoutMs = expected.some((c) => c.type === "close")
          ? 35_000
          : 15_000;
        while (Date.now() - start < timeoutMs) {
          await sleep(50);
          after = await page.evaluate(() =>
            (window as any).__mermaidia.snapshot(),
          );
          const observed = await page.evaluate(() =>
            (window as any).__mermaidia.voiceStats?.(),
          );
          const actualCommands = (observed?.lastCommands ??
            []) as VoiceCommand[];
          const commandsMatch =
            expected.length === actualCommands.length &&
            expected.every((command, index) => {
              const actual = actualCommands[index];
              if (command.type === "approach")
                return actual?.type === "approach";
              return JSON.stringify(command) === JSON.stringify(actual);
            });
          if (
            expected.length &&
            matches(after) &&
            commandsMatch &&
            observed?.timing?.actionAt >= start
          ) {
            success = true;
            firstActionAt = Date.now();
            break;
          }
        }
        const captureStartedAt = await page.evaluate(
          () => (window as any).__captureStartedAt ?? null,
        );
        const voiceDiagnostics = await page.evaluate(
          () => (window as any).__mermaidia.voiceStats?.() ?? null,
        );
        if (!expected.length)
          success =
            matches(after) &&
            voiceDiagnostics?.connected === true &&
            voiceDiagnostics?.commandCount === 0;
        report.results.push({
          id: fixture.id,
          expected,
          success,
          before,
          after,
          captureStartedAt,
          firstActionAt,
          voiceTiming: voiceDiagnostics?.timing ?? null,
          recognitionMatch: await page.evaluate(
            () => (window as any).__fixtureRecognition ?? null,
          ),
          actualCommands: voiceDiagnostics?.lastCommands ?? [],
          connected: voiceDiagnostics?.connected ?? false,
          interpretationRequests,
          connectionErrors,
          captureMode:
            "Normal settings disable auto-start for deterministic fixture preparation; normal microphone button starts actual provider capture",
          note: "Recognition and interpretation timings derive from actual provider speech-stop/final events and dispatch. Null means unavailable, never zero inferred from a missing event.",
        });
        save();
        console.log(
          JSON.stringify({
            fixture: fixture.id,
            success,
            connected: voiceDiagnostics?.connected ?? false,
            connectionErrors,
          }),
        );
        if (connectionErrors.length && !voiceDiagnostics?.connected) break;
      } catch (error) {
        report.results.push({
          id: fixture.id,
          success: false,
          error: error instanceof Error ? error.message : "Fixture failed",
        });
        save();
      } finally {
        await browser.close();
      }
    }
    try {
      const started = Date.now();
      const result = await interpretWithAstra(
        "Slide gently to the right and keep facing the same direction.",
        [],
      );
      report.astra = {
        status: result.commands.some(
          (c) => c.type === "lateral" && c.direction === 1,
        )
          ? "PASS"
          : "FAIL",
        durationMs: Date.now() - started,
        result,
      };
    } catch (error) {
      report.astra = {
        status: "FAIL",
        reason: "Astra did not return validated navigation within timeout.",
        diagnostic: safeVoiceError(error),
      };
    }
    const rows = report.results as {
      id: string;
      success: boolean;
      voiceTiming?: {
        endOfSpeechAt: number | null;
        finalTranscriptAt: number;
        recognitionMs: number | null;
        interpretationMs: number;
        actionAt: number | null;
      };
    }[];
    const percentile = (values: number[], q: number) => {
      const sorted = values.sort((a, b) => a - b);
      return sorted.length
        ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))]
        : null;
    };
    const responseLatencies = rows.flatMap((r) =>
      r.voiceTiming?.endOfSpeechAt != null && r.voiceTiming.actionAt != null
        ? [r.voiceTiming.actionAt - r.voiceTiming.endOfSpeechAt]
        : [],
    );
    const recognitionLatencies = rows.flatMap((r) =>
      r.voiceTiming?.recognitionMs != null ? [r.voiceTiming.recognitionMs] : [],
    );
    const interpretationLatencies = rows.flatMap((r) =>
      r.voiceTiming ? [r.voiceTiming.interpretationMs] : [],
    );
    const correct = rows.filter((r) => r.success).length;
    const stopIds = fixtures
      .filter((f) => f.expected?.some((c) => c.type === "stop"))
      .map((f) => f.id);
    const quietIds = fixtures
      .filter((f) => !f.expected?.length)
      .map((f) => f.id);
    const stopPass = rows
        .filter((r) => stopIds.includes(r.id))
        .every((r) => r.success),
      quietPass = rows
        .filter((r) => quietIds.includes(r.id))
        .every((r) => r.success);
    report.summary = {
      latencyMs: {
        endOfSpeechToActionMedian: percentile(responseLatencies, 0.5),
        endOfSpeechToActionP95: percentile(responseLatencies, 0.95),
        recognitionMedian: percentile(recognitionLatencies, 0.5),
        recognitionP95: percentile(recognitionLatencies, 0.95),
        interpretationMedian: percentile(interpretationLatencies, 0.5),
        interpretationP95: percentile(interpretationLatencies, 0.95),
      },
      count: rows.length,
      plannedCount: fixtures.length,
      scope: process.env.VOICE_FIXTURE_IDS
        ? "targeted diagnostic subset"
        : "full 34-fixture run",
      correct,
      accuracy: correct / rows.length,
      stopPass,
      quietPass,
      device:
        "Chromium synthetic microphone, not a physical adult or child microphone",
      network: "Developer machine connection; no artificial network throttle",
      childSpeechAccuracy: "UNVERIFIED",
    };
    report.status =
      rows.length === fixtures.length &&
      correct / rows.length >= 0.9 &&
      stopPass &&
      quietPass &&
      (report.astra as { status: string }).status === "PASS"
        ? process.env.VOICE_FIXTURE_IDS
          ? "PARTIAL_PASS"
          : "PASS"
        : "FAIL";
    if (!["PASS", "PARTIAL_PASS"].includes(report.status)) process.exitCode = 1;
  } catch (error) {
    report.status = "FAIL";
    report.prerequisites.push(
      error instanceof Error ? error.message : "Live runner failed",
    );
    process.exitCode = 1;
  } finally {
    server.kill("SIGTERM");
    save();
    console.log(
      `Live audio report: ${report.status}; artifacts/voice/live-report.json`,
    );
  }
}
