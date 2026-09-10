import {
  normalizeNarration,
  narrationNormalization,
} from "./audio/normalize-narration";
import "dotenv/config";
import { mkdir, readFile, writeFile, rename, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { narrationLines } from "../content/narration";
import {
  narrator,
  narrationFingerprint,
  openAINarration,
  readBuiltNarration,
} from "../server/narration";
import type { AssetRecord } from "../src/shared/contracts";

// Explicit command invocation is the generation action. Never run on install/build.
const selected = process.argv
  .find((arg) => arg.startsWith("--only="))
  ?.slice(7)
  .split(",");
if (selected?.some((id) => !narrationLines.some((line) => line.id === id)))
  throw Error("Unknown reviewed narration ID");
const lines = narrationLines.filter(
  (line) => !selected || selected.includes(line.id),
);
if (!process.env.OPENAI_API_KEY) {
  await mkdir("artifacts/narration", { recursive: true });
  await writeFile(
    "artifacts/narration/build-report.json",
    JSON.stringify(
      {
        date: new Date().toISOString(),
        status: "BLOCKED",
        reason:
          "OPENAI_API_KEY is not configured; no provider request was made and no audio was changed.",
        model: narrator.model,
        voice: narrator.voice,
        requested: lines.length,
        results: [],
        auditoryReview: "Unavailable: preferred voice has not been generated.",
      },
      null,
      2,
    ) + "\n",
  );
  console.error(
    "Narration generation needs OPENAI_API_KEY on the server. Existing audio was not changed.",
  );
  process.exit(1);
}
const ffmpeg = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
if (ffmpeg.status !== 0)
  throw Error("Install FFmpeg before building narration");
await mkdir("artifacts/narration", { recursive: true });
await mkdir("public/assets/audio", { recursive: true });
const report: { id: string; status: string; sha256?: string }[] = [];
let failed = false;
for (const line of lines) {
  if (await readBuiltNarration(line)) {
    report.push({ id: line.id, status: "existing-verified" });
    continue;
  }
  const temp = `artifacts/narration/${line.id}-raw.wav`;
  const staged = `artifacts/narration/${line.id}-normalized.wav`;
  try {
    const bytes = await openAINarration(line, AbortSignal.timeout(20_000));
    await writeFile(temp, bytes);
    normalizeNarration(temp, staged);
    const audio = await readFile(staged),
      sha256 = createHash("sha256").update(audio).digest("hex");
    const record: AssetRecord = {
      id: line.id,
      localPath: `public/assets/audio/${line.id}.wav`,
      sha256,
      creator: "Mermaidia original scripts; OpenAI speech generation",
      licenseIdOrTerms:
        "Original Mermaidia scripted text rendered using OpenAI built-in Marin voice under OpenAI service terms; AI-generated narration, no cloned performer or third-party recording.",
      licenseUrl: "https://openai.com/policies/services-agreement/",
      attribution:
        "AI-generated voice: OpenAI gpt-4o-mini-tts, built-in Marin. Original Mermaidia character and reviewed scripts.",
      modifications: [
        `Model: ${narrator.model}; voice: ${narrator.voice}`,
        `Narration fingerprint: ${narrationFingerprint(line)}`,
        narrationNormalization,
        `Generated: ${new Date().toISOString()}`,
      ],
      distribution: "approved",
      evidenceIds: line.evidenceIds,
      buildRecipe: "npx tsx scripts/narration-build.ts",
    };
    const manifest = JSON.parse(
      await readFile("assets/manifests/audio.json", "utf8"),
    ) as AssetRecord[];
    await rename(staged, record.localPath);
    await writeFile(
      "assets/manifests/audio.json",
      JSON.stringify(
        [...manifest.filter((r) => r.id !== line.id), record],
        null,
        2,
      ) + "\n",
    );
    report.push({ id: line.id, status: "generated", sha256 });
    console.log(`Generated ${line.id}`);
  } catch {
    report.push({ id: line.id, status: "failed-provider-or-normalization" });
    failed = true;
    break;
  } finally {
    await rm(temp, { force: true });
    await rm(staged, { force: true });
  }
}
await writeFile(
  "artifacts/narration/build-report.json",
  JSON.stringify(
    {
      date: new Date().toISOString(),
      status: failed ? "FAILED" : "COMPLETE",
      model: narrator.model,
      voice: narrator.voice,
      instructions: narrator.instructions,
      auditoryReview:
        "Not performed by this build script; adult listening review required to assess delivery and scientific pronunciations",
      requested: lines.length,
      results: report,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Narration: ${report.filter((r) => r.status === "generated").length} generated, ${report.filter((r) => r.status === "existing-verified").length} verified existing. Ambient and bird assets preserved.`,
);
if (failed) {
  console.error(
    "Narration generation stopped; see the sanitized build report. Existing successful assets remain registered.",
  );
  process.exitCode = 1;
}
