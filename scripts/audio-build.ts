import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import type { AssetRecord } from "../src/shared/contracts";
import { narrationLines, narrationCues } from "../content/narration";
import { discoveries } from "../content/catalog";
import { narrationFingerprint } from "../server/narration";
import { fixtures } from "../tests/voice/fixtures";
const root = "public/assets/audio";
mkdirSync(root, { recursive: true });
mkdirSync("tests/voice/audio", { recursive: true });
mkdirSync("artifacts/audio", { recursive: true });
const manifest: AssetRecord[] = [];
const previous: AssetRecord[] = existsSync("assets/manifests/audio.json")
  ? JSON.parse(readFileSync("assets/manifests/audio.json", "utf8"))
  : [];
const onlyCues = process.argv.includes("--cues-only");
function run(bin: string, args: string[]) {
  const r = spawnSync(bin, args, { encoding: "utf8" });
  if (r.status !== 0) throw Error(`${bin} failed: ${r.stderr}`);
}
function register(id: string, evidenceIds: string[], narration = false) {
  const path = `${root}/${id}.wav`;
  manifest.push({
    id,
    localPath: `public/assets/audio/${id}.wav`,
    sha256: createHash("sha256").update(readFileSync(path)).digest("hex"),
    creator: "Mermaidia original sound design",
    licenseIdOrTerms:
      "Original project asset; generated from original text or mathematical sound design. eSpeak NG GPL-3.0-or-later is an authoring tool, not bundled.",
    licenseUrl: "https://espeak.sourceforge.net/license.html",
    attribution: narration
      ? "Original Mermaidia text, rendered with eSpeak NG formant synthesis. No recorded performer, cloning, or third-party samples."
      : "Original procedural Mermaidia sound design; an artistic texture, not an animal recording.",
    modifications: narration
      ? [
          "eSpeak NG en-us+f3, 145 words/minute, pitch 53",
          "FFmpeg high/low pass, conservative loudness normalization, mono 24 kHz PCM16",
        ]
      : [
          "Deterministic Fourier water texture; seamless periodic samples; conservative peak",
        ],
    distribution: "approved",
    evidenceIds,
    buildRecipe: "npx tsx scripts/audio-build.ts",
  });
}
function narrate(id: string, text: string, evidence: string[] = []) {
  const temp = `artifacts/audio/${id}-raw.wav`;
  run("espeak-ng", [
    "-v",
    "en-us+f3",
    "-s",
    "145",
    "-p",
    "53",
    "-a",
    "135",
    "-w",
    temp,
    text,
  ]);
  run("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    temp,
    "-af",
    "highpass=f=80,lowpass=f=7000,loudnorm=I=-22:TP=-6:LRA=7",
    "-ar",
    "24000",
    "-ac",
    "1",
    `${root}/${id}.wav`,
  ]);
  register(id, evidence, true);
}
function wav(samples: Float64Array, rate = 24000) {
  const b = Buffer.alloc(44 + samples.length * 2);
  b.write("RIFF");
  b.writeUInt32LE(b.length - 8, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((x, i) =>
    b.writeInt16LE(
      Math.round(Math.max(-1, Math.min(1, x)) * 32767),
      44 + i * 2,
    ),
  );
  return b;
}
// Integer Fourier frequencies over 12 seconds make the first/last boundary continuous.
if (!onlyCues)
  for (const [theme, base] of Object.entries({
    reef: 80,
    caribbean: 105,
    ice: 190,
    wreck: 64,
    deep: 38,
  }))
    for (const surface of [false, true]) {
      const n = 24000 * 12,
        samples = new Float64Array(n);
      let seed = 4107 + base;
      const rng = () => {
        seed = (1664525 * seed + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      const waves = Array.from({ length: 32 }, (_, i) => ({
        frequency:
          Math.round((base + (surface ? 900 : 120) * rng() + i * 3) * 12) / 12,
        phase: rng() * Math.PI * 2,
        gain: (surface ? 0.013 : 0.008) / (1 + i * 0.09),
      }));
      for (let i = 0; i < n; i++) {
        const t = i / 24000;
        const envelope =
          0.6 +
          0.3 * Math.sin((2 * Math.PI * t) / 6) +
          0.1 * Math.sin((2 * Math.PI * t) / 3);
        samples[i] =
          waves.reduce(
            (sum, w) =>
              sum + w.gain * Math.sin(2 * Math.PI * w.frequency * t + w.phase),
            0,
          ) * envelope;
      }
      const id = `${surface ? "surface" : "ambience"}-${theme}`;
      writeFileSync(`${root}/${id}.wav`, wav(samples));
      register(id, []);
    }
if (!onlyCues)
  for (const [name, freq] of Object.entries({
    discovery: 620,
    listening: 440,
    swish: 110,
    click: 380,
  })) {
    const samples = new Float64Array(24000 * 0.45);
    for (let i = 0; i < samples.length; i++) {
      const t = i / 24000;
      const env =
        Math.sin((Math.PI * i) / samples.length) ** 2 * Math.exp(-t * 6);
      samples[i] =
        env *
        0.14 *
        (Math.sin(2 * Math.PI * freq * t) +
          0.3 * Math.sin(2 * Math.PI * freq * 1.5 * t));
    }
    const id = `cue-${name}`;
    writeFileSync(`${root}/${id}.wav`, wav(samples));
    register(id, []);
  }
for (const line of narrationLines) {
  if (onlyCues && !Object.hasOwn(narrationCues, line.id)) continue;
  if (onlyCues && line.id.startsWith("narration-activity-")) continue;
  // Never silently replace a matching preferred voice with formant fallback.
  const preferred = previous.find(
    (r) =>
      r.id === line.id &&
      r.creator === "Mermaidia original scripts; OpenAI speech generation" &&
      r.modifications.includes(
        `Narration fingerprint: ${narrationFingerprint(line)}`,
      ),
  );
  if (
    preferred &&
    existsSync(preferred.localPath) &&
    createHash("sha256")
      .update(readFileSync(preferred.localPath))
      .digest("hex") === preferred.sha256
  )
    manifest.push(preferred);
  else narrate(line.id, line.text, line.evidenceIds);
}
// Preserve independently authored bird recordings and any untouched registry entries.
const changed = new Set(manifest.map((record) => record.id));
manifest.unshift(...previous.filter((record) => !changed.has(record.id)));
writeFileSync(
  "assets/manifests/audio.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
if (onlyCues) {
  console.log(
    "Updated reviewed guidance cues; all other audio and voice fixtures preserved.",
  );
  process.exit(0);
}
// These files are development-only synthetic inputs, never child recordings or shipped narration.
const selected = [
  0, 1, 3, 6, 9, 10, 11, 18, 21, 24, 27, 30, 33, 37, 41, 45, 48, 51, 54, 57, 60,
  62, 64, 66, 68, 70, 71, 72, 73, 74, 78, 80, 81, 84, 88,
]
  .map((i) => fixtures[i])
  .filter(Boolean);
const fixtureManifest = [];
for (const [i, f] of selected.entries()) {
  const id = `fixture-${String(i + 1).padStart(2, "0")}`,
    path = `tests/voice/audio/${id}.wav`,
    temp = `artifacts/audio/${id}-raw.wav`;
  if (!f.text.trim() || f.text === "[noise]") {
    writeFileSync(path, wav(new Float64Array(24000 * 6)));
  } else {
    run("espeak-ng", [
      "-v",
      i % 2 ? "en-us" : "en-us+f3",
      "-s",
      String(130 + (i % 4) * 10),
      "-w",
      temp,
      f.text,
    ]);
    run("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      temp,
      "-af",
      "adelay=2200,apad=pad_dur=4,volume=0.6",
      "-ar",
      "48000",
      "-ac",
      "1",
      path,
    ]);
  }
  fixtureManifest.push({
    id,
    path,
    text: f.text,
    expected: f.commands,
    kind: "synthetic formant speech; original developer command text",
    sha256: createHash("sha256").update(readFileSync(path)).digest("hex"),
    license:
      "Original project fixture; eSpeak NG synthesis tool output; no human recording",
    source: "https://espeak.sourceforge.net/license.html",
  });
}
writeFileSync(
  "tests/voice/audio-fixtures.json",
  JSON.stringify(fixtureManifest, null, 2) + "\n",
);
writeFileSync(
  "artifacts/audio/build-report.json",
  JSON.stringify(
    {
      date: new Date().toISOString(),
      assets: manifest.length,
      discoveryNarrations: discoveries.length,
      fixtures: fixtureManifest.length,
      espeak: spawnSync("espeak-ng", ["--version"], {
        encoding: "utf8",
      }).stdout.trim(),
      ffmpeg: spawnSync("ffmpeg", ["-version"], {
        encoding: "utf8",
      }).stdout.split("\n")[0],
      listeningReview: "unverified: no auditory inspection tool available",
    },
    null,
    2,
  ),
);
console.log(
  `Built ${manifest.length} sound assets, ${discoveries.length} discovery narrations, ${fixtureManifest.length} synthetic microphone fixtures.`,
);
