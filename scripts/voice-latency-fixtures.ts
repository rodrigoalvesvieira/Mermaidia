/** Separate original synthetic inputs; never modifies the core speech fixtures. */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { VoiceCommand } from "../src/shared/contracts";
const cases: { id: string; text: string; expected: VoiceCommand[] }[] = [
  {
    id: "latency-01",
    text: "can we go faster",
    expected: [{ type: "speed", delta: 1 }],
  },
  {
    id: "latency-02",
    text: "I want to swim forward",
    expected: [{ type: "swim" }],
  },
  {
    id: "latency-03",
    text: "can we go to the surface",
    expected: [{ type: "surface" }],
  },
  { id: "latency-04", text: "can we not swim forward", expected: [] },
];
const sha = (data: Buffer | string) =>
  createHash("sha256").update(data).digest("hex");
const scriptSha256 = sha(readFileSync(new URL(import.meta.url)));
const coreManifestPath = "tests/voice/audio-fixtures.json";
const coreManifest = readFileSync(coreManifestPath);
const coreFixtures = JSON.parse(coreManifest.toString()) as { path: string }[];
const protectedFiles = [coreManifestPath, ...coreFixtures.map((f) => f.path)];
const beforeHashes = new Map(
  protectedFiles.map((path) => [path, sha(readFileSync(path))]),
);
function run(binary: string, args: string[]) {
  const result = spawnSync(binary, args, { encoding: "utf8", timeout: 60_000 });
  if (result.status !== 0) throw Error(`${binary} failed: ${result.stderr}`);
  return result.stdout;
}
const output = "tests/voice/latency-audio";
mkdirSync(output, { recursive: true });
mkdirSync("artifacts/voice", { recursive: true });
const temp = mkdtempSync(join(tmpdir(), "mermaidia-latency-fixtures-"));
try {
  const manifest = cases.map((fixture, index) => {
    const path = `${output}/${fixture.id}.wav`;
    const raw = join(temp, `${fixture.id}.wav`);
    const voice = index % 2 ? "en-us" : "en-us+f3";
    const wordsPerMinute = 130 + (index % 4) * 10;
    run("espeak-ng", [
      "-v",
      voice,
      "-s",
      String(wordsPerMinute),
      "-w",
      raw,
      fixture.text,
    ]);
    run("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      raw,
      "-af",
      "adelay=2200,apad=pad_dur=4,volume=0.6",
      "-ar",
      "48000",
      "-ac",
      "1",
      "-c:a",
      "pcm_s16le",
      path,
    ]);
    const probe = JSON.parse(
      run("ffprobe", [
        "-v",
        "error",
        "-show_entries",
        "stream=codec_name,sample_rate,channels,bits_per_sample:format=duration",
        "-of",
        "json",
        path,
      ]),
    );
    const stream = probe.streams[0];
    if (
      stream.codec_name !== "pcm_s16le" ||
      stream.sample_rate !== "48000" ||
      stream.channels !== 1 ||
      stream.bits_per_sample !== 16 ||
      Number(probe.format.duration) <= 6.2
    )
      throw Error("Fixture PCM/silence convention failed");
    return {
      ...fixture,
      path,
      kind: "synthetic formant speech; original developer command text",
      sha256: sha(readFileSync(path)),
      sourceTextSha256: sha(fixture.text),
      recipeSha256: scriptSha256,
      license:
        "Original project fixture; eSpeak NG synthesis tool output; no human recording",
      source: "https://espeak.sourceforge.net/license.html",
      buildRecipe: "npx tsx scripts/voice-latency-fixtures.ts",
      synthesis: {
        voice,
        wordsPerMinute,
        initialSilenceMs: 2200,
        trailingPaddingSeconds: 4,
        volume: 0.6,
        sampleRate: 48000,
        channels: 1,
        codec: "pcm_s16le",
      },
      durationSeconds: Number(probe.format.duration),
    };
  });
  const coreUnchanged = protectedFiles.every(
    (path) => sha(readFileSync(path)) === beforeHashes.get(path),
  );
  if (!coreUnchanged)
    throw Error("Core fixture files changed during extension build");
  writeFileSync(
    "tests/voice/latency-fixtures.json",
    JSON.stringify(manifest, null, 2) + "\n",
  );
  writeFileSync(
    "artifacts/voice/latency-fixtures-build.json",
    JSON.stringify(
      {
        date: new Date().toISOString(),
        count: manifest.length,
        coreFixtureCount: coreFixtures.length,
        coreManifestSha256: sha(coreManifest),
        coreUnchanged,
        recipeSha256: scriptSha256,
        espeak: run("espeak-ng", ["--version"]).trim(),
        ffmpeg: run("ffmpeg", ["-version"]).split("\n")[0],
        technicalValidation:
          "All four clips are mono 48 kHz PCM16 WAV with duration greater than the 6.2-second padding total",
        liveProviderTest: "NOT RUN by this generator",
        auditoryReview:
          "Not performed; no human/child recording or provider speech generated",
        assets: manifest.map(({ id, path, sha256, durationSeconds }) => ({
          id,
          path,
          sha256,
          durationSeconds,
        })),
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `Generated ${manifest.length} separate latency fixtures; all ${coreFixtures.length} core fixtures and their manifest are unchanged.`,
  );
} finally {
  rmSync(temp, { recursive: true, force: true });
}
