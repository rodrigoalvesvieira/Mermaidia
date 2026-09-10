import { readFileSync, writeFileSync, renameSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { narrationLines } from "../content/narration";
import { narrationFingerprint } from "../server/narration";
import {
  normalizeNarration,
  narrationNormalization,
} from "./audio/normalize-narration";
import type { AssetRecord } from "../src/shared/contracts";
const manifest = JSON.parse(
  readFileSync("assets/manifests/audio.json", "utf8"),
) as AssetRecord[];
const report: { id: string; beforeSha256: string; sha256: string }[] = [];
mkdirSync("artifacts/narration", { recursive: true });
for (const line of narrationLines) {
  const record = manifest.find((r) => r.id === line.id);
  if (
    !record ||
    record.creator !== "Mermaidia original scripts; OpenAI speech generation" ||
    !record.modifications.includes(
      `Narration fingerprint: ${narrationFingerprint(line)}`,
    )
  )
    throw Error(`Preferred narration missing: ${line.id}`);
  if (record.modifications.includes(narrationNormalization)) continue;
  const hash = createHash("sha256")
    .update(readFileSync(record.localPath))
    .digest("hex");
  if (hash !== record.sha256) throw Error(`Checksum mismatch: ${line.id}`);
  const staged = `artifacts/narration/${line.id}-normalized.wav`;
  normalizeNarration(record.localPath, staged);
  const sha256 = createHash("sha256")
    .update(readFileSync(staged))
    .digest("hex");
  renameSync(staged, record.localPath);
  record.sha256 = sha256;
  record.modifications.push(narrationNormalization);
  report.push({ id: line.id, beforeSha256: hash, sha256 });
  writeFileSync(
    "assets/manifests/audio.json",
    JSON.stringify(manifest, null, 2) + "\n",
  );
}
const generation = JSON.parse(
  readFileSync("artifacts/narration/build-report.json", "utf8"),
);
for (const row of generation.results) {
  const normalized = report.find((r) => r.id === row.id);
  if (normalized) {
    row.generatedSha256 = row.sha256;
    row.sha256 = normalized.sha256;
  }
}
generation.normalization = narrationNormalization;
generation.normalizedOn = new Date().toISOString();
writeFileSync(
  "artifacts/narration/build-report.json",
  JSON.stringify(generation, null, 2) + "\n",
);
writeFileSync(
  "artifacts/narration/normalization-report.json",
  JSON.stringify(
    {
      date: new Date().toISOString(),
      method: narrationNormalization,
      providerCalls: 0,
      rows: report,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Normalized ${report.length} preferred clips locally; zero provider requests.`,
);
