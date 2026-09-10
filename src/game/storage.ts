import { z } from "zod";
const Settings = z.object({
  reducedMotion: z.boolean(),
  subtitles: z.boolean(),
  narration: z.number().min(0).max(1),
  ambience: z.number().min(0).max(1),
  muted: z.boolean(),
  hints: z.boolean(),
  speechControl: z.boolean().default(true),
  quality: z.enum(["low", "medium", "high"]),
});
export const SaveSchema = z.object({
  version: z.literal(1),
  journal: z.array(z.string()).max(200),
  activities: z.array(z.string()).max(200),
  lastStart: z
    .object({ habitatId: z.string(), spawnId: z.string() })
    .optional(),
  settings: Settings,
});
export type Save = z.infer<typeof SaveSchema>;
export const freshSave = (): Save => ({
  version: 1,
  journal: [],
  activities: [],
  settings: {
    reducedMotion:
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches,
    subtitles: true,
    narration: 0.8,
    ambience: 0.25,
    muted: false,
    hints: true,
    speechControl: true,
    quality: "medium",
  },
});
export function readSave(storage: Pick<Storage, "getItem">): Save {
  try {
    return SaveSchema.parse(JSON.parse(storage.getItem("mermaidia-v1") || ""));
  } catch {
    return freshSave();
  }
}
export function writeSave(storage: Pick<Storage, "setItem">, save: Save) {
  try {
    storage.setItem("mermaidia-v1", JSON.stringify(SaveSchema.parse(save)));
    return true;
  } catch {
    return false;
  }
}
