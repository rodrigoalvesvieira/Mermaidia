import { describe, it, expect, vi, afterEach } from "vitest";
import { parseVoiceCommand } from "../src/voice/parser";
import { CommandGate } from "../src/voice/commands";
import { VoiceController } from "../src/voice/VoiceController";
import { fixtures, targets } from "./voice/fixtures";
import { Simulation } from "../src/game/simulation";
import type { HabitatDefinition } from "../src/shared/contracts";
const habitat = {
  id: "test",
  theme: "reef",
  spawns: [{ id: "easy", position: [0, -5, 0], heading: 0 }],
  bounds: { min: [-30, -20, -30], max: [30, 1, 30] },
  surfaceRoute: [[0, 0, 0]],
  entities: [
    { id: "turtle-1", position: [0, -5, -8], radius: 1 },
    { id: "jelly-1", position: [4, -5, -4], radius: 0.2 },
  ],
} as unknown as HabitatDefinition;
const context = { sceneGeneration: 1, sessionGeneration: 1, targets };
const envelope = (commands: unknown[] = [{ type: "swim" }], extra = {}) => ({
  id: "command-1",
  utteranceId: "utterance-1",
  sceneGeneration: 1,
  sessionGeneration: 1,
  finalizedAt: 1000,
  createdAt: 1000,
  commands,
  ...extra,
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe("natural language through the real controller", () => {
  it("has more than sixty documented cases", () =>
    expect(fixtures.length).toBeGreaterThanOrEqual(60));
  for (const f of fixtures)
    it(JSON.stringify(f.text), () => {
      const parsed = parseVoiceCommand(f.text, targets);
      expect(parsed).toEqual(f.commands);
      const sim = new Simulation(habitat);
      for (const c of parsed ?? []) sim.command(c);
      for (let i = 0; i < 6; i++) sim.advance(1 / 60);
      expect(sim.position.every(Number.isFinite)).toBe(true);
      const last = parsed?.at(-1);
      if (
        !last ||
        ["stop", "inspect", "help", "return", "speed"].includes(last.type)
      )
        expect(sim.motion).toBe("hover");
      if (last?.type === "swim") expect(sim.position[2]).toBeLessThan(0);
      if (last?.type === "lateral") {
        expect(Math.sign(sim.position[0])).toBe(last.direction);
        expect(sim.heading).toBe(0);
      }
      if (last?.type === "vertical")
        expect(Math.sign(sim.position[1] + 5)).toBe(last.direction);
      if (last?.type === "turn")
        expect(Math.sign(sim.heading)).toBe(Math.sign(last.degrees));
      if (last?.type === "speed")
        expect(sim.speed).toBe(last.delta === 1 ? 1 : 0);
      if (last?.type === "surface") expect(sim.position[1]).toBeGreaterThan(-5);
      if (last?.type === "dive") expect(sim.position[1]).toBeLessThan(-5);
      if (last?.type === "approach") expect(sim.motion).toBe("route");
      if (last?.type === "pause") expect(sim.mode).toBe("paused");
      if (last?.type === "journal") expect(sim.mode).toBe("journal");
    });
  it("ambiguity never picks an arbitrary turtle", () =>
    expect(
      parseVoiceCommand("go to that turtle", [
        ...targets,
        { id: "other", name: "loggerhead turtle" },
      ]),
    ).toEqual([]));
});
describe("envelope gate", () => {
  it("rejects duplicates, old scenes/sessions, stale and malformed model arguments", () => {
    const gate = new CommandGate();
    expect(gate.accept(envelope(), context, 1100)).not.toBeNull();
    expect(gate.accept(envelope(), context, 1100)).toBeNull();
    for (const change of [
      { sceneGeneration: 2 },
      { sessionGeneration: 2 },
      { finalizedAt: -2000 },
      { commands: [{ type: "turn", degrees: 900 }] },
      { commands: [{ type: "approach", targetId: "unknown" }] },
      { commands: [{ type: "teleport", x: 2 }] },
      { createdAt: 500 },
      { finalizedAt: 9999 },
    ])
      expect(
        new CommandGate().accept(envelope(undefined, change), context, 1100),
      ).toBeNull();
  });
  it("stop invalidates older pending interpretation", () => {
    const gate = new CommandGate();
    gate.accept(
      envelope([{ type: "stop" }], { finalizedAt: 1200, createdAt: 1200 }),
      context,
      1200,
    );
    expect(
      gate.accept(
        envelope([{ type: "swim" }], {
          utteranceId: "older",
          finalizedAt: 1100,
          createdAt: 1200,
        }),
        context,
        1200,
      ),
    ).toBeNull();
  });
  it("stop overrides compounded movement", () =>
    expect(
      new CommandGate().accept(
        envelope([{ type: "swim" }, { type: "stop" }]),
        context,
        1100,
      )?.commands,
    ).toEqual([{ type: "stop" }]));
});
describe("documented Realtime events", () => {
  it("executes finals once, never partial text, ignores narration", async () => {
    const out = vi.fn();
    const voice = new VoiceController({
      context: () => context,
      onCommands: out,
      onStatus: () => {},
    });
    voice.handleProviderEvent({
      type: "conversation.item.input_audio_transcription.delta",
      item_id: "a",
      delta: "go forward",
    });
    expect(out).not.toHaveBeenCalled();
    voice.handleProviderEvent({
      type: "conversation.item.input_audio_transcription.completed",
      item_id: "a",
      transcript: "go forward",
    });
    await Promise.resolve();
    expect(out).toHaveBeenCalledTimes(1);
    voice.handleProviderEvent({
      type: "conversation.item.input_audio_transcription.completed",
      item_id: "a",
      transcript: "go forward",
    });
    expect(out).toHaveBeenCalledTimes(1);
    voice.setNarrating(true);
    voice.handleProviderEvent({
      type: "conversation.item.input_audio_transcription.completed",
      item_id: "b",
      transcript: "go forward",
    });
    expect(out).toHaveBeenCalledTimes(1);
    voice.dispose();
  });
  it("ignores out-of-order older utterance completion", () => {
    const out = vi.fn();
    const voice = new VoiceController({
      context: () => context,
      onCommands: out,
      onStatus: () => {},
    });
    for (const id of ["older", "newer"])
      voice.handleProviderEvent({
        type: "input_audio_buffer.speech_started",
        item_id: id,
      });
    voice.handleProviderEvent({
      type: "conversation.item.input_audio_transcription.completed",
      item_id: "newer",
      transcript: "stop",
    });
    voice.handleProviderEvent({
      type: "conversation.item.input_audio_transcription.completed",
      item_id: "older",
      transcript: "swim",
    });
    expect(out).toHaveBeenCalledTimes(1);
    expect(out.mock.calls[0][0].commands).toEqual([{ type: "stop" }]);
    voice.dispose();
  });
  it("cancels delayed Astra after manual stop or scene change", async () => {
    let resolve!: (v: unknown) => void;
    vi.stubGlobal(
      "fetch",
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    const out = vi.fn();
    let scene = 1;
    const voice = new VoiceController({
      context: () => ({ ...context, sceneGeneration: scene }),
      onCommands: out,
      onStatus: () => {},
    });
    voice.handleProviderEvent({
      type: "conversation.item.input_audio_transcription.completed",
      item_id: "a",
      transcript: "I would like to head a little toward the right",
    });
    voice.cancelPending();
    scene = 2;
    resolve({ ok: true, json: async () => ({ commands: [{ type: "swim" }] }) });
    await new Promise((r) => setTimeout(r, 0));
    expect(out).not.toHaveBeenCalled();
    voice.dispose();
  });
  it("refuses child mode before microphone capture or network", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const status = vi.fn();
    const voice = new VoiceController({
      context: () => context,
      onCommands: () => {},
      onStatus: status,
    });
    await voice.start();
    expect(fetch).not.toHaveBeenCalled();
    expect(status).toHaveBeenLastCalledWith("needs-setup", expect.any(String));
    voice.dispose();
  });
});

describe("capture lifecycle", () => {
  const enabled = () =>
    Promise.resolve({
      ok: true,
      json: async () => ({ csrf: "test-csrf", maxSessionMs: 600000 }),
    });
  it("stops a late microphone grant after user cancellation", async () => {
    let grant!: (s: unknown) => void;
    const track = { stop: vi.fn(), enabled: true, onended: null };
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: () =>
          new Promise((r) => {
            grant = r;
          }),
      },
    });
    vi.stubGlobal("fetch", enabled);
    const voice = new VoiceController({
      context: () => context,
      onCommands: () => {},
      onStatus: () => {},
    });
    const starting = voice.start({ adultDevelopment: true });
    await new Promise((r) => setTimeout(r, 0));
    voice.stop();
    grant({ getTracks: () => [track], getAudioTracks: () => [track] });
    await starting;
    expect(track.stop).toHaveBeenCalledOnce();
    expect(voice.diagnostics.tracks).toBe(0);
    voice.dispose();
  });
  it("recovers from denied permission without creating a peer", async () => {
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: () =>
          Promise.reject(new DOMException("Denied", "NotAllowedError")),
      },
    });
    vi.stubGlobal("fetch", enabled);
    const status = vi.fn(),
      peer = vi.fn();
    vi.stubGlobal("RTCPeerConnection", peer);
    const voice = new VoiceController({
      context: () => context,
      onCommands: () => {},
      onStatus: status,
    });
    await voice.start({ adultDevelopment: true });
    expect(peer).not.toHaveBeenCalled();
    expect(status).toHaveBeenLastCalledWith("failed", expect.any(String));
    expect(voice.diagnostics.tracks).toBe(0);
    voice.dispose();
  });
  it("closes tracks, channel and connection on stop; narration mutes transmission", async () => {
    const track = {
      stop: vi.fn(),
      enabled: true,
      onended: null,
      readyState: "live",
    };
    const channel = {
      onmessage: null,
      onopen: null,
      readyState: "open",
      send: vi.fn(),
      close: vi.fn(),
    };
    const peer = {
      connectionState: "connected",
      onconnectionstatechange: null,
      addTrack: vi.fn(),
      createDataChannel: () => channel,
      createOffer: async () => ({ sdp: "v=0" }),
      setLocalDescription: async () => {},
      setRemoteDescription: async () => {},
      close: vi.fn(),
    };
    vi.stubGlobal(
      "RTCPeerConnection",
      class {
        constructor() {
          return peer;
        }
      },
    );
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: async () => ({
          getTracks: () => [track],
          getAudioTracks: () => [track],
        }),
      },
    });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementationOnce(enabled)
        .mockResolvedValue({ ok: true, text: async () => "v=0" }),
    );
    const voice = new VoiceController({
      context: () => context,
      onCommands: () => {},
      onStatus: () => {},
    });
    await voice.start({ adultDevelopment: true });
    expect(voice.diagnostics.tracks).toBe(1);
    voice.setNarrating(true);
    expect(track.enabled).toBe(false);
    voice.setNarrating(false);
    expect(track.enabled).toBe(true);
    voice.setTransmitting(false);
    expect(track.enabled).toBe(false);
    voice.setTransmitting(true);
    voice.stop();
    expect(track.stop).toHaveBeenCalledOnce();
    expect(peer.close).toHaveBeenCalledOnce();
    expect(channel.close).toHaveBeenCalledOnce();
    expect(voice.diagnostics.tracks).toBe(0);
    voice.dispose();
  });
  it("a permission prompt that stays open times out and late tracks are stopped", async () => {
    vi.useFakeTimers();
    let grant!: (s: unknown) => void;
    const track = { stop: vi.fn() };
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: () =>
          new Promise((r) => {
            grant = r;
          }),
      },
    });
    vi.stubGlobal("fetch", enabled);
    const status = vi.fn();
    const voice = new VoiceController({
      context: () => context,
      onCommands: () => {},
      onStatus: status,
    });
    const starting = voice.start({ adultDevelopment: true });
    await vi.advanceTimersByTimeAsync(15001);
    expect(status).toHaveBeenLastCalledWith(
      "failed",
      expect.stringContaining("permission"),
    );
    grant({ getTracks: () => [track] });
    await starting;
    expect(track.stop).toHaveBeenCalledOnce();
    voice.dispose();
  });
  it("discarded speech cannot reappear as a command after narration ends", () => {
    const out = vi.fn();
    const voice = new VoiceController({
      context: () => context,
      onCommands: out,
      onStatus: () => {},
    });
    voice.handleProviderEvent({
      type: "input_audio_buffer.speech_started",
      item_id: "old",
    });
    voice.setNarrating(true);
    voice.handleProviderEvent({
      type: "input_audio_buffer.speech_started",
      item_id: "echo",
    });
    voice.setNarrating(false);
    for (const item_id of ["old", "echo"])
      voice.handleProviderEvent({
        type: "conversation.item.input_audio_transcription.completed",
        item_id,
        transcript: "swim forward",
      });
    expect(out).not.toHaveBeenCalled();
    voice.dispose();
  });
});
