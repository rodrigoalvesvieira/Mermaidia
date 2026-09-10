import {
  CommandSchema,
  type CommandEnvelope,
  type VoiceCommand,
  type VoiceReadiness,
} from "../shared/contracts";
import { CommandGate, type VoiceContext } from "./commands";
import { parseVoiceCommand } from "./parser";
export type VoiceActivity =
  "hearing" | "interpreting" | "acted" | "ignored" | "narrating" | "ready";
export type VoiceOptions = {
  context: () => VoiceContext;
  onCommands: (envelope: CommandEnvelope) => void;
  onStatus: (status: VoiceReadiness, message?: string) => void;
  onTranscript?: (text: string) => void;
  onActivity?: (
    activity: VoiceActivity,
    commands?: VoiceCommand["type"][],
  ) => void;
};
export class VoiceController {
  private options: VoiceOptions;
  private generation = 0;
  private sequence = 0;
  private newestSequence = 0;
  private peer?: RTCPeerConnection;
  private channel?: RTCDataChannel;
  private stream?: MediaStream;
  private request?: AbortController;
  private pending?: AbortController;
  private gate = new CommandGate();
  private csrf = "";
  private narrating = false;
  private transmitting = true;
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private seen = new Set<string>();
  private turns = new Map<
    string,
    { sequence: number; finalizedAt: number; speechEnded?: boolean }
  >();
  private deadline = 0;
  private retries = 0;
  private enabled = false;
  private renewals = 0;
  private commandCount = 0;
  private lastCommands: VoiceCommand[] = [];
  private lastTiming?: {
    endOfSpeechAt: number | null;
    finalTranscriptAt: number;
    recognitionMs: number | null;
    interpretationMs: number;
    actionAt: number | null;
  };
  private visibility = () => {
    if (document.hidden) this.stop();
  };
  constructor(options: VoiceOptions) {
    this.options = options;
    if (typeof document !== "undefined")
      document.addEventListener("visibilitychange", this.visibility);
  }
  private status(s: VoiceReadiness, message?: string) {
    this.options.onStatus(s, message);
  }
  private remember(itemId: string) {
    this.seen.add(itemId);
    if (this.seen.size > 512)
      this.seen.delete(this.seen.values().next().value!);
  }
  private later(fn: () => void, ms: number) {
    const t = setTimeout(() => {
      this.timers.delete(t);
      fn();
    }, ms);
    this.timers.add(t);
    return t;
  }
  async start({
    adultDevelopment = false,
  }: { adultDevelopment?: boolean } = {}) {
    this.stop();
    if (!adultDevelopment) {
      this.status(
        "needs-setup",
        "Buttons are ready. A grown-up can check voice setup.",
      );
      return;
    }
    const gen = this.generation;
    this.enabled = true;
    this.retries = 0;
    this.renewals = 0;
    this.commandCount = 0;
    this.lastCommands = [];
    try {
      const request = new AbortController();
      this.request = request;
      const timeout = this.later(() => request.abort(), 8000);
      const enable = await fetch("/api/voice/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "adult-development", consent: true }),
        signal: this.request.signal,
      });
      clearTimeout(timeout);
      this.timers.delete(timeout);
      if (gen !== this.generation) return;
      if (!enable.ok) throw Error("setup");
      const body = await enable.json();
      if (gen !== this.generation) return;
      this.csrf = body.csrf;
      this.scheduleRenewal(body.maxSessionMs);
      await this.connect(gen);
    } catch (error) {
      if (gen === this.generation) {
        this.stop();
        this.status(
          "failed",
          error instanceof Error &&
            [
              "NotAllowedError",
              "PermissionDeniedError",
              "SecurityError",
            ].includes(error.name)
            ? "Microphone access is blocked. Allow it in your browser, then try again."
            : "Voice could not connect. Tap the microphone to try again.",
        );
      }
    }
  }
  private scheduleRenewal(maxSessionMs: unknown) {
    const lifetime =
      typeof maxSessionMs === "number" && Number.isFinite(maxSessionMs)
        ? Math.min(600_000, Math.max(60_000, maxSessionMs))
        : 600_000;
    this.deadline = Date.now() + lifetime;
    // Renew before the ten-minute application lease expires. Consent remains scoped
    // to this active adult listening session; stop/visibility/settings cancel it.
    this.later(
      () => {
        void this.renew();
      },
      lifetime - Math.min(60_000, lifetime / 10),
    );
  }
  private async renew() {
    if (!this.enabled) return;
    const gen = ++this.generation;
    this.request?.abort();
    this.cancelPending();
    this.closeMedia();
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    this.seen.clear();
    this.turns.clear();
    this.status("connecting", "Refreshing voice…");
    const request = new AbortController();
    this.request = request;
    const timeout = this.later(() => request.abort(), 8000);
    try {
      const response = await fetch("/api/voice/renew", {
        method: "POST",
        headers: { "x-voice-csrf": this.csrf },
        signal: request.signal,
      });
      if (!response.ok) throw Error("Renewal unavailable");
      const body = await response.json();
      if (gen !== this.generation || request.signal.aborted) return;
      clearTimeout(timeout);
      this.timers.delete(timeout);
      this.retries = 0;
      this.renewals++;
      this.scheduleRenewal(body.maxSessionMs);
      await this.connect(gen);
    } catch {
      if (gen === this.generation) {
        this.stop();
        this.status(
          "disconnected",
          "Voice could not reconnect. Tap the microphone to try again.",
        );
      }
    } finally {
      clearTimeout(timeout);
      this.timers.delete(timeout);
    }
  }
  private async connect(gen: number) {
    if (!navigator.mediaDevices?.getUserMedia) throw Error("No capture");
    this.status("requesting-permission");
    // An unanswered prompt cannot block play; even a late permission grant is torn down.
    const permission = this.later(() => {
      if (gen === this.generation) {
        this.stop();
        this.status(
          "failed",
          "Microphone permission was not completed. Buttons still work.",
        );
      }
    }, 15_000);
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });
    clearTimeout(permission);
    this.timers.delete(permission);
    if (gen !== this.generation) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    this.stream = stream;
    this.applyTransmission();
    this.status("connecting");
    const peer = new RTCPeerConnection();
    this.peer = peer;
    stream.getTracks().forEach((t) => {
      peer.addTrack(t, stream);
      t.onended = () => {
        if (gen === this.generation) {
          this.stop();
          this.status(
            "failed",
            "The microphone is unavailable. Buttons still work.",
          );
        }
      };
    });
    const channel = peer.createDataChannel("oai-events");
    this.channel = channel;
    channel.onmessage = (e) => {
      if (gen === this.generation) this.handleProviderEvent(e.data);
    };
    channel.onopen = () => {
      if (gen === this.generation) {
        this.status("listening");
        this.options.onActivity?.(this.narrating ? "narrating" : "ready");
      }
    };
    peer.onconnectionstatechange = () => {
      if (
        gen === this.generation &&
        ["failed", "disconnected"].includes(peer.connectionState)
      )
        this.reconnect(gen);
    };
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    if (gen !== this.generation) return;
    const request = new AbortController();
    this.request = request;
    const timeout = this.later(() => request.abort(), 40_000);
    const answer = await fetch("/api/voice/session", {
      method: "POST",
      headers: { "Content-Type": "application/sdp", "x-voice-csrf": this.csrf },
      body: offer.sdp,
      signal: this.request.signal,
    });
    clearTimeout(timeout);
    this.timers.delete(timeout);
    if (gen !== this.generation) return;
    if (!answer.ok) throw Error("Session failed");
    await peer.setRemoteDescription({
      type: "answer",
      sdp: await answer.text(),
    });
    this.later(() => {
      if (gen === this.generation && channel.readyState !== "open")
        this.reconnect(gen);
    }, 8000);
  }
  private reconnect(gen: number) {
    if (gen !== this.generation) return;
    if (!this.enabled || this.retries >= 2 || Date.now() >= this.deadline) {
      this.stop();
      this.status("disconnected", "Voice is resting. Buttons still work.");
      return;
    }
    const nextGen = ++this.generation;
    this.request?.abort();
    this.closeMedia();
    this.cancelPending();
    this.status("disconnected", "Reconnecting voice…");
    const delay = 500 * 2 ** this.retries++;
    this.later(() => {
      if (nextGen === this.generation)
        void this.connect(nextGen).catch(() => {
          if (nextGen === this.generation) this.reconnect(nextGen);
        });
    }, delay);
  }
  /** Provider JSON only. Public for deterministic protocol tests; never exposed in production UI. */
  handleProviderEvent(raw: unknown) {
    let e: Record<string, unknown>;
    try {
      e =
        typeof raw === "string"
          ? JSON.parse(raw)
          : (raw as Record<string, unknown>);
    } catch {
      return;
    }
    if (!e || typeof e !== "object" || typeof e.type !== "string") return;
    if (e.type === "error") {
      this.stop();
      this.status("failed", "Voice missed that. Buttons still work.");
      return;
    }
    if (typeof e.item_id !== "string") return;
    if (e.type === "input_audio_buffer.speech_started") {
      if (this.narrating) {
        this.remember(e.item_id);
        return;
      }
      const seq = ++this.sequence;
      this.newestSequence = seq;
      this.turns.set(e.item_id, { sequence: seq, finalizedAt: Date.now() });
      if (this.turns.size > 32)
        this.turns.delete(this.turns.keys().next().value!);
      this.cancelPending();
      this.options.onActivity?.("hearing");
      return;
    }
    if (e.type === "input_audio_buffer.speech_stopped") {
      const turn = this.turns.get(e.item_id);
      if (turn) {
        turn.finalizedAt = Date.now();
        turn.speechEnded = true;
        this.options.onActivity?.("interpreting");
      }
      return;
    }
    if (
      this.narrating &&
      e.type === "conversation.item.input_audio_transcription.completed"
    ) {
      this.remember(e.item_id);
      return;
    }
    if (
      e.type !== "conversation.item.input_audio_transcription.completed" ||
      typeof e.transcript !== "string" ||
      this.narrating
    )
      return;
    if (this.seen.has(e.item_id)) return;
    this.remember(e.item_id);
    const turn = this.turns.get(e.item_id) ?? {
      sequence: ++this.sequence,
      finalizedAt: Date.now(),
    };
    this.turns.delete(e.item_id);
    if (turn.sequence < this.newestSequence) return;
    this.newestSequence = turn.sequence;
    void this.finalize(
      e.transcript,
      e.item_id,
      turn.finalizedAt,
      Boolean(turn.speechEnded),
    );
  }
  private async finalize(
    text: string,
    utteranceId: string,
    finalizedAt: number,
    speechEnded = false,
  ) {
    if (text.length > 400) return;
    const now = Date.now();
    const timing = {
      endOfSpeechAt: speechEnded ? finalizedAt : null,
      finalTranscriptAt: now,
      recognitionMs: speechEnded ? Math.max(0, now - finalizedAt) : null,
      interpretationMs: 0,
      actionAt: null as number | null,
    };
    this.lastTiming = timing;
    this.options.onTranscript?.(text);
    this.pending?.abort();
    const gen = this.generation;
    const context = this.options.context();
    let commands = parseVoiceCommand(text, context.targets);
    const needsInterpretation = commands === null;
    if (commands === null) {
      this.pending = new AbortController();
      const abort = this.pending;
      const interpretStarted = Date.now();
      this.status("processing");
      this.options.onActivity?.("interpreting");
      let timedOut = false;
      const timeout = this.later(() => {
        timedOut = true;
        abort.abort();
      }, 4700);
      try {
        const r = await fetch("/api/voice/interpret", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-voice-csrf": this.csrf,
          },
          body: JSON.stringify({
            transcript: text,
            targets: context.targets.slice(0, 20),
          }),
          signal: abort.signal,
        });
        if (!r.ok) throw Error("Unavailable");
        const data = await r.json();
        if (!Array.isArray(data.commands) || data.commands.length > 3)
          throw Error("Invalid response");
        commands = data.commands.map((c: unknown) => CommandSchema.parse(c));
      } catch {
        commands = [];
      } finally {
        timing.interpretationMs = Date.now() - interpretStarted;
        if (this.pending === abort) this.pending = undefined;
        clearTimeout(timeout);
        this.timers.delete(timeout);
      }
      if (abort.signal.aborted) {
        if (
          timedOut &&
          gen === this.generation &&
          !this.pending &&
          this.enabled
        ) {
          this.options.onActivity?.("ignored");
          this.status(
            "listening",
            "I missed that. Try a short swimming command.",
          );
        }
        return;
      }
    }
    if (gen !== this.generation || !commands?.length) {
      if (gen === this.generation) {
        this.options.onActivity?.("ignored");
        if (this.enabled)
          this.status(
            "listening",
            needsInterpretation
              ? "I missed that. Try a short swimming command."
              : undefined,
          );
      }
      return;
    }
    const envelope = this.gate.accept(
      {
        id: crypto.randomUUID(),
        utteranceId,
        sceneGeneration: context.sceneGeneration,
        sessionGeneration: context.sessionGeneration,
        finalizedAt,
        createdAt: Date.now(),
        commands,
      },
      this.options.context(),
      Date.now(),
      needsInterpretation ? 6500 : 2000,
    );
    if (envelope) {
      timing.actionAt = Date.now();
      this.commandCount += envelope.commands.length;
      this.lastCommands = envelope.commands;
      this.options.onCommands(envelope);
      if (gen !== this.generation) return;
      this.options.onActivity?.(
        this.narrating ? "narrating" : "acted",
        envelope.commands.map((command) => command.type),
      );
    }
    if (this.enabled) this.status("listening");
  }
  /** Call before keyboard/touch stop, modal entry, scene changes, or any newer manual action. */
  cancelPending() {
    if (this.pending && this.enabled && this.channel?.readyState === "open") {
      this.status("listening");
      if (!this.narrating) this.options.onActivity?.("ready");
    }
    this.pending?.abort();
    this.pending = undefined;
    this.gate.invalidate();
  }
  setNarrating(value: boolean) {
    this.narrating = value;
    if (value) {
      for (const id of this.turns.keys()) this.remember(id);
      this.turns.clear();
      this.cancelPending();
      this.clearInput();
    }
    this.applyTransmission();
    if (!value) this.clearInput();
    if (this.enabled) this.options.onActivity?.(value ? "narrating" : "ready");
  }
  setTransmitting(value: boolean) {
    this.transmitting = value;
    this.applyTransmission();
  }
  private clearInput() {
    if (this.channel?.readyState === "open")
      this.channel.send(JSON.stringify({ type: "input_audio_buffer.clear" }));
  }
  private applyTransmission() {
    this.stream?.getAudioTracks().forEach((t) => {
      t.enabled = this.transmitting && !this.narrating;
    });
  }
  private closeMedia() {
    const peer = this.peer;
    this.peer = undefined;
    if (peer) {
      peer.onconnectionstatechange = null;
      peer.close();
    }
    if (this.channel) {
      this.channel.onmessage = null;
      this.channel.onopen = null;
      this.channel.close();
      this.channel = undefined;
    }
    this.stream?.getTracks().forEach((t) => {
      t.onended = null;
      t.stop();
    });
    this.stream = undefined;
  }
  stop() {
    if (this.csrf)
      void fetch("/api/voice/disable", {
        method: "POST",
        keepalive: true,
      }).catch(() => {});
    this.generation++;
    this.enabled = false;
    this.request?.abort();
    this.cancelPending();
    this.closeMedia();
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    this.seen.clear();
    this.turns.clear();
    this.gate.reset();
    this.csrf = "";
    this.status("off");
  }
  dispose() {
    this.stop();
    if (typeof document !== "undefined")
      document.removeEventListener("visibilitychange", this.visibility);
  }
  get diagnostics() {
    return {
      tracks:
        this.stream?.getTracks().filter((t) => t.readyState === "live")
          .length ?? 0,
      connected: this.peer?.connectionState === "connected",
      pending: !!this.pending && !this.pending.signal.aborted,
      narrating: this.narrating,
      renewals: this.renewals,
      commandCount: this.commandCount,
      lastCommands: this.lastCommands.map((command) => ({ ...command })),
      timing: this.lastTiming,
    };
  }
}
export type { VoiceCommand };
