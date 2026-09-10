import type { VoiceCommand } from "../shared/contracts";
export type VoiceTarget = { id: string; name: string };
export function normalizeSpeech(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
/** null means unresolved; [] is intentionally no action and must never go to a model. */
export function parseVoiceCommand(
  text: string,
  targets: VoiceTarget[] = [],
): VoiceCommand[] | null {
  let s = normalizeSpeech(text);
  if (
    !s ||
    s.length > 400 ||
    /\b(don't|dont|do not|not|never|no|can't|cannot|shouldn't)\b/.test(s)
  )
    return [];
  s = s
    .replace(
      /^(?:hey elise |elise |okay |ok |please |(?:can|could|would|will) you |(?:can|could) we |i (?:want|would like) to |let's |lets )+/g,
      "",
    )
    .replace(/(?: please| for me| now)+$/, "")
    .trim();
  if (
    /^(stop|wait|stay here|hold still|stop swimming|stop moving)(\b|$)/.test(
      s,
    ) ||
    /\b(and|then) (stop|wait)(\b|$)/.test(s)
  )
    return [{ type: "stop" }];
  const parts = s.split(/\s+(?:and then|and|then)\s+/);
  if (parts.length > 1) {
    if (parts.length > 3) return [];
    const commands = parts.map((p) => parseVoiceCommand(p, targets));
    if (commands.some((c) => c === null || !c.length)) return [];
    const flat = commands.flat() as VoiceCommand[];
    if (
      flat.filter((c) =>
        [
          "lateral",
          "vertical",
          "swim",
          "surface",
          "dive",
          "return",
          "approach",
        ].includes(c.type),
      ).length > 1
    )
      return [];
    return flat;
  }
  if (
    /^(swim(?: forward| ahead| straight(?: ahead)?)?|go(?: (?:forward|ahead|straight(?: ahead)?))?|move (?:forward|ahead|straight(?: ahead)?)|keep swimming)$/.test(
      s,
    )
  )
    return [{ type: "swim" }];
  if (/^(turn|rotate|face)(?: to)?(?: the)? (right|left)$/.test(s))
    return [{ type: "turn", degrees: s.endsWith("right") ? 30 : -30 }];
  if (/^(turn around|turn back|face the other way)$/.test(s))
    return [{ type: "turn", degrees: 180 }];
  if (/^(go|move|swim)(?: to)?(?: the)? (right|left)$/.test(s))
    return [{ type: "lateral", direction: s.endsWith("right") ? 1 : -1 }];
  if (
    /^(?:(?:go|move|swim|take me) |a little )?(up|upwards?|down|downwards?|higher|lower)$/.test(
      s,
    )
  )
    return [
      { type: "vertical", direction: /(up|upwards?|higher)$/.test(s) ? 1 : -1 },
    ];
  if (
    /^(?:(?:go|swim|take me|head) to (?:the )?(?:surface|top)|visit the surface|let's go to the surface|lets go to the surface|surface)$/.test(
      s,
    )
  )
    return [{ type: "surface" }];
  if (/^(dive|go underwater|swim underwater|dive down)$/.test(s))
    return [{ type: "dive" }];
  if (
    /^(?:(?:(?:go|swim|move) )?(?:a little |a bit )?faster|speed up|speed me up)$/.test(
      s,
    )
  )
    return [{ type: "speed", delta: 1 }];
  if (
    /^(?:(?:(?:go|swim|move) )?(?:a little |a bit )?slower|slow down|slow me down)$/.test(
      s,
    )
  )
    return [{ type: "speed", delta: -1 }];
  if (
    /^(take me back|go to the start|back to the start|return to the start)$/.test(
      s,
    )
  )
    return [{ type: "return" }];
  if (
    /^(?:(?:what is|what's|whats|tell me about) (?:this|that)(?: (?:fish|animal|creature|coral|jellyfish|turtle|thing))?|look at this)$/.test(
      s,
    )
  )
    return [{ type: "inspect" }];
  const simple: Record<string, VoiceCommand["type"]> = {
    pause: "pause",
    "pause the game": "pause",
    resume: "resume",
    "keep playing": "resume",
    continue: "resume",
    "continue playing": "resume",
    "resume playing": "resume",
    "back to swimming": "resume",
    close: "close",
    "close this": "close",
    "close the card": "close",
    "close this card": "close",
    "close the journal": "close",
    "close the help": "close",
    "all done": "close",
    "open my journal": "journal",
    "show my journal": "journal",
    journal: "journal",
    help: "help",
    "help me": "help",
  };
  if (simple[s]) return [{ type: simple[s] } as VoiceCommand];
  const approach = s.match(
    /^(?:go to|swim to|look at|take me to|approach) (?:that |the |this )?(.+)$/,
  );
  if (approach) {
    const name = approach[1];
    const matching = targets.filter(
      (t) =>
        normalizeSpeech(t.name) === name ||
        normalizeSpeech(t.name).split(" ").includes(name),
    );
    return matching.length === 1
      ? [{ type: "approach", targetId: matching[0].id }]
      : [];
  }
  // Only plausible navigation reaches the bounded cloud interpretation path.
  if (
    !/\b(swim|move|turn|head|surface|dive|toward|towards|journal|pause|resume|forward|left|right|higher|lower)\b/.test(
      s,
    )
  )
    return [];
  return null;
}
