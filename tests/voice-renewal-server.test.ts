import { beforeAll, afterAll, afterEach, it, expect, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { registerVoiceRoutes } from "../server/voice";
let server: Server, url: string;
const origin = "http://localhost:5173";
beforeAll(async () => {
  vi.stubEnv("OPENAI_API_KEY", "test-only-no-provider-key");
  vi.stubEnv("ALLOW_ADULT_VOICE_DEV", "true");
  const app = express();
  registerVoiceRoutes(app);
  server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const address = server.address();
  if (!address || typeof address === "string") throw Error("No port");
  url = `http://127.0.0.1:${address.port}`;
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  vi.unstubAllEnvs();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
async function enable() {
  const response = await fetch(url + "/api/voice/enable", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "adult-development", consent: true }),
  });
  expect(response.status).toBe(200);
  const body = await response.json();
  return {
    origin,
    cookie: response.headers.get("set-cookie")!,
    "x-voice-csrf": body.csrf as string,
  };
}
it("extends one authorized session across twenty minutes, rejects rapid renewal and expires when abandoned", async () => {
  const started = Date.now();
  let now = started;
  vi.spyOn(Date, "now").mockImplementation(() => now);
  const headers = await enable();
  expect(
    (await fetch(url + "/api/voice/renew", { method: "POST", headers })).status,
  ).toBe(429);
  for (const minute of [9, 18]) {
    now = started + minute * 60000;
    const r = await fetch(url + "/api/voice/renew", {
      method: "POST",
      headers,
    });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ maxSessionMs: 600000 });
    expect(r.headers.get("set-cookie")).toContain("HttpOnly");
  }
  now = started + 20 * 60000;
  expect(
    (
      await fetch(url + "/api/voice/interpret", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: "{}",
      })
    ).status,
  ).toBe(400);
  now = started + 29 * 60000;
  expect(
    (await fetch(url + "/api/voice/renew", { method: "POST", headers })).status,
  ).toBe(401);
});
it("renewal requires the current session, CSRF, same origin and continuing server readiness", async () => {
  const headers = await enable();
  expect(
    (
      await fetch(url + "/api/voice/renew", {
        method: "POST",
        headers: { origin },
      })
    ).status,
  ).toBe(401);
  expect(
    (
      await fetch(url + "/api/voice/renew", {
        method: "POST",
        headers: { ...headers, "x-voice-csrf": "wrong" },
      })
    ).status,
  ).toBe(401);
  expect(
    (
      await fetch(url + "/api/voice/renew", {
        method: "POST",
        headers: { ...headers, origin: "https://elsewhere.example" },
      })
    ).status,
  ).toBe(403);
  vi.stubEnv("ALLOW_ADULT_VOICE_DEV", "false");
  expect(
    (await fetch(url + "/api/voice/renew", { method: "POST", headers })).status,
  ).toBe(403);
  vi.stubEnv("ALLOW_ADULT_VOICE_DEV", "true");
  await fetch(url + "/api/voice/disable", { method: "POST", headers });
  expect(
    (await fetch(url + "/api/voice/renew", { method: "POST", headers })).status,
  ).toBe(401);
});
it("sends the documented low-latency transcription shape server-side without exposing a provider key", async () => {
  const headers = await enable();
  const actualFetch = globalThis.fetch;
  let providerSession: unknown;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, options) => {
    if (input === "https://api.openai.com/v1/realtime/calls") {
      providerSession = JSON.parse(
        String((options?.body as FormData).get("session")),
      );
      return new Response("v=0\r\nserver-answer", { status: 200 });
    }
    return actualFetch(input, options);
  });
  const response = await fetch(url + "/api/voice/session", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/sdp" },
    body: "v=0\r\no=synthetic",
  });
  expect(response.status).toBe(200);
  expect(await response.text()).toBe("v=0\r\nserver-answer");
  expect(providerSession).toMatchObject({
    type: "transcription",
    audio: {
      input: {
        transcription: {
          model: "gpt-4o-mini-transcribe",
          language: "en",
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 300,
        },
      },
    },
  });
});
