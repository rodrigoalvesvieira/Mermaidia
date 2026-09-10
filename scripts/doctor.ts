import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
const report: Record<string, unknown> = {
  date: new Date().toISOString(),
  os: os.platform(),
  architecture: os.arch(),
  cpu: os.cpus()[0]?.model,
  node: process.version,
  keyConfigured: Boolean(process.env.OPENAI_API_KEY),
  childCloudReady: false,
};
for (const [name, bin, args] of [
  ["npm", "npm", ["--version"]],
  [
    "blender",
    process.env.BLENDER_BIN ||
      (existsSync("/Applications/Blender.app/Contents/MacOS/Blender")
        ? "/Applications/Blender.app/Contents/MacOS/Blender"
        : "blender"),
    ["--version"],
  ],
  ["ffmpeg", "ffmpeg", ["-version"]],
  ["espeak-ng", "espeak-ng", ["--version"]],
] as [string, string, string[]][]) {
  try {
    report[name] = execFileSync(bin, args, { encoding: "utf8" }).split("\n")[0];
  } catch {
    report[name] = "MISSING";
  }
}
report.dependencies = JSON.parse(
  readFileSync("package.json", "utf8"),
).dependencies;
report.eliseGLB = existsSync("public/assets/models/elise.glb");
mkdirSync("artifacts", { recursive: true });
writeFileSync("artifacts/doctor.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (Object.values(report).includes("MISSING")) process.exitCode = 1;
