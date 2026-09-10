import { sources, discoveries, habitats } from "../content/catalog";
import {
  SourceSchema,
  DiscoverySchema,
  HabitatSchema,
} from "../src/shared/contracts";
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
const assets = readdirSync("assets/manifests")
  .filter((f) => f.endsWith(".json"))
  .flatMap((f) => JSON.parse(readFileSync("assets/manifests/" + f, "utf8")));
const errors: string[] = [];
const sourceIds = new Set(sources.map((s) => s.id));
const ids = new Set(discoveries.map((d) => d.id));
const biological = discoveries.filter((d) =>
  ["animal", "plant", "alga", "fungus_or_microbe"].includes(d.category),
);
function checkEvidence(ids: string[], context: string, visual = false) {
  for (const id of ids) {
    const s = sources.find((s) => s.id === id);
    if (!s || !s.inspected || (visual && !s.visualInspected))
      errors.push(
        `${context}: uninspected ${visual ? "visual " : ""}source ${id}`,
      );
  }
}
for (const s of sources) SourceSchema.parse(s);
for (const d of discoveries) {
  DiscoverySchema.parse(d);
  d.childSentences.forEach((s) => checkEvidence(s.evidenceIds, d.id));
  checkEvidence(d.visualEvidenceIds, d.id, true);
  for (const id of [d.assetId, d.narrationAssetId])
    if (!assets.some((a) => a.id === id))
      errors.push(d.id + ": missing asset " + id);
  for (const p of d.habitatPlacements) {
    checkEvidence(p.evidenceIds, d.id);
    const h = habitats.find((h) => h.id === p.habitatId);
    if (!h || p.zoneIds.some((id) => !h.depthZones.some((z) => z.id === id)))
      errors.push(d.id + ": invalid placement");
  }
}
if (habitats.length !== 5) errors.push("Expected five habitats");
if (new Set(biological.map((d) => d.scientificName || d.commonName)).size < 24)
  errors.push("Need 24 distinct taxa");
for (const h of habitats) {
  HabitatSchema.parse(h);
  checkEvidence(h.evidenceIds, h.id);
  if (
    h.allowedDiscoveryIds.filter((id) => biological.some((d) => d.id === id))
      .length < 6
  )
    errors.push(h.id + ": fewer than six biological entries");
  if (
    h.allowedDiscoveryIds.filter((id) =>
      discoveries.some((d) => d.id === id && d.category !== "animal"),
    ).length < 2
  )
    errors.push(h.id + ": fewer than two nonanimal subjects");
  for (const e of h.entities) {
    const d = discoveries.find((d) => d.id === e.discoveryId);
    if (
      !d ||
      !h.allowedDiscoveryIds.includes(e.discoveryId) ||
      !d.habitatPlacements.some(
        (p) => p.habitatId === h.id && p.zoneIds.includes(e.zoneId),
      )
    )
      errors.push(h.id + ": invalid entity " + e.id);
  }
  for (const s of h.spawns) {
    if (s.position.some((p, i) => p < h.bounds.min[i] || p > h.bounds.max[i]))
      errors.push(h.id + ": spawn out of bounds");
    if (
      !h.entities.some(
        (e) =>
          Math.hypot(...e.position.map((p, i) => p - s.position[i])) -
            e.radius <
          5.5,
      )
    )
      errors.push(h.id + ": spawn lacks nearby discovery " + s.id);
  }
  for (const a of h.activities)
    if (a.targetIds.some((id) => !h.allowedDiscoveryIds.includes(id)))
      errors.push(h.id + ": invalid activity " + a.id);
}
for (const a of assets)
  for (const id of a.evidenceIds)
    if (!sourceIds.has(id)) errors.push(a.id + ": unknown evidence " + id);
if (ids.size !== discoveries.length) errors.push("Duplicate discovery ids");
mkdirSync("artifacts", { recursive: true });
writeFileSync(
  "artifacts/content-validation.json",
  JSON.stringify(
    {
      date: new Date().toISOString(),
      counts: {
        habitats: habitats.length,
        discoveries: discoveries.length,
        taxa: new Set(biological.map((d) => d.scientificName || d.commonName))
          .size,
        spawns: habitats.flatMap((h) => h.spawns).length,
        sources: sources.length,
      },
      errors,
    },
    null,
    2,
  ),
);
console.log(
  `${habitats.length} destinations, ${biological.length} biological entries; ${errors.length} errors`,
);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
}
const escape = (s: string) =>
  s.replace(
    /[&<>\"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;" })[c]!,
  );
writeFileSync(
  "public/credits.html",
  '<!doctype html><html lang="en"><meta charset="utf-8"><title>Mermaidia · Evidence & credits</title><style>body{font:18px/1.6 system-ui;max-width:900px;margin:40px auto;padding:20px;background:#f8f8ef;color:#23484a}a{color:#286d61}li{margin-bottom:16px}</style><h1>Mermaidia: evidence & credits</h1><p>Original artistic reconstructions; no research photographs or documentary recordings are redistributed.</p><h2>Places & art adjustments</h2>' +
    habitats
      .map(
        (h) =>
          `<h3>${escape(h.name)}</h3><p>${escape(h.location + " • " + h.season)}</p><p>${escape(h.spatialSimplifications.join(" "))}</p>`,
      )
      .join("") +
    "<h2>Inspected reference records</h2><ul>" +
    sources
      .map(
        (s) =>
          `<li><a href="${escape(s.url)}">${escape(s.publisher + " — " + s.title)}</a><br>${escape(s.locator || "")} · accessed ${escape(s.accessedOn)}</li>`,
      )
      .join("") +
    "</ul><h2>Original assets</h2><ul>" +
    assets
      .map(
        (a) =>
          `<li>${escape(a.id)} — ${escape(a.creator)}. ${escape(a.licenseIdOrTerms)}. ${escape(a.attribution)}</li>`,
      )
      .join("") +
    "</ul></html>",
);
