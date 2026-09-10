import { VoiceController } from "../../src/voice/VoiceController";
import { parseVoiceCommand, normalizeSpeech } from "../../src/voice/parser";
const started = Date.now();
const observations: unknown[] = [];
const speech = new Map<
  string,
  { start: number; end?: number; endedAt?: number }
>();
const create = RTCPeerConnection.prototype.createDataChannel;
RTCPeerConnection.prototype.createDataChannel = function (...args) {
  const channel = create.apply(this, args);
  channel.addEventListener("message", (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "input_audio_buffer.speech_started")
        speech.set(data.item_id, { start: data.audio_start_ms });
      if (data.type === "input_audio_buffer.speech_stopped")
        Object.assign(speech.get(data.item_id) ?? {}, {
          end: data.audio_end_ms,
          endedAt: Date.now(),
        });
      if (
        data.type !== "conversation.item.input_audio_transcription.completed" ||
        typeof data.transcript !== "string"
      )
        return;
      const text = normalizeSpeech(data.transcript),
        commands = parseVoiceCommand(data.transcript),
        turn = speech.get(data.item_id);
      const values = Array.isArray(data.logprobs)
        ? data.logprobs
            .filter(
              (x: any) =>
                typeof x.logprob === "number" && /[a-z]/i.test(x.token ?? ""),
            )
            .map((x: any) => x.logprob)
        : [];
      observations.push({
        atMs: Date.now() - started,
        expectedStop: text === "stop",
        commandTypes: commands?.map((c) => c.type) ?? null,
        verticalForm:
          commands?.[0]?.type === "vertical"
            ? /^(up|down|higher|lower)$/.test(text)
              ? "bare"
              : "imperative"
            : null,
        audioStartMs: turn?.start,
        audioEndMs: turn?.end,
        vadSpanMs: turn?.end !== undefined ? turn.end - turn.start : null,
        recognitionMs: turn?.endedAt ? Date.now() - turn.endedAt : null,
        lexicalLogprobs: values,
        minLexicalProbability: values.length
          ? Math.exp(Math.min(...values))
          : null,
      });
      speech.delete(data.item_id);
    } catch {
      /* No provider payload logging. */
    }
  });
  return channel;
};
const commands: unknown[] = [];
const controller = new VoiceController({
  context: () => ({ sceneGeneration: 1, sessionGeneration: 1, targets: [] }),
  onStatus: () => {},
  onCommands: (e) =>
    commands.push({
      atMs: Date.now() - started,
      types: e.commands.map((c) => c.type),
    }),
});
document
  .querySelector("button")!
  .addEventListener(
    "click",
    () => void controller.start({ adultDevelopment: true }),
  );
Object.assign(window, {
  __diagnose: {
    snapshot: () => ({
      observations,
      commands,
      diagnostics: controller.diagnostics,
    }),
    stop: () => controller.dispose(),
  },
});
