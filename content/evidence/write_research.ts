import { writeFileSync } from "node:fs";
import { sources, discoveries, habitats } from "../catalog";
import {
  SourceSchema,
  DiscoverySchema,
  HabitatSchema,
} from "../../src/shared/contracts";
const sourceById = new Map(sources.map((s) => [s.id, s]));
const links = (ids: string[]) =>
  [...new Set(ids)]
    .map((id) => {
      const s = sourceById.get(id)!;
      return `[${id}](${s.url})`;
    })
    .join(", ");
const isBiological = (d: (typeof discoveries)[number]) => !!d.scientificName;
const notes: Record<string, string> = {
  "green-turtle":
    "Local marine-biologist field tour explicitly documents green turtles; identification cross-checked NOAA. Adult interpretation; no nesting assertion.",
  anemonefish:
    "Genus label: local account does not identify exact species. Host anemone is not separately counted.",
  "giant-clam":
    "Hedley (1921) personally collected T. gigas at Green Island off Cairns (p. 170, plate XXVII); recent field-tour account records giant clams without species. Historical occurrence only, no present abundance claim.",
  "staghorn-coral":
    "Genus-level Indo-Pacific Acropora; 1989 local study proves historical occurrence, not present reef cover. Museum morphology reference is from Lizard Island.",
  seagrass:
    "Green Island specimen records support species. Fiji photograph used only for appearance.",
  "buff-banded-rail":
    "Local eco-walk account plus BirdLife identification. Walking above water, never underwater.",
  "hawksbill-turtle": "Local NPS occurrence. Adult; no nest interaction.",
  "blue-tang":
    "Atlantic adult coloration; never Pacific palette tang. Brochure is historical.",
  "elkhorn-coral":
    "Historical reef form; scene is not a survey of current live coral cover.",
  "sea-fan":
    "Gorgonia genus label; site operator says sea fans, not exact species.",
  "spiny-lobster":
    "Local reports identify lobster; sanctuary anatomy supports Caribbean spiny lobster interpretation.",
  "brown-pelican":
    "Local NPS for Buck Island, sanctuary coast for Keys, NOAA Monterey occurrence; common surface visitor, not a deep animal.",
  "turtle-grass":
    "2022 NPS report pp.23–24/120 documents southern meadows; flowering plant, not algae.",
  "blue-striped-grunt":
    "2008 Benwood photo names species; independently compared Florida Museum anatomy. Historical encounter, not a current abundance claim.",
  "yellowtail-snapper":
    "Local Benwood operator observation and NOAA morphology.",
  "sergeant-major":
    "Local Benwood operator observation and Florida Museum morphology.",
  "green-moray":
    "2021 Benwood dive observation, NOAA morphology and museum behavior.",
  "adelie-penguin": "Windmill Islands summer population; adult swimming.",
  "emperor-penguin": "Casey visitor only; no summer breeding colony.",
  "weddell-seal":
    "Local Casey record; breathing shown at an actual open-water lead.",
  "southern-elephant-seal":
    "Visiting adult female, modest muzzle; not a male trunk.",
  "leopard-seal": "Solitary and separated; no feeding or hunting scene.",
  "snow-petrel":
    "Casey tracking study supports local bird; black bill, flight above open water.",
  "antarctic-krill":
    "AAP Adélie account supports krill near Windmill feeding grounds. Enlarged substantially for visibility.",
  "bloody-belly-comb-jelly":
    "MBARI interval 250–1500 m; encounter 500 m. Reflected comb highlights are not asserted self-emission.",
  barreleye:
    "MBARI interval 600–800 m; encounter 700 m. Dome/eyes cross-checked separate aquarium account.",
  "vampire-squid":
    "MBARI interval 600–900 m; encounter 700 m. Marine-snow feeding cross-checked NOAA. No defensive glow.",
  "big-red-jelly":
    "MBARI interval 600–2100 m; encounter 1200 m. Broad oral arms, no long trailing tentacles.",
  "redhead-larvacean":
    "Monterey discovery account, interval 200–750 m; encounter 500 m. Body and mucus house have different scales.",
};
const local: Record<string, Record<string, string[]>> = {
  australia: {
    "green-turtle": ["green-biology-local", "green-turtle-noaa"],
    anemonefish: ["green-biology-local", "gbr-great8"],
    "giant-clam": ["green-clam-museum", "green-biology-local"],
    "staghorn-coral": ["green-coral-study"],
    seagrass: ["seagrass-herbarium"],
    "buff-banded-rail": ["green-rail", "rail-birdlife"],
  },
  caribbean: {
    "turtle-grass": ["buck-condition-2022"],
    "brown-pelican": ["buck-animals"],
    "hawksbill-turtle": ["buck-animals"],
  },
  antarctica: {
    "snow-petrel": ["snow-petrel-casey"],
    "antarctic-krill": ["adelie-aap", "krill-aap"],
  },
  shipwreck: {
    "blue-striped-grunt": ["benwood-grunts", "benwood-observation"],
    "yellowtail-snapper": ["benwood-fish-local"],
    "sergeant-major": ["benwood-fish-local"],
    "green-moray": ["benwood-observation"],
    "spiny-lobster": ["benwood-observation"],
    "sea-fan": ["benwood-fish-local"],
    "brown-pelican": ["keys-creatures"],
  },
  deepsea: { "brown-pelican": ["monterey-pelican"] },
};
let doc = `# Habitat research and evidence review\n\nReviewed 2026-09-10 by the content implementation agent. These are original educational reconstructions, not real-time wildlife surveys or scientific certification. All 39 discovery records, 29 distinct biological taxa/group labels, five locations and fifteen starts are in [catalog.ts](../content/catalog.ts). Facts, visual evidence and placement metadata are separate fields. Source text was opened; specific visual inspection and access failures are recorded in [REFERENCE_INDEX.md](REFERENCE_INDEX.md). No reference photograph or documentary footage ships with the game.\n\nThe art worker compares generated assets against these references; see [ART_DIRECTION.md](ART_DIRECTION.md). Behavior descriptions below come from species accounts and field observations; they do not claim that every linked still image demonstrates motion. Seasons are encounter contexts, not claims that every animal is always present. Rendered coordinates and enlarged foreground subjects are teaching conveniences.\n`;
for (const h of habitats) {
  const ds = h.allowedDiscoveryIds.map((id) =>
    discoveries.find((d) => d.id === id)!,
  );
  doc += `\n## ${h.name} — ${h.location}\n\n${h.season}. ${ds.filter(isBiological).length} biological entries; ${ds.filter((d) => d.category !== "animal").length} non-animal entries.\n\n${h.spatialSimplifications.join(" ")}\n\nHabitat evidence: ${links(h.evidenceIds)}.\n\n| Subject / planned asset | Local occurrence evidence | Depth / substrate / season | Inspected visual reference | Behavior | Uncertainty / interpretation |\n|---|---|---|---|---|---|\n`;
  for (const d of ds) {
    const p = d.habitatPlacements.find((p) => p.habitatId === h.id)!;
    const loc =
      local[h.id]?.[d.id] ??
      (h.id === "caribbean"
        ? ["buck-front"]
        : h.id === "antarctica"
          ? ["casey-aap"]
          : h.id === "deepsea"
            ? d.childSentences.flatMap((s) => s.evidenceIds)
            : h.evidenceIds);
    const sub =
      d.category === "plant"
        ? "rooted sediment"
        : d.modelKind === "coral" ||
            d.modelKind === "elkhorn" ||
            d.modelKind === "fan"
          ? "attached reef/structure"
          : h.id === "deepsea" && d.id !== "brown-pelican"
            ? "open midwater"
            : p.zoneIds.includes("surface")
              ? "surface / shore / sky"
              : "coastal water or hard/sandy substrate";
    doc += `| ${d.commonName}${d.scientificName ? ` (*${d.scientificName}*)` : ""}; \`${d.assetId}.glb\` | ${links(loc)} | ${p.realDepthM?.join("–")} m encounter window; ${sub}; ${h.season} | ${links(d.visualEvidenceIds)} | ${d.behavior} | ${notes[d.id] ?? "Original compact site feature; geometry and spacing simplified."} |\n`;
  }
  doc += `\nSpawns: ${h.spawns.map((s) => `${s.name} (${s.position.join(", ")})`).join("; ")}. Landmarks: ${h.landmarks.map((l) => l.name).join("; ")}. Activities: ${h.activities.map((a) => a.text).join("; ")}.\n`;
}
doc += `\n## Fact and scale review\n\nEach child sentence is original prose and has evidence IDs in the catalog. Particularly surprising claims use independent institutional cross-checks: the barreleye head shield (MBARI and Monterey Bay Aquarium) and vampire-squid marine-snow feeding (MBARI and NOAA). The two are related research communities, not claims of independent experiments. No threatening natural-history detail is used in child narration.\n\nBiological model proportions, adult/juvenile interpretation, size ranges, identifying marks and species-specific locomotion are recorded in every discovery's \`appearance\`, \`realSizeM\`, \`behavior\` and \`visualAdjustments\`. Foreground enlargements, slower motion, compressed geography and fictional observation lighting are disclosed. Deep red color is revealed by that light; it is not evidence of sunlight at 1,200 m.\n\n## Review limits\n\nThe content agent checked source pages, photo identity, regional fit, season and depth consistency. This is agent inspection, not a marine biologist's signed review. Sources establish plausible encounters rather than simultaneous co-occurrence in the compressed scene. Green Island local occurrence combines an Australian Museum collected-specimen account, historical coral research, botanical specimen records and a marine-biologist field-tour account; it is not inferred from the broad Great Barrier Reef range alone. The generic travel-magazine source is supporting context rather than a scientific authority. Benwood specific fish observations include dated diver photography/operator records, checked against government/museum identification. Historical evidence is never used to assert present abundance. BBC footage was unavailable to inspect in this environment; no watched timecode is fabricated.\n`;
writeFileSync("docs/HABITAT_RESEARCH.md", doc);
sources.forEach((s) => SourceSchema.parse(s));
discoveries.forEach((d) => DiscoverySchema.parse(d));
habitats.forEach((h) => HabitatSchema.parse(h));
const failures: string[] = [];
for (const d of discoveries) {
  for (const id of [
    ...d.visualEvidenceIds,
    ...d.childSentences.flatMap((s) => s.evidenceIds),
    ...d.habitatPlacements.flatMap((p) => p.evidenceIds),
  ])
    if (!sourceById.has(id)) failures.push(`Unknown ${id}`);
  if (!d.visualEvidenceIds.some((id) => sourceById.get(id)?.visualInspected))
    failures.push(`No inspected visual ${d.id}`);
}
for (const h of habitats) {
  const ds = h.allowedDiscoveryIds.map((id) =>
    discoveries.find((d) => d.id === id)!,
  );
  if (ds.filter(isBiological).length < 6) failures.push(`Too few taxa ${h.id}`);
  if (ds.filter((d) => d.category !== "animal").length < 2)
    failures.push(`Too few nonanimal ${h.id}`);
  for (const a of h.activities)
    if (a.targetIds.some((id) => !h.allowedDiscoveryIds.includes(id)))
      failures.push(`Activity placement ${a.id}`);
}
const audit = {
  reviewedOn: "2026-09-10",
  sources: sources.length,
  discoveries: discoveries.length,
  biologicalTaxa: discoveries.filter(isBiological).length,
  habitats: habitats.map((h) => ({
    id: h.id,
    biological: h.allowedDiscoveryIds.filter((id) =>
      isBiological(discoveries.find((d) => d.id === id)!),
    ).length,
    spawns: h.spawns.length,
    activities: h.activities.length,
    landmarks: h.landmarks.length,
  })),
  failures,
};
writeFileSync(
  "content/evidence/content-audit.json",
  JSON.stringify(audit, null, 2) + "\n",
);
console.log(audit);
if (failures.length) process.exitCode = 1;

// The final taxon evidence audit is appended separately to preserve source limitations.
import { appendFileSync } from "node:fs";
appendFileSync(
  "docs/HABITAT_RESEARCH.md",
  `
## Final taxon-strength audit

The requested audit rechecked named species against local evidence. No spoken fact, common name, scientific name, asset ID or count changed. Giant clam remains *Tridacna gigas*: Hedley\'s Australian Museum revision documents personally collected specimens at Green Island off Cairns and explicitly labels them on plate XXVII. The 1921 date establishes historical presence, not a present-day population survey. A Queensland park-plan search result also mentioned the species, but its PDF endpoint returned HTTP410; it was not used as inspected evidence. Searches yielding Green Island in Taiwan or the Philippines were excluded.

Bluestriped grunt remains *Haemulon sciurus*: the inspected Jstuby photograph is dated 9 March 2008 and explicitly locates identified fish at Benwood; the general 2021 dive report corroborates grunts only. The specific photo, cross-checked against Florida Museum morphology, supplies the species-level bridge. Yellowtail snapper and sergeant major are both named in the local Benwood operator account; general snapper/damselfish references alone would not justify those identifications. Sea fans and reef Acropora retain honest genus labels. Anemonefish retain the genus label because GBR Biology\'s local account does not name a species.
`,
);
