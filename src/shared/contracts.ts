import { z } from "zod";
export const Vec3Schema = z.tuple([
  z.number().finite(),
  z.number().finite(),
  z.number().finite(),
]);
export type Vec3 = z.infer<typeof Vec3Schema>;
export const SourceSchema = z.object({
  id: z.string(),
  url: z.url(),
  publisher: z.string(),
  title: z.string(),
  accessedOn: z.string(),
  locator: z.string().optional(),
  supports: z.array(z.string()).min(1),
  inspected: z.boolean(),
  visualInspected: z.boolean().optional(),
});
export type SourceRecord = z.infer<typeof SourceSchema>;
export const AssetSchema = z.object({
  id: z.string(),
  localPath: z.string(),
  sha256: z.string().length(64),
  creator: z.string(),
  originUrl: z.string().optional(),
  licenseIdOrTerms: z.string(),
  licenseUrl: z.string().optional(),
  attribution: z.string(),
  modifications: z.array(z.string()),
  distribution: z.enum(["approved", "reference_only", "blocked"]),
  evidenceIds: z.array(z.string()),
  buildRecipe: z.string().optional(),
});
export type AssetRecord = z.infer<typeof AssetSchema>;
export const DiscoverySchema = z.object({
  id: z.string(),
  commonName: z.string(),
  scientificName: z.string().optional(),
  category: z.enum([
    "animal",
    "plant",
    "alga",
    "fungus_or_microbe",
    "geological_feature",
    "human_made_feature",
  ]),
  childSentences: z
    .array(
      z.object({ text: z.string(), evidenceIds: z.array(z.string()).min(1) }),
    )
    .min(1),
  visualEvidenceIds: z.array(z.string()).min(1),
  assetId: z.string(),
  narrationAssetId: z.string(),
  habitatPlacements: z.array(
    z.object({
      habitatId: z.string(),
      zoneIds: z.array(z.string()),
      evidenceIds: z.array(z.string()).min(1),
      realDepthM: z.tuple([z.number(), z.number()]).optional(),
      season: z.string().optional(),
    }),
  ),
  realSizeM: z.tuple([z.number(), z.number()]).optional(),
  visualAdjustments: z.array(z.string()),
  appearance: z.string(),
  behavior: z.string(),
  modelKind: z.string(),
  color: z.string(),
});
export type DiscoveryRecord = z.infer<typeof DiscoverySchema>;
export const SpawnSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  position: Vec3Schema,
  heading: z.number(),
  zoneId: z.string(),
});
export type SpawnDefinition = z.infer<typeof SpawnSchema>;
export const ActivitySchema = z.object({
  id: z.string(),
  text: z.string(),
  targetIds: z.array(z.string()),
  kind: z.enum(["discover", "surface", "watch"]),
});
export type ActivityDefinition = z.infer<typeof ActivitySchema>;
export const EntitySchema = z.object({
  id: z.string(),
  discoveryId: z.string(),
  position: Vec3Schema,
  radius: z.number().positive(),
  zoneId: z.string(),
  behavior: z.enum([
    "school",
    "graze",
    "pulse",
    "glide",
    "sway",
    "still",
    "fly",
    "surface",
  ]),
  scale: z.number().positive().default(1),
});
export type EntityInstance = z.infer<typeof EntitySchema>;
export const HabitatSchema = z.object({
  id: z.string(),
  name: z.string(),
  subtitle: z.string(),
  location: z.string(),
  season: z.string(),
  theme: z.enum(["reef", "caribbean", "ice", "wreck", "deep"]),
  color: z.string(),
  accent: z.string(),
  description: z.string(),
  evidenceIds: z.array(z.string()),
  spatialSimplifications: z.array(z.string()),
  depthZones: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      realDepthM: z.tuple([z.number(), z.number()]),
      renderY: z.tuple([z.number(), z.number()]),
    }),
  ),
  allowedDiscoveryIds: z.array(z.string()),
  bounds: z.object({ min: Vec3Schema, max: Vec3Schema }),
  surfaceRoute: z.array(Vec3Schema).min(1),
  surfaceOpenings: z.array(Vec3Schema).optional(),
  spawns: z.array(SpawnSchema).length(3),
  landmarks: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        position: Vec3Schema,
        kind: z.string(),
      }),
    )
    .min(3),
  activities: z.array(ActivitySchema).min(3),
  entities: z.array(EntitySchema).min(6),
  lighting: z.object({
    water: z.string(),
    fog: z.number(),
    exposure: z.number(),
  }),
  audio: z.string(),
});
export type HabitatDefinition = z.infer<typeof HabitatSchema>;
export const CommandSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("swim") }),
  z.strictObject({ type: z.literal("stop") }),
  z.strictObject({
    type: z.literal("turn"),
    degrees: z.union([z.literal(-30), z.literal(30), z.literal(180)]),
  }),
  z.strictObject({
    type: z.literal("lateral"),
    direction: z.union([z.literal(-1), z.literal(1)]),
  }),
  z.strictObject({
    type: z.literal("vertical"),
    direction: z.union([z.literal(-1), z.literal(1)]),
  }),
  z.strictObject({
    type: z.literal("speed"),
    delta: z.union([z.literal(-1), z.literal(1)]),
  }),
  z.strictObject({ type: z.literal("surface") }),
  z.strictObject({ type: z.literal("dive") }),
  z.strictObject({ type: z.literal("return") }),
  z.strictObject({ type: z.literal("approach"), targetId: z.string().max(80) }),
  z.strictObject({
    type: z.enum(["inspect", "pause", "resume", "close", "journal", "help"]),
  }),
]);
export type VoiceCommand = z.infer<typeof CommandSchema>;
export const EnvelopeSchema = z.strictObject({
  id: z.string(),
  utteranceId: z.string(),
  sceneGeneration: z.number().int(),
  sessionGeneration: z.number().int(),
  finalizedAt: z.number(),
  createdAt: z.number(),
  commands: z.array(CommandSchema).min(1).max(3),
});
export type CommandEnvelope = z.infer<typeof EnvelopeSchema>;
export type GameMode =
  | "choosing"
  | "loading"
  | "exploring"
  | "inspecting"
  | "journal"
  | "paused"
  | "transitioning";
export type VoiceReadiness =
  | "off"
  | "needs-setup"
  | "requesting-permission"
  | "connecting"
  | "listening"
  | "processing"
  | "disconnected"
  | "failed";
