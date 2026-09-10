import { spawnSync } from "node:child_process";
/** Gentle transient compression makes a consistent speech level possible without exceeding the peak ceiling. */
export const narrationNormalization =
  "Gentle speech compression (threshold 0.063, ratio 2.5, attack 5 ms, release 80 ms) followed by measured two-pass FFmpeg loudnorm -22 LUFS / -6 dBTP; mono 24 kHz PCM16";
export function normalizeNarration(input: string, output: string) {
  const pre =
    "acompressor=threshold=0.063:ratio=2.5:attack=5:release=80:makeup=1";
  const measured = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-nostats",
      "-i",
      input,
      "-af",
      `${pre},loudnorm=I=-22:TP=-6:LRA=7:print_format=json`,
      "-f",
      "null",
      "-",
    ],
    { encoding: "utf8" },
  );
  const block = measured.stderr.match(/\{\s*"input_i"[\s\S]*?\}/)?.[0];
  if (measured.status !== 0 || !block)
    throw Error("Narration loudness measurement failed");
  const m = JSON.parse(block);
  for (const field of [
    "input_i",
    "input_tp",
    "input_lra",
    "input_thresh",
    "target_offset",
  ])
    if (!Number.isFinite(Number(m[field])))
      throw Error("Invalid narration loudness measurement");
  const filter = `${pre},loudnorm=I=-22:TP=-6:LRA=7:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  const result = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      input,
      "-af",
      filter,
      "-ar",
      "24000",
      "-ac",
      "1",
      output,
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw Error("Narration normalization failed");
}
