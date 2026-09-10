import { EnvelopeSchema, type CommandEnvelope } from "../shared/contracts";
import type { VoiceTarget } from "./parser";
export type VoiceContext = {
  sceneGeneration: number;
  sessionGeneration: number;
  targets: VoiceTarget[];
};
/** Shared acceptance gate: stale, duplicated, foreign-scene, invalid-target commands cannot execute. */
export class CommandGate {
  private seen = new Set<string>();
  private stoppedAt = -Infinity;
  invalidate(now = Date.now()) {
    this.stoppedAt = now;
  }
  reset() {
    this.seen.clear();
    this.stoppedAt = -Infinity;
  }
  accept(
    input: unknown,
    context: VoiceContext,
    now = Date.now(),
    maxAgeMs = 2000,
  ): CommandEnvelope | null {
    const parsed = EnvelopeSchema.safeParse(input);
    if (!parsed.success) return null;
    const e = parsed.data;
    if (
      e.sceneGeneration !== context.sceneGeneration ||
      e.sessionGeneration !== context.sessionGeneration ||
      e.finalizedAt < this.stoppedAt ||
      now - e.finalizedAt > maxAgeMs ||
      e.finalizedAt > now + 100 ||
      e.createdAt < e.finalizedAt ||
      e.createdAt > now + 100 ||
      this.seen.has(e.utteranceId)
    )
      return null;
    if (
      e.commands.some(
        (c) =>
          c.type === "approach" &&
          !context.targets.some((t) => t.id === c.targetId),
      )
    )
      return null;
    this.seen.add(e.utteranceId);
    if (this.seen.size > 512)
      this.seen.delete(this.seen.values().next().value!);
    if (e.commands.some((c) => c.type === "stop")) {
      e.commands = [{ type: "stop" }];
      this.invalidate(e.finalizedAt);
    }
    return e;
  }
}
