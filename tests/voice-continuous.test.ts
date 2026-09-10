import { afterEach, describe, expect, it, vi } from "vitest";
import { VoiceController } from "../src/voice/VoiceController";
import { parseVoiceCommand } from "../src/voice/parser";

const context = { sceneGeneration: 1, sessionGeneration: 1, targets: [] };
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
function setup() {
  vi.useFakeTimers();
  const tracks: {
    enabled: boolean;
    readyState: string;
    onended: (() => void) | null;
    stop: ReturnType<typeof vi.fn>;
  }[] = [];
  const channels: {
    readyState: string;
    onmessage: ((e: { data: string }) => void) | null;
    onopen: (() => void) | null;
    send: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  }[] = [];
  const peers: {
    connectionState: string;
    onconnectionstatechange: (() => void) | null;
    close: ReturnType<typeof vi.fn>;
  }[] = [];
  vi.stubGlobal("navigator", {
    mediaDevices: {
      getUserMedia: vi.fn(async () => {
        const track = {
          enabled: true,
          readyState: "live",
          onended: null,
          stop: vi.fn(() => {
            track.readyState = "ended";
          }),
        };
        tracks.push(track);
        return { getTracks: () => [track], getAudioTracks: () => [track] };
      }),
    },
  });
  vi.stubGlobal(
    "RTCPeerConnection",
    class {
      connectionState = "connected";
      onconnectionstatechange = null;
      channel = {
        readyState: "open",
        onmessage: null,
        onopen: null,
        send: vi.fn(),
        close: vi.fn(),
      };
      close = vi.fn(() => {
        this.connectionState = "closed";
      });
      constructor() {
        peers.push(this);
        channels.push(this.channel);
      }
      addTrack() {}
      createDataChannel() {
        return this.channel;
      }
      async createOffer() {
        return { sdp: "v=0" };
      }
      async setLocalDescription() {}
      async setRemoteDescription() {
        (this.channel as (typeof channels)[number]).onopen?.();
      }
    },
  );
  const network = vi.fn(async (url: string) => ({
    ok: true,
    json: async () =>
      url.endsWith("/enable")
        ? { csrf: "scoped", maxSessionMs: 600000 }
        : { maxSessionMs: 600000 },
    text: async () => "v=0",
  }));
  vi.stubGlobal("fetch", network);
  const out = vi.fn(),
    activity = vi.fn(),
    status = vi.fn();
  const voice = new VoiceController({
    context: () => context,
    onCommands: out,
    onStatus: status,
    onActivity: activity,
  });
  const final = (item: string, text: string) =>
    channels.at(-1)!.onmessage?.({
      data: JSON.stringify({
        type: "conversation.item.input_audio_transcription.completed",
        item_id: item,
        transcript: text,
      }),
    });
  return {
    voice,
    tracks,
    channels,
    peers,
    network,
    out,
    activity,
    status,
    final,
  };
}
describe("continuous adult voice lifecycle", () => {
  it("listens beyond twenty minutes, renews twice, and tears down every replaced connection", async () => {
    const x = setup();
    await x.voice.start({ adultDevelopment: true });
    const obsoleteHandler = x.channels[0]!.onmessage!;
    x.final("start", "go faster");
    expect(x.out).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(9 * 60000 + 1);
    expect(x.voice.diagnostics.renewals).toBe(1);
    expect(x.tracks[0]!.stop).toHaveBeenCalledOnce();
    expect(x.peers[0]!.close).toHaveBeenCalledOnce();
    expect(x.channels[0]!.close).toHaveBeenCalledOnce();
    obsoleteHandler({
      data: JSON.stringify({
        type: "conversation.item.input_audio_transcription.completed",
        item_id: "stale",
        transcript: "swim forward",
      }),
    });
    expect(x.out).toHaveBeenCalledTimes(1);
    x.final("after-renew", "go to the surface");
    expect(x.out).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(11 * 60000);
    expect(x.voice.diagnostics).toMatchObject({
      renewals: 2,
      connected: true,
      tracks: 1,
    });
    x.final("twenty-minutes", "what is this fish");
    expect(x.out.mock.lastCall![0].commands).toEqual([{ type: "inspect" }]);
    expect(
      x.network.mock.calls.filter(([url]) => url.endsWith("/renew")),
    ).toHaveLength(2);
    expect(
      x.network.mock.calls.filter(([url]) => url.endsWith("/enable")),
    ).toHaveLength(1);
    x.voice.stop();
    await vi.advanceTimersByTimeAsync(20 * 60000);
    expect(x.tracks).toHaveLength(3);
    for (const track of x.tracks) expect(track.stop).toHaveBeenCalledOnce();
    expect(x.voice.diagnostics.tracks).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    x.voice.dispose();
  });
  it("does not reopen capture when stop races with a pending renewal response", async () => {
    const x = setup();
    let release!: (value: Awaited<ReturnType<typeof x.network>>) => void;
    const ordinary = x.network.getMockImplementation()!;
    x.network.mockImplementation((url) =>
      url.endsWith("/renew")
        ? new Promise((resolve) => {
            release = resolve;
          })
        : ordinary(url),
    );
    await x.voice.start({ adultDevelopment: true });
    await vi.advanceTimersByTimeAsync(9 * 60000);
    x.voice.stop();
    release({
      ok: true,
      json: async () => ({ maxSessionMs: 600000 }),
      text: async () => "v=0",
    });
    await vi.advanceTimersByTimeAsync(1);
    expect(x.tracks).toHaveLength(1);
    expect(x.voice.diagnostics.tracks).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    x.voice.dispose();
  });
  it("keeps narration muted across renewal then hears close/resume without restarting", async () => {
    const x = setup();
    await x.voice.start({ adultDevelopment: true });
    x.voice.setNarrating(true);
    await vi.advanceTimersByTimeAsync(9 * 60000 + 1);
    expect(x.tracks.at(-1)!.enabled).toBe(false);
    x.final("echo", "go faster");
    expect(x.out).not.toHaveBeenCalled();
    x.voice.setNarrating(false);
    expect(x.tracks.at(-1)!.enabled).toBe(true);
    x.final("echo", "go faster");
    expect(x.out).not.toHaveBeenCalled();
    x.final("close", "close the card");
    x.final("resume", "resume playing");
    expect(x.out.mock.calls.map(([e]) => e.commands)).toEqual([
      [{ type: "close" }],
      [{ type: "resume" }],
    ]);
    expect(x.activity).toHaveBeenCalledWith("narrating");
    expect(x.activity).toHaveBeenCalledWith("ready");
    x.voice.dispose();
  });
  it("fails closed if renewal is denied and leaves no capture or retry timer", async () => {
    const x = setup();
    const ordinary = x.network.getMockImplementation()!;
    x.network.mockImplementation(async (url) =>
      url.endsWith("/renew")
        ? {
            ok: false,
            json: async () => ({ maxSessionMs: 0 }),
            text: async () => "",
          }
        : ordinary(url),
    );
    await x.voice.start({ adultDevelopment: true });
    await vi.advanceTimersByTimeAsync(9 * 60000 + 1);
    expect(x.voice.diagnostics.tracks).toBe(0);
    expect(x.status).toHaveBeenLastCalledWith(
      "disconnected",
      expect.any(String),
    );
    expect(vi.getTimerCount()).toBe(0);
    x.voice.dispose();
  });
  it("executes common final commands synchronously without an Astra network hop and reports turn feedback", () => {
    const x = setup();
    for (const [i, phrase] of [
      "go faster",
      "go to the surface",
      "what is this fish",
      "close the card",
      "resume playing",
    ].entries()) {
      x.voice.handleProviderEvent({
        type: "input_audio_buffer.speech_started",
        item_id: String(i),
      });
      x.voice.handleProviderEvent({
        type: "input_audio_buffer.speech_stopped",
        item_id: String(i),
      });
      x.voice.handleProviderEvent({
        type: "conversation.item.input_audio_transcription.completed",
        item_id: String(i),
        transcript: phrase,
      });
    }
    expect(x.out).toHaveBeenCalledTimes(5);
    expect(x.network).not.toHaveBeenCalled();
    expect(x.activity).toHaveBeenCalledWith("hearing");
    expect(x.activity).toHaveBeenCalledWith("acted", ["inspect"]);
    x.voice.dispose();
  });
});
it.each([
  ["go a little faster", { type: "speed", delta: 1 }],
  ["please swim a bit faster", { type: "speed", delta: 1 }],
  ["slow me down", { type: "speed", delta: -1 }],
  ["head to the surface", { type: "surface" }],
  ["swim to surface", { type: "surface" }],
  ["let's go to the surface", { type: "surface" }],
  ["what is this fish", { type: "inspect" }],
  ["what's that turtle", { type: "inspect" }],
  ["tell me about that animal", { type: "inspect" }],
  ["close this card", { type: "close" }],
  ["close the journal", { type: "close" }],
  ["continue playing", { type: "resume" }],
  ["back to swimming", { type: "resume" }],
])("understands natural voice-first phrase %s", (phrase, command) =>
  expect(parseVoiceCommand(phrase as string)).toEqual([command]),
);
it.each([
  "don't go faster",
  "do not go to the surface",
  "don't close the card",
  "the television said go faster",
  "what is this fish doing tomorrow",
])("does not act on negated/quoted/unrelated speech %s", (phrase) =>
  expect(parseVoiceCommand(phrase)).toEqual([]),
);

it.each([false, true])(
  "bounds slower Astra fallback and cancels on newer speech (%s)",
  async (cancel) => {
    const x = setup();
    await x.voice.start({ adultDevelopment: true });
    const ordinary = x.network.getMockImplementation()!;
    x.network.mockImplementation(async (url) => {
      if (!url.endsWith("/interpret")) return ordinary(url);
      await new Promise((resolve) => setTimeout(resolve, 3200));
      return {
        ok: true,
        json: async () => ({
          maxSessionMs: 600000,
          commands: [{ type: "turn", degrees: 30 }],
        }),
        text: async () => "",
      };
    });
    x.final("ambiguous", "head a little to the right");
    expect(
      x.network.mock.calls.some(([url]) => url.endsWith("/interpret")),
    ).toBe(true);
    await vi.advanceTimersByTimeAsync(2200);
    if (cancel)
      x.voice.handleProviderEvent({
        type: "input_audio_buffer.speech_started",
        item_id: "newer",
      });
    await vi.advanceTimersByTimeAsync(1100);
    expect(x.out).toHaveBeenCalledTimes(cancel ? 0 : 1);
    if (!cancel)
      expect(x.out.mock.lastCall![0].commands).toEqual([
        { type: "turn", degrees: 30 },
      ]);
    x.voice.dispose();
  },
);

it("returns to listening after a bounded Astra timeout without executing late movement", async () => {
  const x = setup();
  await x.voice.start({ adultDevelopment: true });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      if (!init?.signal) return new Response(null, { status: 204 });
      return new Promise((_resolve, reject) =>
        init.signal!.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        ),
      );
    }),
  );
  x.final("slow", "head a little to the right");
  expect(x.status).toHaveBeenLastCalledWith("processing", undefined);
  await vi.advanceTimersByTimeAsync(4701);
  expect(x.out).not.toHaveBeenCalled();
  expect(x.status).toHaveBeenLastCalledWith(
    "listening",
    "I missed that. Try a short swimming command.",
  );
  expect(x.activity).toHaveBeenLastCalledWith("ignored");
  x.voice.dispose();
});
