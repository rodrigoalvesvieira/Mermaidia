import {
  readFileSync,
  readdirSync,
  existsSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { AssetSchema, type AssetRecord } from "../src/shared/contracts";
// The Khronos validator publishes a CommonJS API without TypeScript declarations.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const validator = require("gltf-validator");
const manifests = readdirSync("assets/manifests").filter((f) =>
  f.endsWith(".json"),
);
const assets: AssetRecord[] = manifests
  .flatMap((f) => JSON.parse(readFileSync("assets/manifests/" + f, "utf8")))
  .map((a) => AssetSchema.parse(a));
const errors: string[] = [];
const reports: unknown[] = [];
const paths = new Set<string>();
for (const a of assets) {
  if (paths.has(a.localPath)) errors.push("duplicate path " + a.localPath);
  paths.add(a.localPath);
  if (a.distribution !== "approved") errors.push("unapproved asset " + a.id);
  if (!a.creator || !a.licenseIdOrTerms || !a.attribution)
    errors.push("missing provenance " + a.id);
  if (!existsSync(a.localPath)) {
    errors.push("missing file " + a.id);
    continue;
  }
  const bytes = readFileSync(a.localPath);
  if (createHash("sha256").update(bytes).digest("hex") !== a.sha256)
    errors.push("checksum " + a.id);
  if (a.localPath.endsWith(".glb")) {
    const r = await validator.validateBytes(new Uint8Array(bytes), {
      uri: a.localPath,
      maxIssues: 50,
    });
    reports.push({
      id: a.id,
      bytes: bytes.length,
      issues: r.issues,
      info: r.info,
    });
    if (r.issues.numErrors)
      errors.push("GLB " + a.id + ": " + r.issues.numErrors + " errors");
    const size = bytes.readUInt32LE(12);
    const json = JSON.parse(bytes.subarray(20, 20 + size).toString());
    if (a.id === "elise")
      for (const name of ["idle", "swim", "fast", "turn", "look", "surface"])
        if (!json.animations?.some((a: { name: string }) => a.name === name))
          errors.push("Elise missing clip " + name);
    if (json.cameras?.length || json.extensions?.KHR_lights_punctual)
      errors.push("unwanted camera/light " + a.id);
  }
}
function inventory(dir: string) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = dir + "/" + entry.name;
    if (entry.isDirectory()) inventory(path);
    else if (!paths.has(path))
      errors.push("unregistered production asset " + path);
  }
}
inventory("public/assets");
mkdirSync("artifacts", { recursive: true });
writeFileSync(
  "artifacts/asset-validation.json",
  JSON.stringify(
    { date: new Date().toISOString(), count: assets.length, errors, reports },
    null,
    2,
  ),
);
const attribution =
  "# Mermaidia asset credits\n\nGenerated from the checked asset registries. Research photographs are reference-only and are not shipped.\n\n" +
  assets
    .map(
      (a) =>
        `- **${a.id}** — ${a.creator}. ${a.licenseIdOrTerms}. ${a.attribution} [File](${a.localPath})`,
    )
    .join("\n");
writeFileSync("ATTRIBUTIONS.md", attribution);
console.log(
  `${assets.length} assets audited; ${errors.length} errors. Evidence: artifacts/asset-validation.json`,
);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
}
