import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
const blender =
  process.env.BLENDER_BIN ||
  (existsSync("/Applications/Blender.app/Contents/MacOS/Blender")
    ? "/Applications/Blender.app/Contents/MacOS/Blender"
    : "blender");
const commands: [string, string[]][] = [
  [
    blender,
    [
      "--background",
      "--factory-startup",
      "--python-exit-code",
      "1",
      "--python",
      "scripts/blender/build_assets.py",
      "--",
      "--seed",
      "4107",
      "--output",
      "public/assets",
      "--portraits",
      "--views",
    ],
  ],
  ["node", ["scripts/blender/optimize.mjs"]],
  ["npx", ["tsx", "scripts/audio-build.ts"]],
  ["python3", ["scripts/audio/build-bird-call.py"]],
  ["npx", ["tsx", "scripts/validate-assets.ts"]],
];
for (const [command, args] of commands) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}
