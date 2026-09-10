import { discoveries, habitats } from "./catalog";

/** Reviewed non-personal scripts. Provider input is selected here, never supplied by a browser. */
export const narrationCues: Record<string, string> = {
  "narration-welcome":
    "Hello, I'm Elise! Ready for an ocean adventure? Choose a place, and we'll explore together.",
  "narration-controls":
    "Tell me, swim forward! You can say, go faster, or, surface. See an animal? Ask, what is this fish? Say stop whenever you like.",
  "narration-surface":
    "Let's head up to the sunshine! Say stop whenever you'd like to pause.",
  "narration-no-target":
    "Let's swim a little closer. Then ask me, what is this fish?",
  "narration-idle":
    "Ooh, I wonder what we'll find! Say swim forward, or ask me about something nearby.",
  "narration-listening":
    "I'm listening! Try saying, swim forward. Say stop to stay here.",
  "narration-journal":
    "Look at everything we've discovered! Choose a picture to hear its story again.",
  "narration-start":
    "Here we are! Something interesting is just ahead. Ask me, what is this fish?",
  "narration-return":
    "We're back where we started. Where shall we explore next?",
  "narration-stop": "Let's float right here for a moment.",
  "narration-help":
    "You can tell me, swim forward, go faster, or, surface. Ask, what is this fish, to discover something nearby. After its card opens, say close, and we'll keep exploring. The buttons work too!",
};
export type NarrationLine = { id: string; text: string; evidenceIds: string[] };
export const narrationLines: readonly NarrationLine[] = [
  ...Object.entries(narrationCues).map(([id, text]) => ({
    id,
    text,
    evidenceIds: [],
  })),
  ...discoveries.map((d) => ({
    id: d.narrationAssetId,
    text: `${d.commonName}. ${d.childSentences.map((s) => s.text).join(" ")}`,
    evidenceIds: [...new Set(d.childSentences.flatMap((s) => s.evidenceIds))],
  })),
  ...habitats.flatMap((h) => [
    {
      id: `destination-${h.id}`,
      text: `${h.name}. ${h.description}`,
      evidenceIds: h.evidenceIds,
    },
    ...h.spawns.map((s) => ({
      id: `start-${h.id}-${s.id}`,
      text: `${s.name}. ${s.description}`,
      evidenceIds: h.evidenceIds,
    })),
    ...h.activities.map((a) => ({
      id: `narration-activity-${a.id}`,
      text: a.text,
      evidenceIds: h.evidenceIds,
    })),
  ]),
];
const lines = new Map(narrationLines.map((line) => [line.id, line]));
if (lines.size !== narrationLines.length)
  throw Error("Duplicate narration IDs");
export function getNarrationLine(id: string) {
  return lines.get(id);
}
