import { afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import {
  NarrationService,
  openAINarration,
  narrationFingerprint,
  narrator,
  registerNarrationRoutes,
} from "../server/narration";
import {
  getNarrationLine,
  narrationLines,
  type NarrationLine,
} from "../content/narration";
import { discoveries } from "../content/catalog";
import { AudioMixer } from "../src/audio/AudioMixer";
const wave = () => {
  const b = Buffer.alloc(48);
  b.write("RIFF");
  b.write("WAVE", 8);
  return b;
};
const noBuilt = async () => undefined;
const configured = () => true;
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it("keeps scientific narration exactly derived from the reviewed catalog", () => {
  expect(narrationLines.length).toBeGreaterThan(60);
  expect(new Set(narrationLines.map((l) => l.id)).size).toBe(
    narrationLines.length,
  );
  for (const d of discoveries)
    expect(getNarrationLine(d.narrationAssetId)?.text).toBe(
      `${d.commonName}. ${d.childSentences.map((s) => s.text).join(" ")}`,
    );
  expect(narrator.voice).toBe("marin");
  expect(narrator.model).toBe("gpt-4o-mini-tts");
  const line = getNarrationLine("narration-welcome")!;
  expect(narrationFingerprint(line)).not.toBe(
    narrationFingerprint({ ...line, text: line.text + " Changed." }),
  );
});
it("deduplicates concurrent requests and caches only actual successful audio", async () => {
  let resolve!: (b: Buffer) => void;
  const provider = vi.fn(
    (_line: NarrationLine, _signal: AbortSignal) =>
      new Promise<Buffer>((r) => {
        resolve = r;
      }),
  );
  const service = new NarrationService({
    provider,
    built: noBuilt,
    configured,
  });
  const first = service.get("narration-welcome"),
    second = service.get("narration-welcome");
  await vi.waitFor(() => expect(provider).toHaveBeenCalledTimes(1));
  expect(provider.mock.calls[0][0]).toEqual(
    getNarrationLine("narration-welcome"),
  );
  resolve(wave());
  expect(await first).toEqual(await second);
  expect(await service.get("narration-welcome")).toEqual(wave());
  expect(provider).toHaveBeenCalledTimes(1);
  expect(service.diagnostics.pending).toBe(0);
});
it("refuses unknown IDs before touching disk or the provider", async () => {
  const provider = vi.fn(),
    built = vi.fn();
  const service = new NarrationService({ provider, built, configured });
  await expect(service.get("../../secret")).rejects.toMatchObject({
    status: 404,
  });
  await expect(service.get("say-user-supplied-text")).rejects.toMatchObject({
    status: 404,
  });
  expect(provider).not.toHaveBeenCalled();
  expect(built).not.toHaveBeenCalled();
});
it("serves verified offline preferred audio without a provider key", async () => {
  const provider = vi.fn();
  const service = new NarrationService({
    provider,
    configured: () => false,
    built: async () => wave(),
  });
  expect(await service.get("narration-welcome")).toEqual(wave());
  expect(provider).not.toHaveBeenCalled();
  const absent = new NarrationService({
    provider,
    configured: () => false,
    built: noBuilt,
  });
  await expect(absent.get("narration-welcome")).rejects.toMatchObject({
    status: 503,
  });
});
it("enforces byte/entry cache budgets and rate limits while allowing cached playback", async () => {
  const provider = vi.fn(async () => wave());
  const service = new NarrationService({
    provider,
    configured,
    built: noBuilt,
    maxEntries: 1,
    maxBytes: 60,
    perMinute: 2,
  });
  await service.get("narration-welcome");
  await service.get("narration-help");
  expect(service.diagnostics).toMatchObject({ cached: 1, bytes: 48 });
  await service.get("narration-help");
  await expect(service.get("narration-welcome")).rejects.toMatchObject({
    status: 429,
  });
  expect(provider).toHaveBeenCalledTimes(2);
});
it("aborts a stalled provider and releases pending state at the deadline", async () => {
  let signal: AbortSignal | undefined;
  const service = new NarrationService({
    configured,
    built: noBuilt,
    timeoutMs: 10,
    provider: async (_line, s) => {
      signal = s;
      return new Promise(() => {});
    },
  });
  await expect(service.get("narration-welcome")).rejects.toMatchObject({
    status: 504,
  });
  expect(signal?.aborted).toBe(true);
  expect(service.diagnostics).toMatchObject({
    pending: 0,
    active: 0,
    cached: 0,
  });
});
it("rejects invalid provider audio and suppresses immediate paid retries", async () => {
  const provider = vi.fn(async () => Buffer.from("not audio"));
  const service = new NarrationService({
    provider,
    configured,
    built: noBuilt,
  });
  await expect(service.get("narration-help")).rejects.toMatchObject({
    status: 502,
  });
  await expect(service.get("narration-help")).rejects.toMatchObject({
    status: 429,
  });
  expect(service.diagnostics.cached).toBe(0);
  expect(provider).toHaveBeenCalledTimes(1);
});
it("limits concurrent provider generation separately from cached requests", async () => {
  let resolve!: (b: Buffer) => void;
  const provider = vi.fn(
    (_line: NarrationLine, _signal: AbortSignal) =>
      new Promise<Buffer>((r) => {
        resolve = r;
      }),
  );
  const service = new NarrationService({
    provider,
    configured,
    built: noBuilt,
    concurrency: 1,
  });
  const first = service.get("narration-welcome");
  await vi.waitFor(() => expect(provider).toHaveBeenCalledTimes(1));
  await expect(service.get("narration-help")).rejects.toMatchObject({
    status: 429,
  });
  resolve(wave());
  await first;
});
it("HTTP route refuses free text and cross-origin generation; errors never expose provider secrets", async () => {
  const provider = vi.fn(async () => {
    throw Error("sensitive-provider-message-secret-key");
  });
  const app = express();
  registerNarrationRoutes(
    app,
    new NarrationService({ provider, configured, built: noBuilt }),
  );
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const addr = server.address();
  if (!addr || typeof addr === "string") throw Error("No port");
  const url = `http://127.0.0.1:${addr.port}/api/narration`;
  try {
    expect((await fetch(`${url}/narration-help?text=unreviewed`)).status).toBe(
      400,
    );
    expect(
      (
        await fetch(`${url}/narration-help`, {
          headers: { origin: "https://other.example" },
        })
      ).status,
    ).toBe(403);
    expect((await fetch(`${url}/unknown`)).status).toBe(404);
    expect(provider).not.toHaveBeenCalled();
    const response = await fetch(`${url}/narration-help`);
    expect(response.status).toBe(502);
    expect(await response.text()).toBe('{"error":"Narration unavailable"}');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

describe("narrator playback lifecycle", () => {
  function setup() {
    const started: { buffer?: AudioBuffer; start: ReturnType<typeof vi.fn> }[] =
      [];
    const gain = () => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      gain: {
        value: 0,
        cancelScheduledValues: vi.fn(),
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
    });
    class Context {
      state = "running";
      currentTime = 0;
      destination = {};
      createGain = gain;
      createDynamicsCompressor() {
        return {
          connect: vi.fn(),
          disconnect: vi.fn(),
          threshold: {},
          knee: {},
          ratio: {},
          attack: {},
          release: {},
        };
      }
      createBufferSource() {
        const source = {
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
          buffer: undefined,
          onended: null,
        };
        started.push(source);
        return source;
      }
      decodeAudioData = vi.fn(
        async () => ({ length: 24, duration: 0.001 }) as AudioBuffer,
      );
      resume = vi.fn();
      suspend = vi.fn();
      close = vi.fn();
    }
    vi.stubGlobal("AudioContext", Context);
    let resolve!: (response: Response) => void;
    let signal: AbortSignal | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, options?: RequestInit) => {
        if (url.startsWith("/api/narration/")) {
          signal = options?.signal as AbortSignal;
          return new Promise<Response>((r) => {
            resolve = r;
          });
        }
        return Promise.resolve(new Response(wave()));
      }),
    );
    const mixer = new AudioMixer(),
      narrating = vi.fn();
    mixer.onNarrating = narrating;
    return {
      mixer,
      narrating,
      started,
      resolve: () =>
        resolve(
          new Response(wave(), { headers: { "content-type": "audio/wav" } }),
        ),
      signal: () => signal,
    };
  }
  it("keeps capture enabled during download and ducks only at actual playback", async () => {
    const t = setup();
    const pending = t.mixer.narrate("narration-help");
    await vi.waitFor(() => expect(t.signal()).toBeDefined());
    expect(t.narrating).not.toHaveBeenCalled();
    expect(t.mixer.diagnostics.speaking).toBe(false);
    t.resolve();
    await pending;
    expect(t.narrating).toHaveBeenLastCalledWith(true);
    expect(t.mixer.diagnostics.narrator).toBe("openai-marin");
    t.mixer.stopNarration();
    expect(t.narrating).toHaveBeenLastCalledWith(false);
    t.mixer.dispose();
  });
  it("stop aborts pending work and a late response cannot begin narration", async () => {
    const t = setup();
    const pending = t.mixer.narrate("narration-help");
    await vi.waitFor(() => expect(t.signal()).toBeDefined());
    t.mixer.stopNarration();
    expect(t.signal()?.aborted).toBe(true);
    t.resolve();
    await pending;
    expect(t.narrating).not.toHaveBeenCalled();
    expect(t.mixer.diagnostics.speaking).toBe(false);
    t.mixer.dispose();
  });
  for (const setting of [{ muted: true }, { narration: 0 }])
    it(`silent narration does not suppress microphone capture: ${JSON.stringify(setting)}`, async () => {
      const t = setup();
      t.mixer.setVolumes(setting);
      await t.mixer.narrate("narration-help");
      expect(t.signal()).toBeUndefined();
      expect(t.narrating).not.toHaveBeenCalled();
      expect(t.mixer.diagnostics.speaking).toBe(false);
      t.mixer.dispose();
    });
  it("muting during a narration download cancels playback without suppressing capture", async () => {
    const t = setup();
    const pending = t.mixer.narrate("narration-help");
    await vi.waitFor(() => expect(t.signal()).toBeDefined());
    t.mixer.setVolumes({ muted: true });
    expect(t.signal()?.aborted).toBe(true);
    t.resolve();
    await pending;
    expect(t.narrating).not.toHaveBeenCalled();
    t.mixer.dispose();
  });
  it("uses the shipped offline clip on provider unavailability and marks the fallback", async () => {
    const t = setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.startsWith("/api/narration/")
          ? new Response("unavailable", { status: 503 })
          : new Response(wave()),
      ),
    );
    await t.mixer.narrate("narration-help");
    expect(t.mixer.diagnostics.narrator).toBe("offline-fallback");
    expect(t.narrating).toHaveBeenLastCalledWith(true);
    t.mixer.dispose();
  });
});

it("sends only the selected reviewed text and original delivery instructions to the speech endpoint", async () => {
  vi.stubEnv("OPENAI_API_KEY", "unit-test-placeholder");
  const mockFetch = vi.fn(
    async () =>
      new Response(wave(), { headers: { "content-type": "audio/wav" } }),
  );
  vi.stubGlobal("fetch", mockFetch);
  const line = getNarrationLine("narration-welcome")!;
  expect(await openAINarration(line, new AbortController().signal)).toEqual(
    wave(),
  );
  expect(mockFetch).toHaveBeenCalledTimes(1);
  const [url, init] = mockFetch.mock.calls[0] as unknown as [
    string,
    RequestInit,
  ];
  expect(String(url)).toBe("https://api.openai.com/v1/audio/speech");
  const payload = JSON.parse(String(init.body));
  expect(payload).toEqual({ ...narrator, input: line.text });
  expect(Object.keys(payload).sort()).toEqual([
    "input",
    "instructions",
    "model",
    "response_format",
    "voice",
  ]);
});
