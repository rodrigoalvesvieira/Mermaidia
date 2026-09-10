import type { HabitatDefinition, Vec3 } from "../shared/contracts";
import { seafloorHeight } from "./terrain";

export const REGION_SIZE = 48;
export const WORLD_HALF_SIZE = 120;
export const explorationRegions = Array.from({ length: 25 }, (_, i) => ({
  x: ((i % 5) - 2) * REGION_SIZE,
  z: (Math.floor(i / 5) - 2) * REGION_SIZE,
  index: i,
}));

/** Expand encounter space, not animal scale or the scientifically annotated depths. */
export function expandHabitat(h: HabitatDefinition): HabitatDefinition {
  const originals = h.entities;
  const entities = [...originals];
  const landmarks = [...h.landmarks];
  for (const region of explorationRegions) {
    if (!region.x && !region.z) continue;
    const angle = region.index * 2.399963;
    const cos = Math.cos(angle),
      sin = Math.sin(angle);
    for (const [i, source] of originals.entries()) {
      // One real wreck and one island shore; don't stamp copies of either across the ocean.
      if (
        [
          "wreck-bow",
          "wreck-ribs",
          "beach-sand",
          "buff-banded-rail",
          "sea-ice",
        ].includes(source.discoveryId)
      )
        continue;
      if (source.behavior === "fly" && region.index % 3) continue;
      const x =
        region.x +
        source.position[0] * cos -
        source.position[2] * sin +
        Math.sin(i * 3 + region.index) * 3;
      const z =
        region.z +
        source.position[0] * sin +
        source.position[2] * cos +
        Math.cos(i * 2 + region.index) * 3;
      let y = source.position[1];
      if (
        h.theme !== "deep" &&
        ["still", "sway"].includes(source.behavior) &&
        y < -7
      ) {
        const clearance = Math.max(
          0.15,
          y - seafloorHeight(source.position[0], source.position[2], h.theme),
        );
        y = Math.min(-3, seafloorHeight(x, z, h.theme) + clearance);
      }
      entities.push({
        ...source,
        id: `${source.id}-region-${region.index}`,
        position: [x, y, z],
        scale: source.scale * (0.9 + ((i + region.index) % 5) * 0.05),
      });
    }
    landmarks.push({
      id: `exploration-${region.index}`,
      name:
        h.theme === "deep"
          ? "Drifter gathering"
          : h.theme === "ice"
            ? "Ice garden"
            : "Outer reef garden",
      position: [region.x, h.theme === "deep" ? -6 : -8, region.z],
      kind:
        h.theme === "deep" ? "midwater" : h.theme === "ice" ? "rock" : "coral",
    });
  }
  if (h.theme === "wreck") {
    const bow = entities.find((e) => e.discoveryId === "wreck-bow")!;
    bow.position = [8, -10, -100];
    const bowLandmark = landmarks.find((l) => l.id === "bow-landmark");
    if (bowLandmark) bowLandmark.position = [8, -9, -100];
    const ribs = originals.find((e) => e.discoveryId === "wreck-ribs")!;
    for (let i = 1; i <= 5; i++)
      entities.push({
        ...ribs,
        id: `wreck-ribs-section-${i}`,
        position: [-7 + Math.sin(i) * 2, -10, -12 - i * 15],
      });
  }
  // The picture-based wildlife start also lets players jump into an outer region.
  const wildlifeId = {
    reef: "giant-clam",
    caribbean: "elkhorn-coral",
    ice: "weddell-seal",
    wreck: "wreck-bow",
    deep: "barreleye",
  }[h.theme];
  const wildlife = entities.find(
    (e) =>
      e.discoveryId === wildlifeId &&
      (h.theme === "wreck" || e.id.endsWith("region-8")),
  );
  const spawns = h.spawns.map((spawn, i) => {
    if (i === 1 && wildlife)
      return {
        ...spawn,
        position: [
          wildlife.position[0],
          spawn.position[1],
          wildlife.position[2] + 6,
        ] as Vec3,
      };
    if (i === 2 && h.theme === "deep") {
      const jelly = entities.find(
        (e) => e.discoveryId === "big-red-jelly" && e.id.endsWith("region-16"),
      )!;
      return {
        ...spawn,
        position: [jelly.position[0], -10, jelly.position[2] + 6] as Vec3,
      };
    }
    return spawn;
  });
  const surfaceOpenings: Vec3[] | undefined =
    h.theme === "ice"
      ? [-80, 0, 80].flatMap((x) =>
          [-80, 0, 80].map((z) => [14 + x, 0, 10 + z] as Vec3),
        )
      : undefined;
  return {
    ...h,
    entities,
    landmarks,
    spawns,
    surfaceOpenings,
    bounds: {
      min: [-WORLD_HALF_SIZE, h.bounds.min[1], -WORLD_HALF_SIZE],
      max: [WORLD_HALF_SIZE, h.bounds.max[1], WORLD_HALF_SIZE],
    },
    spatialSimplifications: [
      ...h.spatialSimplifications,
      "Expanded fictional 240 × 240 m exploration area with 25 encounter regions; animal scale and annotated depth zones are retained. Repeated wildlife encounters are not distinct species or a population survey.",
      ...(h.theme === "ice"
        ? [
            "Nine fictional open-water leads provide nearby surface access; their positions are not a geographic survey.",
          ]
        : []),
      ...(h.theme === "wreck"
        ? [
            "A single broken wreck extends roughly 100 m along its exterior, with repeated steel support sections and surrounding reef encounters.",
          ]
        : []),
    ],
  };
}
