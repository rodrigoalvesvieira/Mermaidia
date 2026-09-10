import { seafloorHeight } from "./terrain";
import type {
  HabitatDefinition,
  Vec3,
  VoiceCommand,
  GameMode,
  EntityInstance,
} from "../shared/contracts";
export type Obstacle = { position: Vec3; radius: number };
// Brisk exploration by default; voice, Space and buttons share these levels.
export const SPEEDS = [2, 3.2, 5];
const distance = (a: Vec3, b: Vec3) => Math.hypot(...a.map((v, i) => v - b[i]));
const copy = (v: Vec3): Vec3 => [...v];
export class Simulation {
  habitat: HabitatDefinition;
  position: Vec3;
  previous: Vec3;
  heading: number;
  speed = 0;
  mode: GameMode = "exploring";
  motion = "hover";
  surface = false;
  elapsed = 0;
  generation = 1;
  spawnId: string;
  obstacles: Obstacle[] = [];
  private accumulator = 0;
  private remaining = 0;
  private direction = 1;
  private turnRemaining = 0;
  private route: Vec3[] = [];
  constructor(h: HabitatDefinition, spawnId = h.spawns[0].id) {
    this.habitat = h;
    const s = h.spawns.find((x) => x.id === spawnId) || h.spawns[0];
    this.spawnId = s.id;
    this.position = copy(s.position);
    this.previous = copy(s.position);
    this.heading = s.heading;
    this.surface = this.position[1] > -0.5;
  }
  stop() {
    this.motion = "hover";
    this.remaining = 0;
    this.route = [];
    this.turnRemaining = 0;
  }
  setMode(mode: GameMode) {
    this.stop();
    this.mode = mode;
  }
  command(c: VoiceCommand) {
    if (c.type === "stop") {
      this.stop();
      return;
    }
    if (c.type === "resume" || c.type === "close") {
      this.setMode("exploring");
      return;
    }
    if (c.type === "pause") {
      this.setMode("paused");
      return;
    }
    if (c.type === "journal") {
      this.setMode("journal");
      return;
    }
    if (this.mode !== "exploring" && this.mode !== "transitioning") return;
    if (c.type === "speed") {
      this.speed = Math.max(0, Math.min(2, this.speed + c.delta));
      return;
    }
    if (c.type === "turn") {
      this.route = [];
      if (this.motion === "route") this.motion = "hover";
      this.turnRemaining = (c.degrees * Math.PI) / 180;
      return;
    }
    if (c.type === "inspect" || c.type === "help") {
      this.stop();
      return;
    }
    const pendingTurn = c.type === "swim" ? this.turnRemaining : 0;
    this.stop();
    this.turnRemaining = pendingTurn;
    switch (c.type) {
      case "swim":
        this.motion = "forward";
        break;
      case "lateral":
        this.motion = "lateral";
        this.direction = c.direction;
        this.remaining = 2 / SPEEDS[this.speed];
        break;
      case "vertical":
        this.motion = "vertical";
        this.direction = c.direction;
        this.remaining = 2 / SPEEDS[this.speed];
        break;
      case "surface":
        this.motion = "route";
        if (this.habitat.theme === "ice") {
          const openings = this.habitat.surfaceOpenings ?? [
            this.habitat.surfaceRoute.at(-1)!,
          ];
          const hole = openings.reduce((nearest, point) =>
            Math.hypot(
              point[0] - this.position[0],
              point[2] - this.position[2],
            ) <
            Math.hypot(
              nearest[0] - this.position[0],
              nearest[2] - this.position[2],
            )
              ? point
              : nearest,
          );
          this.route = [
            [hole[0], -4, hole[2]],
            [hole[0], -1, hole[2]],
            copy(hole),
          ];
        } else if (Math.hypot(this.position[0], this.position[2]) > 30) {
          this.route = [[this.position[0], 0, this.position[2]]];
        } else {
          this.route = this.habitat.surfaceRoute.map(copy);
        }
        break;
      case "dive":
        this.motion = "vertical";
        this.direction = -1;
        this.remaining = (this.surface ? 3 : 2) / SPEEDS[this.speed];
        break;
      case "return": {
        const s = this.habitat.spawns.find((s) => s.id === this.spawnId)!;
        this.position = copy(s.position);
        this.previous = copy(s.position);
        this.heading = s.heading;
        this.surface = s.position[1] > -0.5;
        break;
      }
      case "approach": {
        const e = this.habitat.entities.find((e) => e.id === c.targetId);
        if (e && distance(this.position, e.position) < 12) {
          const d = distance(this.position, e.position);
          this.route = [
            this.position.map(
              (v, i) =>
                v + (e.position[i] - v) * Math.max(0, (d - e.radius - 2) / d),
            ) as Vec3,
          ];
          this.motion = "route";
        }
        break;
      }
    }
  }
  advance(delta: number) {
    this.accumulator += Math.min(Math.max(delta, 0), 0.1);
    while (this.accumulator >= 1 / 60) {
      this.previous = copy(this.position);
      this.step(1 / 60);
      this.accumulator -= 1 / 60;
    }
  }
  private step(dt: number) {
    this.elapsed += dt;
    if (this.mode !== "exploring" && this.mode !== "transitioning") return;
    if (this.turnRemaining) {
      const change =
        Math.sign(this.turnRemaining) *
        Math.min(Math.abs(this.turnRemaining), (Math.PI / 3) * dt);
      this.heading += change;
      this.turnRemaining -= change;
    }
    let velocity: Vec3 = [0, 0, 0];
    const speed = SPEEDS[this.speed];
    if (this.motion === "forward")
      velocity = [
        Math.sin(this.heading) * speed,
        0,
        -Math.cos(this.heading) * speed,
      ];
    if (this.motion === "lateral")
      velocity = [
        Math.cos(this.heading) * speed * this.direction,
        0,
        Math.sin(this.heading) * speed * this.direction,
      ];
    if (this.motion === "vertical") velocity = [0, speed * this.direction, 0];
    if (this.motion === "route") {
      const goal = this.route[0];
      if (!goal) {
        this.stop();
        return;
      }
      const d = distance(this.position, goal);
      if (d < 0.1) {
        this.route.shift();
        return;
      }
      // Compact fictional travel, not a real ascent rate. Speed controls also
      // accelerate surface/discovery routes instead of being ignored on them.
      const travelSpeed = speed * (this.habitat.theme === "deep" ? 1.5 : 1.25);
      velocity = this.position.map(
        (v, i) => ((goal[i] - v) / d) * Math.min(travelSpeed, d / dt),
      ) as Vec3;
    }
    let proposed = this.position.map((v, i) => v + velocity[i] * dt) as Vec3;
    const { min, max } = this.habitat.bounds;
    let boundary = false;
    for (let i = 0; i < 3; i++) {
      const clamped = Math.max(
        min[i] + 0.35,
        Math.min(max[i] - 0.35, proposed[i]),
      );
      if (clamped !== proposed[i]) boundary = true;
      proposed[i] = clamped;
    }
    if (this.habitat.theme !== "deep")
      proposed[1] = Math.max(
        proposed[1],
        seafloorHeight(proposed[0], proposed[2], this.habitat.theme) + 1.2,
      );
    // Solid Antarctic ceiling, except the documented open-water lead centered at route endpoint.
    if (this.habitat.theme === "ice" && proposed[1] > -2.7) {
      const openings = this.habitat.surfaceOpenings ?? [
        this.habitat.surfaceRoute.at(-1)!,
      ];
      if (
        !openings.some(
          (hole) =>
            Math.hypot(proposed[0] - hole[0], proposed[2] - hole[2]) <= 3,
        )
      ) {
        proposed[1] = -2.7;
        boundary = true;
      }
    }
    for (const o of this.obstacles) {
      const d = distance(proposed, o.position),
        r = o.radius + 0.4;
      if (d < r) {
        const normal = proposed.map(
          (v, i) => (v - o.position[i]) / (d || 1),
        ) as Vec3;
        if (!d) normal[0] = 1;
        for (let i = 0; i < 3; i++) proposed[i] = o.position[i] + normal[i] * r;
      }
    }
    // Collision projection must never push through the water envelope or an ice ceiling.
    for (let i = 0; i < 3; i++)
      proposed[i] = Math.max(
        min[i] + 0.35,
        Math.min(max[i] - 0.35, proposed[i]),
      );
    if (this.habitat.theme === "ice" && proposed[1] > -2.7) {
      const openings = this.habitat.surfaceOpenings ?? [
        this.habitat.surfaceRoute.at(-1)!,
      ];
      if (
        !openings.some(
          (hole) =>
            Math.hypot(proposed[0] - hole[0], proposed[2] - hole[2]) <= 3,
        )
      )
        proposed[1] = -2.7;
    }
    if (this.habitat.theme !== "deep")
      proposed[1] = Math.max(
        proposed[1],
        seafloorHeight(proposed[0], proposed[2], this.habitat.theme) + 1.2,
      );
    if (
      this.obstacles.some(
        (o) => distance(proposed, o.position) < o.radius + 0.399,
      )
    ) {
      proposed = copy(this.position);
      this.stop();
    }
    this.position = proposed;
    if (this.remaining > 0) {
      this.remaining -= dt;
      if (this.remaining <= 0) this.stop();
    }
    if (boundary) this.stop();
    if (this.position[1] > -0.35) this.surface = true;
    else if (this.position[1] < -0.8) this.surface = false;
  }
  get turning() {
    return Math.abs(this.turnRemaining) > 0.001;
  }
  snapshot() {
    return {
      position: copy(this.position),
      heading: this.heading,
      speed: this.speed,
      motion: this.motion,
      mode: this.mode,
      surface: this.surface,
      spawnId: this.spawnId,
      habitatId: this.habitat.id,
      elapsed: this.elapsed,
    };
  }
}
export type TargetCandidate = {
  entity: EntityInstance;
  position: Vec3;
  visible: boolean;
  centrality: number;
};
export function selectTarget(
  player: Vec3,
  candidates: TargetCandidate[],
  obstacles: Obstacle[],
  previousId?: string,
) {
  const eligible = candidates.filter((c) => {
    const d = distance(player, c.position);
    if (!c.visible || d - c.entity.radius > 5.5) return false;
    return !obstacles.some((o) => {
      const ab = c.position.map((v, i) => v - player[i]);
      const t = Math.max(
        0,
        Math.min(
          1,
          o.position.reduce((n, v, i) => n + (v - player[i]) * ab[i], 0) /
            (d * d || 1),
        ),
      );
      const closest = player.map((v, i) => v + ab[i] * t) as Vec3;
      return t > 0.04 && t < 0.95 && distance(closest, o.position) < o.radius;
    });
  });
  eligible.sort(
    (a, b) =>
      distance(player, a.position) -
      a.entity.radius +
      a.centrality * 2 -
      (a.entity.id === previousId ? 1 : 0) -
      (distance(player, b.position) -
        b.entity.radius +
        b.centrality * 2 -
        (b.entity.id === previousId ? 1 : 0)),
  );
  return eligible[0]?.entity;
}
