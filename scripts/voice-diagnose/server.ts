import "dotenv/config";
import express from "express";
import { registerVoiceRoutes } from "../../server/voice";
if (process.env.LIVE_AUDIO_TEST !== "1")
  throw Error("Synthetic diagnostic authorization required");
const model = process.env.DIAGNOSTIC_MODEL;
if (!["gpt-4o-mini-transcribe", "gpt-4o-transcribe"].includes(model ?? ""))
  throw Error("Diagnostic model not allowed");
const nativeFetch = globalThis.fetch;
globalThis.fetch = async (input, options) => {
  if (
    input === "https://api.openai.com/v1/realtime/calls" &&
    options?.body instanceof FormData
  ) {
    const session = JSON.parse(String(options.body.get("session")));
    session.audio.input.transcription.model = model;
    if (process.env.DIAGNOSTIC_FAST === "true") {
      session.audio.input.turn_detection.silence_duration_ms = 150;
      session.audio.input.turn_detection.prefix_padding_ms = 600;
    }
    session.include = ["item.input_audio_transcription.logprobs"];
    options.body.set("session", JSON.stringify(session));
  }
  return nativeFetch(input, options);
};
const app = express();
registerVoiceRoutes(app);
app.use(express.static("artifacts/voice/diagnose-client"));
app.listen(5185, "127.0.0.1");
