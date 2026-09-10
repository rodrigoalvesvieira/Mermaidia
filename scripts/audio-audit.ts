import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import type { AssetRecord } from "../src/shared/contracts";
const assets = JSON.parse(
  readFileSync("assets/manifests/audio.json", "utf8"),
) as AssetRecord[];
const rows = assets.map((a) => {
  const b = readFileSync(a.localPath);
  if (createHash("sha256").update(b).digest("hex") !== a.sha256)
    throw Error(`Checksum mismatch ${a.id}`);
  let offset = 12,
    data: Buffer | undefined,
    rate = 0,
    channels = 0,
    bits = 0;
  while (offset + 8 <= b.length) {
    const tag = b.toString("ascii", offset, offset + 4),
      length = b.readUInt32LE(offset + 4);
    if (tag === "fmt ") {
      channels = b.readUInt16LE(offset + 10);
      rate = b.readUInt32LE(offset + 12);
      bits = b.readUInt16LE(offset + 22);
    }
    if (tag === "data") data = b.subarray(offset + 8, offset + 8 + length);
    offset += 8 + length + (length % 2);
  }
  if (!data || bits !== 16 || channels !== 1)
    throw Error(`Invalid PCM format ${a.id}`);
  let peak = 0,
    sum = 0;
  const count = data.length / 2;
  for (let i = 0; i < count; i++) {
    const sample = data.readInt16LE(i * 2) / 32768;
    peak = Math.max(peak, Math.abs(sample));
    sum += sample * sample;
  }
  const jump =
    Math.abs(data.readInt16LE(0) - data.readInt16LE(data.length - 2)) / 32768;
  if (peak >= 0.9) throw Error(`Unexpected high peak ${a.id}`);
  if (/^(ambience|surface)-/.test(a.id) && jump > 0.015)
    throw Error(`Loop discontinuity ${a.id}`);
  return {
    id: a.id,
    seconds: count / rate,
    peakDb: 20 * Math.log10(peak || 1e-9),
    rmsDb: 10 * Math.log10(sum / count || 1e-9),
    loopBoundaryJump: jump,
    pcmBits: bits,
    sampleRate: rate,
  };
});
mkdirSync("artifacts/audio", { recursive: true });
writeFileSync(
  "artifacts/audio/audit.json",
  JSON.stringify(
    {
      date: new Date().toISOString(),
      assets: rows.length,
      technical:
        "PASS: checksums, mono PCM16 decode structure, peak < -0.9 dBFS, loop sample discontinuity <0.015",
      auditoryReview:
        "UNVERIFIED: numerical checks do not establish warmth, clarity, or comfort",
      rows,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Audio technical audit passed for ${rows.length} assets. Auditory review remains unverified.`,
);
