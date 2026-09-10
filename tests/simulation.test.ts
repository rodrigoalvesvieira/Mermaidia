import { describe, it, expect } from "vitest";
import { Simulation, selectTarget, SPEEDS } from "../src/game/simulation";
import { habitats } from "../content/catalog";
import { readSave, writeSave, freshSave } from "../src/game/storage";
import { CommandSchema } from "../src/shared/contracts";
const advance = (sim: Simulation, seconds: number, fps = 60) => {
  for (let i = 0; i < seconds * fps; i++) sim.advance(1 / fps);
};
describe("fixed-step swimming", () => {
  it("moves identically at 30/60/120Hz and bounds a long suspension", () => {
    const sims = [30, 60, 120].map((fps) => {
      const s = new Simulation(habitats[0]);
      s.command({ type: "swim" });
      advance(s, 5, fps);
      return s;
    });
    expect(sims[0].position[2]).toBeCloseTo(sims[2].position[2], 4);
    const z = sims[0].position[2];
    sims[0].advance(120);
    expect(Math.abs(sims[0].position[2] - z)).toBeLessThanOrEqual(
      SPEEDS[0] * 0.1 + 0.0001,
    );
  });
  it("swims at the faster three levels and stops immediately even at top speed", () => {
    for (const [level, metersPerSecond] of [2, 3.2, 5].entries()) {
      const s = new Simulation(habitats[0]);
      for (let i = 0; i < level; i++) s.command({ type: "speed", delta: 1 });
      const startZ = s.position[2];
      s.command({ type: "swim" });
      advance(s, 1);
      expect(startZ - s.position[2]).toBeCloseTo(metersPerSecond, 5);
      s.command({ type: "stop" });
      const stopped = [...s.position];
      advance(s, 1);
      expect(s.position).toEqual(stopped);
    }
  });
  it("faster also accelerates an active surface route", () => {
    const normal = new Simulation(habitats[0]);
    const fast = new Simulation(habitats[0]);
    const start = [...normal.position];
    for (const s of [normal, fast]) s.command({ type: "surface" });
    fast.command({ type: "speed", delta: 1 });
    fast.command({ type: "speed", delta: 1 });
    advance(normal, 0.5);
    advance(fast, 0.5);
    const distance = (s: Simulation) =>
      Math.hypot(...s.position.map((v, i) => v - start[i]));
    expect(distance(fast)).toBeGreaterThan(distance(normal) * 2);
  });
  it("turns without starting, preserves forward while turning, supports compound turn+swim", () => {
    const s = new Simulation(habitats[0]);
    s.command({ type: "turn", degrees: 30 });
    advance(s, 1);
    expect(s.heading).toBeCloseTo(Math.PI / 6);
    expect(s.motion).toBe("hover");
    s.command({ type: "turn", degrees: 30 });
    s.command({ type: "swim" });
    advance(s, 1);
    expect(s.heading).toBeCloseTo(Math.PI / 3);
    expect(s.motion).toBe("forward");
  });
  it("sideways is bounded and preserves heading, speed does not start motion", () => {
    const s = new Simulation(habitats[0]);
    s.command({ type: "speed", delta: 1 });
    expect(s.motion).toBe("hover");
    const x = s.position[0];
    s.command({ type: "lateral", direction: 1 });
    advance(s, 2);
    expect(s.position[0] - x).toBeCloseTo(2, 1);
    expect(s.heading).toBe(0);
    expect(s.motion).toBe("hover");
  });
  it("collisions and soft world boundaries keep all coordinates finite", () => {
    const s = new Simulation(habitats[0]);
    s.command({ type: "speed", delta: 1 });
    s.command({ type: "speed", delta: 1 });
    s.obstacles = [{ position: [0, -4, 2], radius: 1 }];
    s.command({ type: "swim" });
    advance(s, 50);
    expect(s.position[2]).toBeGreaterThan(3.3);
    s.obstacles = [];
    s.command({ type: "swim" });
    advance(s, 100);
    expect(s.position[2]).toBeGreaterThan(habitats[0].bounds.min[2]);
    expect(s.motion).toBe("hover");
  });
  it("routes Antarctic surface through lead and stops on ice", () => {
    const h = habitats.find((h) => h.theme === "ice")!,
      s = new Simulation(h);
    s.command({ type: "vertical", direction: 1 });
    advance(s, 20);
    expect(s.position[1]).toBeLessThan(-0.8);
    s.command({ type: "surface" });
    advance(s, 25);
    expect(s.surface).toBe(true);
    expect(
      Math.hypot(
        s.position[0] - h.surfaceRoute.at(-1)![0],
        s.position[2] - h.surfaceRoute.at(-1)![2],
      ),
    ).toBeLessThan(3);
  });
  it("deep ascent cancels on stop; modal and return never resume motion", () => {
    const s = new Simulation(habitats.find((h) => h.theme === "deep")!);
    s.command({ type: "surface" });
    advance(s, 1);
    s.command({ type: "stop" });
    const p = [...s.position];
    advance(s, 4);
    expect(s.position).toEqual(p);
    s.command({ type: "swim" });
    s.setMode("inspecting");
    s.command({ type: "close" });
    advance(s, 1);
    expect(s.motion).toBe("hover");
    s.command({ type: "return" });
    expect(s.position).toEqual(s.habitat.spawns[0].position);
  });
});
describe("discovery visibility and persistence", () => {
  it("rejects occluded/behind/distant candidates and stabilizes selection", () => {
    const e = habitats[0].entities[0];
    const player: [number, number, number] = [0, -4, 6];
    const c = {
      entity: e,
      position: [0, -4, 2] as [number, number, number],
      visible: true,
      centrality: 0,
    };
    expect(selectTarget(player, [c], [])?.id).toBe(e.id);
    expect(
      selectTarget(player, [c], [{ position: [0, -4, 4], radius: 1 }]),
    ).toBeUndefined();
    expect(
      selectTarget(player, [{ ...c, visible: false }], []),
    ).toBeUndefined();
    expect(
      selectTarget(player, [{ ...c, position: [0, -4, -15] }], []),
    ).toBeUndefined();
  });
  it("recovers corrupt saves and quota errors without losing play", () => {
    expect(readSave({ getItem: () => "{bad" }).version).toBe(1);
    expect(
      readSave({ getItem: () => JSON.stringify({ version: 99 }) }).journal,
    ).toEqual([]);
    expect(
      writeSave(
        {
          setItem: () => {
            throw Error("quota");
          },
        },
        freshSave(),
      ),
    ).toBe(false);
  });
  it("refuses model coordinates, unbounded values and unknown fields", () => {
    expect(CommandSchema.safeParse({ type: "swim", x: 999 }).success).toBe(
      false,
    );
    expect(
      CommandSchema.safeParse({ type: "turn", degrees: 999 }).success,
    ).toBe(false);
  });
});
