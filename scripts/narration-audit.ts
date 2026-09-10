import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { narrationLines } from "../content/narration";
import { narrationFingerprint, narrator } from "../server/narration";
import type { AssetRecord } from "../src/shared/contracts";

const assets = JSON.parse(
  readFileSync("assets/manifests/audio.json", "utf8"),
) as AssetRecord[];
const rows: {
  id: string;
  sha256: string;
  seconds: number;
  integratedLufs: number;
  truePeakDb: number;
  loudnessRangeLu: number;
  sampleRate: number;
  channels: number;
}[] = [];
const errors: string[] = [];
for (const line of narrationLines) {
  const asset = assets.find((a) => a.id === line.id);
  if (
    !asset ||
    asset.creator !== "Mermaidia original scripts; OpenAI speech generation" ||
    !asset.modifications.includes(
      `Narration fingerprint: ${narrationFingerprint(line)}`,
    )
  ) {
    errors.push(
      `${line.id}: preferred provenance or script fingerprint missing`,
    );
    continue;
  }
  const bytes = readFileSync(asset.localPath),
    hash = createHash("sha256").update(bytes).digest("hex");
  if (hash !== asset.sha256) {
    errors.push(`${line.id}: checksum mismatch`);
    continue;
  }
  const probe = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "stream=codec_name,sample_rate,channels,duration",
      "-of",
      "json",
      asset.localPath,
    ],
    { encoding: "utf8" },
  );
  const stream = JSON.parse(probe.stdout).streams?.[0];
  if (
    probe.status !== 0 ||
    stream?.codec_name !== "pcm_s16le" ||
    Number(stream?.sample_rate) !== 24000 ||
    stream?.channels !== 1
  ) {
    errors.push(`${line.id}: expected mono 24 kHz PCM16`);
    continue;
  }
  const check = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-nostats",
      "-i",
      asset.localPath,
      "-af",
      "loudnorm=I=-22:TP=-6:LRA=7:print_format=json",
      "-f",
      "null",
      "-",
    ],
    { encoding: "utf8" },
  );
  const block = check.stderr.match(/\{\s*"input_i"[\s\S]*?\}/)?.[0];
  if (check.status !== 0 || !block) {
    errors.push(`${line.id}: loudness measurement failed`);
    continue;
  }
  const measurement = JSON.parse(block),
    integratedLufs = Number(measurement.input_i),
    truePeakDb = Number(measurement.input_tp);
  if (!Number.isFinite(integratedLufs) || Math.abs(integratedLufs + 22) > 1)
    errors.push(`${line.id}: integrated loudness outside -22 +/- 1 LUFS`);
  if (!Number.isFinite(truePeakDb) || truePeakDb > -5.8)
    errors.push(`${line.id}: true peak above -5.8 dBTP tolerance`);
  rows.push({
    id: line.id,
    sha256: hash,
    seconds: Number(stream.duration),
    integratedLufs,
    truePeakDb,
    loudnessRangeLu: Number(measurement.input_lra),
    sampleRate: Number(stream.sample_rate),
    channels: stream.channels,
  });
}
mkdirSync("artifacts/narration", { recursive: true });
const report = {
  date: new Date().toISOString(),
  status: errors.length ? "FAIL" : "PASS",
  model: narrator.model,
  voice: narrator.voice,
  expected: narrationLines.length,
  measured: rows.length,
  errors,
  auditoryReview:
    "UNVERIFIED: numerical checks do not establish warmth, pronunciation, intelligibility or comfort",
  rows,
};
writeFileSync(
  "artifacts/narration/audio-audit.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    status: report.status,
    measured: rows.length,
    errors,
    integratedLufsMin: Math.min(...rows.map((r) => r.integratedLufs)),
    integratedLufsMax: Math.max(...rows.map((r) => r.integratedLufs)),
    loudestTruePeakDb: Math.max(...rows.map((r) => r.truePeakDb)),
    seconds: rows.reduce((n, r) => n + r.seconds, 0),
  }),
);
if (errors.length) process.exitCode = 1;
