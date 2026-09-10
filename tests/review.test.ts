import { describe, it, expect } from "vitest";
import { Simulation } from "../src/game/simulation";
import { habitats } from "../content/catalog";
import { parseVoiceCommand } from "../src/voice/parser";
import { CommandSchema } from "../src/shared/contracts";
const reef = habitats.find((h) => h.id === "australia")!;
const ice = habitats.find((h) => h.theme === "ice")!;
const advance = (sim: Simulation, seconds: number) => {
  for (let i = 0; i < seconds * 60; i++) sim.advance(1 / 60);
};
describe("independent integration review regressions", () => {
  it("turn then swim preserves the ordered turn while moving forward", () => {
    const sim = new Simulation(reef);
    for (const c of parseVoiceCommand("turn right and go forward")!)
      sim.command(c);
    advance(sim, 1);
    expect(sim.heading).toBeCloseTo(Math.PI / 6);
    expect(sim.motion).toBe("forward");
  });
  it("collision resolution cannot push Elise outside the water bounds", () => {
    const sim = new Simulation(reef);
    sim.position = [reef.bounds.max[0] - 0.4, -4, 0];
    sim.obstacles = [{ position: [reef.bounds.max[0] - 1, -4, 0], radius: 2 }];
    sim.command({ type: "swim" });
    advance(sim, 0.1);
    expect(sim.position[0]).toBeLessThanOrEqual(reef.bounds.max[0] - 0.35);
  });
  it("collision resolution cannot push Elise upward through solid Antarctic ice", () => {
    const sim = new Simulation(ice);
    sim.position = [0, -1.05, 0];
    sim.obstacles = [{ position: [0, -2, 0], radius: 1 }];
    sim.command({ type: "vertical", direction: 1 });
    advance(sim, 0.1);
    expect(sim.position[1]).toBeLessThanOrEqual(-1);
  });
  it("surface navigation from a valid start completes without obstacles", () => {
    for (const h of habitats) {
      const sim = new Simulation(h);
      sim.command({ type: "surface" });
      advance(sim, 25);
      expect(sim.surface, `${h.id} surface`).toBe(true);
      expect(sim.motion).toBe("hover");
    }
  });
  it("every non-surface start reaches its surface route from the actual compact coordinates", () => {
    for (const h of habitats)
      for (const start of h.spawns) {
        const sim = new Simulation(h, start.id);
        sim.command({ type: "surface" });
        advance(sim, 30);
        expect(sim.surface, `${h.id}/${start.id}`).toBe(true);
      }
  });
  it("validated commands reject arbitrary model coordinates and durations", () => {
    expect(
      CommandSchema.safeParse({
        type: "swim",
        coordinates: [5, 5, 5],
        duration: 99999,
      }).success,
    ).toBe(false);
  });
});

it("voice authentication handles malformed non-ASCII CSRF without a server error", async () => {
  const { default: express } = await import("express");
  const { registerVoiceRoutes } = await import("../server/voice");
  const savedKey = process.env.OPENAI_API_KEY,
    savedAdult = process.env.ALLOW_ADULT_VOICE_DEV,
    savedOrigin = process.env.APP_ORIGIN;
  process.env.OPENAI_API_KEY = "synthetic-test-placeholder";
  process.env.ALLOW_ADULT_VOICE_DEV = "true";
  process.env.APP_ORIGIN = "http://localhost:5173";
  const app = express();
  registerVoiceRoutes(app);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (typeof address !== "object" || !address) throw Error("No test port");
  try {
    const url = `http://127.0.0.1:${address.port}`;
    const enabled = await fetch(url + "/api/voice/enable", {
      method: "POST",
      headers: {
        origin: "http://localhost:5173",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mode: "adult-development", consent: true }),
    });
    const cookie = enabled.headers.get("set-cookie")!;
    const result = await fetch(url + "/api/voice/interpret", {
      method: "POST",
      headers: {
        origin: "http://localhost:5173",
        cookie,
        "x-voice-csrf": "é".repeat(48),
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    expect(result.status).toBe(401);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    for (const [key, value] of Object.entries({
      OPENAI_API_KEY: savedKey,
      ALLOW_ADULT_VOICE_DEV: savedAdult,
      APP_ORIGIN: savedOrigin,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
