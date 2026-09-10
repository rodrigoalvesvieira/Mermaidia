import { beforeAll, afterAll, it, expect, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { registerVoiceRoutes, interpretationSchema } from "../server/voice";
let server: Server, url: string;
const origin = "http://localhost:5173";
beforeAll(async () => {
  vi.stubEnv("OPENAI_API_KEY", "");
  vi.stubEnv("ALLOW_ADULT_VOICE_DEV", "false");
  const app = express();
  registerVoiceRoutes(app);
  server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const addr = server.address();
  if (typeof addr !== "object" || !addr) throw Error("No port");
  url = `http://127.0.0.1:${addr.port}`;
});
afterAll(async () => {
  vi.unstubAllEnvs();
  await new Promise<void>((resolve, reject) =>
    server.close((e) => (e ? reject(e) : resolve())),
  );
});
it("no-key launch accurately reports disabled cloud mode", async () => {
  const r = await fetch(`${url}/api/voice/status`);
  expect(r.status).toBe(200);
  const data = await r.json();
  expect(data.childEnabled).toBe(false);
  expect(data.configured).toBe(false);
  expect(data.adultDevelopmentEnabled).toBe(false);
  expect(data.adultDevelopmentMode).toBe(false);
  expect(r.headers.get("cache-control")).toBe("no-store");
});
it("server adult authorization is independent of the key and missing credentials are the named blocker", async () => {
  vi.stubEnv("ALLOW_ADULT_VOICE_DEV", "true");
  try {
    for (const key of ["", "   "]) {
      vi.stubEnv("OPENAI_API_KEY", key);
      const data = await (await fetch(`${url}/api/voice/status`)).json();
      expect(data).toMatchObject({
        adultDevelopmentMode: true,
        configured: false,
        available: false,
        childReady: false,
      });
      expect(data.reason).toContain("OPENAI_API_KEY is empty or missing");
      const enable = await fetch(`${url}/api/voice/enable`, {
        method: "POST",
        headers: { origin, "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "adult-development", consent: true }),
      });
      expect(enable.status).toBe(403);
      expect((await enable.json()).error).toContain("OPENAI_API_KEY");
    }
  } finally {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("ALLOW_ADULT_VOICE_DEV", "false");
  }
});
it("child cloud cannot be enabled by a parent checkbox or environment flag", async () => {
  vi.stubEnv("CHILD_VOICE_ENABLED", "true");
  const r = await fetch(`${url}/api/voice/enable`, {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "child", consent: true }),
  });
  expect(r.status).toBe(403);
});
it("cross-origin session creation is rejected", async () => {
  const r = await fetch(`${url}/api/voice/enable`, {
    method: "POST",
    headers: {
      origin: "https://other.example",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mode: "adult-development", consent: true }),
  });
  expect(r.status).toBe(403);
});
it("navigation proxy requires an application session and CSRF token", async () => {
  const r = await fetch(`${url}/api/voice/interpret`, {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify({ transcript: "head right", targets: [] }),
  });
  expect(r.status).toBe(401);
});
it("adult opt-in yields only scoped HttpOnly application credentials", async () => {
  vi.stubEnv("OPENAI_API_KEY", "test-server-key-not-a-real-key");
  vi.stubEnv("ALLOW_ADULT_VOICE_DEV", "true");
  const enabled = await fetch(`${url}/api/voice/enable`, {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "adult-development", consent: true }),
  });
  expect(enabled.status).toBe(200);
  const body = await enabled.json();
  expect(body.csrf).toHaveLength(48);
  expect(JSON.stringify(body)).not.toContain("test-server-key");
  const cookie = enabled.headers.get("set-cookie")!;
  expect(cookie).toContain("HttpOnly");
  expect(cookie).toContain("SameSite=Strict");
  const r = await fetch(`${url}/api/voice/interpret`, {
    method: "POST",
    headers: {
      origin,
      cookie,
      "x-voice-csrf": body.csrf,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ transcript: "x".repeat(401), targets: [] }),
  });
  expect(r.status).toBe(400);
  const wrong = await fetch(`${url}/api/voice/interpret`, {
    method: "POST",
    headers: {
      origin,
      cookie,
      "x-voice-csrf": "wrong",
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  expect(wrong.status).toBe(401);
  const disabled = await fetch(`${url}/api/voice/disable`, {
    method: "POST",
    headers: { origin, cookie },
  });
  expect(disabled.status).toBe(204);
  const after = await fetch(`${url}/api/voice/interpret`, {
    method: "POST",
    headers: {
      origin,
      cookie,
      "x-voice-csrf": body.csrf,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  expect(after.status).toBe(401);
});
it("rejects malformed model envelopes", () => {
  for (const data of [
    { commands: [{ type: "turn", degrees: 31 }], clarification: "none" },
    {
      commands: [{ type: "approach", targetId: "a".repeat(81) }],
      clarification: "none",
    },
    { commands: Array(4).fill({ type: "swim" }), clarification: "none" },
    { commands: [], clarification: "Here is an invented animal fact" },
  ])
    expect(interpretationSchema.safeParse(data).success).toBe(false);
});
