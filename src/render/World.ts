import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import {
  mergeGeometries,
  mergeVertices,
} from "three/addons/utils/BufferGeometryUtils.js";
import { explorationRegions } from "../game/exploration";
import { seafloorHeight } from "../game/terrain";
import { Simulation, selectTarget } from "../game/simulation";
import type {
  HabitatDefinition,
  DiscoveryRecord,
  EntityInstance,
  Vec3,
} from "../shared/contracts";
export type WorldOptions = {
  quality: "low" | "medium" | "high";
  reducedMotion: boolean;
  onTarget: (id?: string) => void;
  onReady: () => void;
  onError: (message: string) => void;
  onSurface: (surface: boolean) => void;
};
type Actor = {
  entity: EntityInstance;
  root: THREE.Object3D;
  base: THREE.Vector3;
  mixer?: THREE.AnimationMixer;
};
const rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
function smoothStone(detail: number) {
  const geometry = new THREE.IcosahedronGeometry(1, detail);
  geometry.deleteAttribute("normal");
  geometry.deleteAttribute("uv");
  const smooth = mergeVertices(geometry);
  geometry.dispose();
  smooth.computeVertexNormals();
  return smooth;
}
/** Original procedural mineral pores and patchy encrustation, not copied reference imagery. */
function reefSurface(material: THREE.MeshStandardMaterial, limestone = false) {
  material.roughness = 0.93;
  material.customProgramCacheKey = () =>
    limestone ? "limestone-v1" : "coral-v1";
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vReefPoint;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvReefPoint=position;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vReefPoint;",
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
      float reefPatch=sin(vReefPoint.x*3.7+sin(vReefPoint.z*2.1))*sin(vReefPoint.y*4.3+vReefPoint.z*2.8);
      float pores=sin(vReefPoint.x*72.1)*sin(vReefPoint.y*67.3+vReefPoint.z*81.7);
      diffuseColor.rgb *= .86 + .19*reefPatch + .09*pores;
      ${limestone ? "diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.13,.22,.15),smoothstep(.2,.72,reefPatch)*.45); diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.32,.21,.29),(1.-smoothstep(-.88,-.6,reefPatch))*.18);" : ""}
    `,
      );
  };
}
export class World {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(52, 1, 0.08, 180);
  readonly sim: Simulation;
  private options: WorldOptions;
  private visualMode =
    (import.meta.env.DEV || import.meta.env.MODE === "test") &&
    new URLSearchParams(location.search).has("visual");
  private running = true;
  private staticObstacles: { position: Vec3; radius: number }[] = [];
  private raf = 0;
  private resize: ResizeObserver;
  private actors: Actor[] = [];
  private sceneryChunks: { root: THREE.Object3D; x: number; z: number }[] = [];
  private elise?: THREE.Object3D;
  private eliseMixer?: THREE.AnimationMixer;
  private eliseActions: Record<string, THREE.AnimationAction> = {};
  private currentClip = "";
  private last = 0;
  private targetId?: string;
  private surface = false;
  private frame = 0;
  private frames: number[] = [];
  private peakCalls = 0;
  private peakTriangles = 0;
  private geometries = new Set<THREE.BufferGeometry>();
  private materials = new Set<THREE.Material>();
  private textures = new Set<THREE.Texture>();
  private waterTime = { value: 0 };
  private coastal: THREE.Object3D[] = [];
  private wave?: THREE.Mesh;
  private particles?: THREE.Points;
  private highlight: THREE.Mesh;
  private rays: THREE.Group;
  private sky = new THREE.Color("#acdfe2");
  private underwater: THREE.Color;
  private pointerHandler: (e: PointerEvent) => void;
  private contextHandler: (e: Event) => void;
  private light: THREE.PointLight;
  constructor(
    private host: HTMLElement,
    habitat: HabitatDefinition,
    discoveries: DiscoveryRecord[],
    spawnId: string,
    options: WorldOptions,
  ) {
    this.options = options;
    this.sim = new Simulation(habitat, spawnId);
    this.underwater = new THREE.Color(habitat.lighting.water);
    this.renderer = new THREE.WebGLRenderer({
      antialias: options.quality !== "low",
      powerPreference: "high-performance",
      preserveDrawingBuffer: import.meta.env.MODE === "test",
    });
    this.renderer.setPixelRatio(
      Math.min(
        devicePixelRatio,
        options.quality === "high" ? 2 : options.quality === "medium" ? 1.5 : 1,
      ),
    );
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure =
      habitat.theme === "deep" ? 1.1 : habitat.lighting.exposure;
    this.renderer.setClearColor(this.underwater);
    host.append(this.renderer.domElement);
    this.renderer.domElement.setAttribute(
      "aria-label",
      "Elise swimming in " + habitat.name,
    );
    this.renderer.domElement.setAttribute("role", "img");
    this.scene.background = this.underwater.clone();
    this.scene.fog = new THREE.FogExp2(this.underwater, habitat.lighting.fog);
    this.scene.add(
      new THREE.HemisphereLight(
        habitat.theme === "deep" ? 0xb1c9e6 : 0xc7f6ff,
        habitat.theme === "deep" ? 0x506886 : 0x234746,
        habitat.theme === "deep" ? 2.2 : 1.45,
      ),
    );
    const sun = new THREE.DirectionalLight(
      0xfff5d3,
      habitat.theme === "deep" ? 0.7 : 2.0,
    );
    sun.position.set(-8, 18, 10);
    this.scene.add(sun);
    this.light = new THREE.PointLight(
      0xc0faff,
      habitat.theme === "deep" ? 25 : 4,
      18,
      1,
    );
    this.scene.add(this.light);
    this.highlight = new THREE.Mesh(
      new THREE.TorusGeometry(0.6, 0.022, 6, 48),
      new THREE.MeshBasicMaterial({
        color: 0xffe7a3,
        transparent: true,
        opacity: 0.8,
        depthTest: true,
      }),
    );
    this.highlight.visible = false;
    this.scene.add(this.highlight);
    this.rays = new THREE.Group();
    this.scene.add(this.rays);
    this.makeEnvironment();
    this.staticObstacles = [...this.sim.obstacles];
    this.resize = new ResizeObserver(() => this.resizeCanvas());
    this.resize.observe(host);
    this.resizeCanvas();
    this.contextHandler = (e) => {
      e.preventDefault();
      this.sim.stop();
      this.options.onError("The ocean needs a moment. Let’s open it again.");
    };
    this.renderer.domElement.addEventListener(
      "webglcontextlost",
      this.contextHandler,
    );
    this.pointerHandler = (e) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      const ray = new THREE.Raycaster();
      ray.setFromCamera(
        new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          (-(e.clientY - rect.top) / rect.height) * 2 + 1,
        ),
        this.camera,
      );
      const hits = ray.intersectObjects(
        this.actors.map((a) => a.root),
        true,
      );
      if (hits[0]) {
        let object: THREE.Object3D | null = hits[0].object;
        while (object && !object.userData.entityId) object = object.parent;
        const actor = this.actors.find(
          (a) => a.entity.id === object?.userData.entityId,
        );
        if (
          actor &&
          selectTarget(
            this.sim.position,
            [
              {
                entity: actor.entity,
                position: actor.root.position.toArray() as Vec3,
                visible: true,
                centrality: 0,
              },
            ],
            this.sim.obstacles,
          )
        ) {
          this.targetId = actor.entity.id;
          this.options.onTarget(actor.entity.discoveryId);
        }
      }
    };
    this.renderer.domElement.addEventListener("pointerup", this.pointerHandler);
    this.camera.position.set(
      this.sim.position[0],
      this.sim.position[1] + 2,
      this.sim.position[2] + 5.5,
    );
    void this.load(discoveries);
    this.raf = requestAnimationFrame(this.animate);
  }
  private resizeCanvas() {
    const { width, height } = this.host.getBoundingClientRect();
    this.renderer.setSize(width, height);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }
  private track(root: THREE.Object3D) {
    root.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points) {
        this.geometries.add(o.geometry);
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          this.materials.add(m);
          for (const value of Object.values(m))
            if (value instanceof THREE.Texture) this.textures.add(value);
        }
      }
    });
  }
  private async load(discoveries: DiscoveryRecord[]) {
    try {
      const loader = new GLTFLoader();
      const ids = [
        ...new Set([
          "elise",
          ...this.sim.habitat.entities.map(
            (e) => discoveries.find((d) => d.id === e.discoveryId)!.assetId,
          ),
        ]),
      ];
      const results = await Promise.allSettled(
        ids.map(async (id) => ({
          id,
          gltf: await loader.loadAsync("/assets/models/" + id + ".glb"),
        })),
      );
      const loaded = results
        .filter(
          (
            r,
          ): r is PromiseFulfilledResult<{
            id: string;
            gltf: Awaited<ReturnType<GLTFLoader["loadAsync"]>>;
          }> => r.status === "fulfilled",
        )
        .map((r) => r.value);
      if (results.some((r) => r.status === "rejected")) {
        for (const { gltf } of loaded)
          gltf.scene.traverse((o) => {
            if (o instanceof THREE.Mesh) {
              o.geometry.dispose();
              for (const m of Array.isArray(o.material)
                ? o.material
                : [o.material])
                m.dispose();
            }
          });
        throw Error("Asset load failed");
      }
      if (!this.running) {
        for (const { gltf } of loaded) {
          this.track(gltf.scene);
        }
        this.disposeResources();
        return;
      }
      for (const { id, gltf } of loaded) {
        if (["staghorn-coral", "elkhorn-coral", "reef-limestone"].includes(id))
          gltf.scene.traverse((node) => {
            if (node instanceof THREE.Mesh)
              for (const material of Array.isArray(node.material)
                ? node.material
                : [node.material])
                if (material instanceof THREE.MeshStandardMaterial)
                  reefSurface(material, id === "reef-limestone");
          });
      }
      const elise = loaded.find((x) => x.id === "elise")!.gltf;
      this.elise = new THREE.Group();
      this.elise.name = "PlayerElise";
      this.elise.add(elise.scene);
      this.scene.add(this.elise);
      this.eliseMixer = new THREE.AnimationMixer(elise.scene);
      for (const clip of elise.animations)
        this.eliseActions[clip.name] = this.eliseMixer.clipAction(clip);
      for (const entity of this.sim.habitat.entities) {
        const discovery = discoveries.find((d) => d.id === entity.discoveryId)!;
        const gltf = loaded.find((x) => x.id === discovery.assetId)!.gltf;
        const root = new THREE.Group();
        root.add(clone(gltf.scene));
        if (entity.behavior === "school") {
          for (let n = 0; n < 4; n++) {
            const companion = clone(gltf.scene);
            companion.position.set(
              (n % 2 === 0 ? -1 : 1) * (0.25 + n * 0.09),
              n * 0.035,
              (n - 1.5) * 0.23,
            );
            companion.scale.setScalar(0.65 + n * 0.06);
            root.add(companion);
          }
        }
        root.position.fromArray(entity.position);
        root.scale.setScalar(entity.scale);
        if (discovery.modelKind === "penguin" && entity.behavior === "glide")
          root.rotation.x = Math.PI / 2;
        root.userData.entityId = entity.id;
        this.scene.add(root);
        const mixer = gltf.animations.length
          ? new THREE.AnimationMixer(root)
          : undefined;
        if (mixer) for (const c of gltf.animations) mixer.clipAction(c).play();
        this.actors.push({ entity, root, base: root.position.clone(), mixer });
      }
      // Region-sized instance batches can disappear into fog independently.
      if (["reef", "caribbean", "wreck"].includes(this.sim.habitat.theme)) {
        const random = rng(825);
        for (const region of explorationRegions) {
          const chunk = new THREE.Group();
          for (const id of this.sim.habitat.theme === "reef"
            ? ["staghorn-coral", "seagrass"]
            : this.sim.habitat.theme === "caribbean"
              ? ["elkhorn-coral", "sea-fan", "turtle-grass"]
              : ["sea-fan"]) {
            const asset = loaded.find((x) => x.id === id)?.gltf.scene;
            if (!asset) continue;
            asset.updateMatrixWorld(true);
            const central = !region.x && !region.z;
            const count = Math.round(
              (id.includes("grass") ? 60 : id === "sea-fan" ? 24 : 48) *
                (central ? 1 : 0.65),
            );
            const placements = Array.from({ length: count }, () => ({
              x: region.x + (random() - 0.5) * 40,
              z: region.z + (random() - 0.5) * 40,
              scale: id.includes("grass")
                ? 1.5 + random() * 2
                : 2 + random() * 3,
              yaw: random() * Math.PI * 2,
              tint: random(),
            }));
            asset.traverse((o) => {
              if (!(o instanceof THREE.Mesh)) return;
              const instanced = new THREE.InstancedMesh(
                o.geometry,
                o.material,
                count,
              );
              instanced.userData.fullCount = count;
              for (let i = 0; i < count; i++) {
                const { x, z, scale, yaw, tint } = placements[i];
                const transform = new THREE.Matrix4()
                  .compose(
                    new THREE.Vector3(
                      x,
                      seafloorHeight(x, z, this.sim.habitat.theme),
                      z,
                    ),
                    new THREE.Quaternion().setFromAxisAngle(
                      new THREE.Vector3(0, 1, 0),
                      yaw,
                    ),
                    new THREE.Vector3(scale, scale, scale),
                  )
                  .multiply(o.matrixWorld);
                instanced.setMatrixAt(i, transform);
                if (!id.includes("grass"))
                  instanced.setColorAt(
                    i,
                    new THREE.Color().setHSL(
                      id === "sea-fan" ? 0.78 : 0.08 + tint * 0.08,
                      0.18 + tint * 0.18,
                      0.48 + tint * 0.22,
                    ),
                  );
              }
              instanced.instanceMatrix.needsUpdate = true;
              chunk.add(instanced);
            });
          }
          this.scene.add(chunk);
          this.sceneryChunks.push({ root: chunk, x: region.x, z: region.z });
        }
      }
      for (const { gltf } of loaded) this.track(gltf.scene);
      this.track(this.scene);
      this.frame = 0;
      requestAnimationFrame(() => {
        if (this.running) this.options.onReady();
      });
    } catch {
      if (this.running)
        this.options.onError(
          "One of our ocean pictures didn’t arrive. Let’s try again.",
        );
    }
  }
  private mesh(
    geometry: THREE.BufferGeometry,
    color: THREE.ColorRepresentation,
    position: Vec3,
    roughness = 0.85,
  ) {
    const m = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ color, roughness }),
    );
    m.position.fromArray(position);
    this.scene.add(m);
    return m;
  }
  private makeEnvironment() {
    const h = this.sim.habitat,
      random = rng(4107),
      deep = h.theme === "deep",
      ice = h.theme === "ice";
    if (!deep) {
      const ground = new THREE.PlaneGeometry(320, 320, 128, 128);
      ground.rotateX(-Math.PI / 2);
      const p = ground.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i),
          z = p.getZ(i);
        p.setY(i, seafloorHeight(x, z, h.theme) + 10.8);
      }
      ground.computeVertexNormals();
      const tones = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) {
        const color = new THREE.Color(
          ice ? "#7c9faa" : h.theme === "wreck" ? "#9fb5a7" : "#e2d5ad",
        );
        if (!ice && h.theme !== "wreck")
          color.lerp(
            new THREE.Color("#597b66"),
            Math.min(1, Math.max(0, p.getY(i) - 0.4) * 0.25),
          );
        color.toArray(tones, i * 3);
      }
      ground.setAttribute("color", new THREE.BufferAttribute(tones, 3));
      const floor = this.mesh(ground, "#ffffff", [0, -10.8, 0]);
      const mat = floor.material as THREE.MeshStandardMaterial;
      mat.vertexColors = true;
      if (!ice) {
        mat.onBeforeCompile = (shader) => {
          shader.uniforms.waterTime = this.waterTime;
          shader.vertexShader = shader.vertexShader
            .replace(
              "#include <common>",
              "#include <common>\nvarying vec3 vWaterWorld;",
            )
            .replace(
              "#include <begin_vertex>",
              "#include <begin_vertex>\nvWaterWorld=(modelMatrix*vec4(transformed,1.)).xyz;",
            );
          shader.fragmentShader = shader.fragmentShader
            .replace(
              "#include <common>",
              "#include <common>\nuniform float waterTime; varying vec3 vWaterWorld;",
            )
            .replace(
              "#include <color_fragment>",
              "#include <color_fragment>\nfloat caustic=sin(vWaterWorld.x*2.6+sin(vWaterWorld.z*1.8+waterTime*.7))*sin(vWaterWorld.z*2.3+sin(vWaterWorld.x*1.5-waterTime*.6)); diffuseColor.rgb*=.93+.25*pow(abs(caustic),8.);",
            );
        };
      }
      for (const region of explorationRegions) {
        const rockGeometries: THREE.BufferGeometry[] = [];
        for (let i = 0; i < 22; i++) {
          const x = region.x + (random() - 0.5) * 44;
          const z = region.z + (random() - 0.5) * 44;
          const scale = 0.8 + random() * 2.6;
          if (Math.hypot(x - region.x, z - region.z - 4) < 8) continue;
          const g = smoothStone(2);
          const v = g.attributes.position;
          for (let j = 0; j < v.count; j++) {
            const ripple = 1 + Math.sin(v.getX(j) * 7 + v.getY(j) * 4) * 0.12;
            v.setXYZ(
              j,
              v.getX(j) * scale * ripple,
              v.getY(j) * scale * 0.6 * ripple,
              v.getZ(j) * scale * ripple,
            );
          }
          g.computeVertexNormals();
          const bed = seafloorHeight(x, z, h.theme) + scale * 0.2;
          g.translate(x, bed, z);
          rockGeometries.push(g);
          this.sim.obstacles.push({
            position: [x, bed, z],
            radius: scale * 0.6,
          });
        }
        // Weathered swim-through arches give the outer reef recognizable landmarks.
        if (!ice && h.theme !== "wreck" && region.index % 2 === 0) {
          const x = region.x - 11,
            z = region.z - 14;
          const bed = seafloorHeight(x, z, h.theme);
          const curve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(x - 5, bed + 0.8, z),
            new THREE.Vector3(x, bed + 12, z),
            new THREE.Vector3(x + 5, bed + 0.8, z),
          );
          const arch = new THREE.TubeGeometry(curve, 18, 0.85, 7, false);
          arch.deleteAttribute("uv");
          rockGeometries.push(arch);
          for (const t of [0, 0.15, 0.85, 1])
            this.sim.obstacles.push({
              position: curve.getPoint(t).toArray() as Vec3,
              radius: 0.9,
            });
        }
        const combined = mergeGeometries(rockGeometries);
        if (combined) {
          const rocks = this.mesh(
            combined,
            ice ? "#506a7c" : "#aaa38c",
            [0, 0, 0],
          );
          reefSurface(rocks.material, !ice);
          this.sceneryChunks.push({ root: rocks, x: region.x, z: region.z });
        }
        rockGeometries.forEach((g) => g.dispose());
      }
    }
    const waterGeometry = new THREE.PlaneGeometry(600, 600, 60, 60);
    waterGeometry.rotateX(-Math.PI / 2);
    this.wave = new THREE.Mesh(
      waterGeometry,
      new THREE.MeshPhysicalMaterial({
        color: ice ? "#8ed6df" : "#328f9e",
        transparent: true,
        opacity: 0.32,
        roughness: 0.22,
        metalness: 0.12,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    this.wave.position.y = 0.15;
    this.scene.add(this.wave);
    if (!ice && h.theme !== "wreck") {
      const before = new Set(this.scene.children);
      // A compressed coastal view, explicitly described in habitat notes.
      const coast = new THREE.PlaneGeometry(78, 40, 52, 30);
      coast.rotateX(-Math.PI / 2);
      const cp = coast.attributes.position;
      const colors = new Float32Array(cp.count * 3);
      for (let i = 0; i < cp.count; i++) {
        const x = cp.getX(i),
          z = cp.getZ(i),
          ridge = Math.max(0, 1 - ((x * x) / 1521 + (z * z) / 400));
        const y =
          -1.6 +
          7 * Math.pow(ridge, 2.2) +
          (Math.sin(x * 0.42) + Math.sin(z * 0.7 + x * 0.17)) * 0.25 * ridge;
        cp.setY(i, y);
        const color = new THREE.Color(
          deep ? "#68817d" : y > 0.8 ? "#57775a" : "#ddcaa1",
        );
        color.multiplyScalar(0.9 + 0.1 * Math.sin(x * 0.6 + z * 0.5));
        color.toArray(colors, i * 3);
      }
      coast.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      coast.computeVertexNormals();
      const island = new THREE.Mesh(
        coast,
        new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
      );
      island.position.set(0, 0, -166);
      this.scene.add(island);
      if (h.theme === "reef") {
        const shore = this.mesh(
          new THREE.SphereGeometry(1, 32, 12),
          "#e5d7ad",
          [8, -0.5, 13],
        );
        shore.scale.set(5, 1.4, 7);
        this.sim.obstacles.push({ position: [8, -0.5, 13], radius: 4 });
      }
      const canopy: THREE.BufferGeometry[] = [];
      if (!deep)
        for (let i = 0; i < (h.theme === "reef" ? 40 : 26); i++) {
          const x = (random() - 0.5) * 52,
            z = -162 - random() * 11;
          const ridge = Math.max(
            0,
            1 - ((x * x) / 1521 + ((z + 166) * (z + 166)) / 400),
          );
          const ground = -1.6 + 7 * Math.pow(ridge, 2.2);
          if (ground < 0.7) continue;
          const leaf = smoothStone(2);
          const radius =
            h.theme === "reef" ? 1.6 + random() * 1.5 : 1 + random();
          leaf.scale(radius, radius * 0.8, radius);
          leaf.translate(x, ground + radius * 0.6, z);
          canopy.push(leaf);
        }
      if (canopy.length) {
        const forest = mergeGeometries(canopy);
        if (forest) this.mesh(forest, "#416e53", [0, 0, 0]);
        canopy.forEach((g) => g.dispose());
      }
      this.coastal = this.scene.children.filter((o) => !before.has(o));
      this.coastal.forEach((o) => (o.visible = false));
    }
    if (ice) {
      const shape = new THREE.Shape();
      shape.moveTo(-180, -180);
      shape.lineTo(180, -180);
      shape.lineTo(180, 180);
      shape.lineTo(-180, 180);
      shape.closePath();
      for (const hole of h.surfaceOpenings ?? [h.surfaceRoute.at(-1)!]) {
        const opening = new THREE.Path();
        opening.absellipse(hole[0], hole[2], 5.4, 5.4, 0, Math.PI * 2, true, 0);
        shape.holes.push(opening);
      }
      const sheet = new THREE.ExtrudeGeometry(shape, {
        depth: 1.8,
        bevelEnabled: true,
        bevelSize: 0.18,
        bevelThickness: 0.12,
        bevelSegments: 2,
        curveSegments: 24,
      });
      sheet.rotateX(Math.PI / 2);
      sheet.translate(0, 1, 0);
      const vertices = sheet.attributes.position;
      const colors = new Float32Array(vertices.count * 3);
      for (let i = 0; i < vertices.count; i++) {
        const x = vertices.getX(i),
          y = vertices.getY(i),
          z = vertices.getZ(i);
        vertices.setY(i, y + Math.sin(x * 0.35) * Math.cos(z * 0.4) * 0.12);
        new THREE.Color(y > 0 ? "#dfeced" : "#65acc3").toArray(colors, i * 3);
      }
      sheet.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      sheet.computeVertexNormals();
      const iceMaterial = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.67,
        side: THREE.DoubleSide,
        emissive: "#32667b",
        emissiveIntensity: 0.38,
      });
      reefSurface(iceMaterial);
      this.scene.add(new THREE.Mesh(sheet, iceMaterial));
      for (const region of explorationRegions) {
        for (let i = 0; i < 3; i++) {
          const x = region.x + (random() - 0.5) * 38,
            z = region.z + (random() - 0.5) * 38;
          if (
            h.surfaceOpenings?.some(
              (hole) => Math.hypot(x - hole[0], z - hole[2]) < 10,
            )
          )
            continue;
          const berg = this.mesh(
            new THREE.IcosahedronGeometry(1, 1),
            "#d6eef1",
            [x, 1, z],
          );
          berg.scale.set(2 + random() * 3, 2 + random() * 5, 3);
          reefSurface(berg.material);
        }
      }
    }
    if (!deep) {
      for (const entity of h.entities) {
        if (
          ["still", "sway"].includes(entity.behavior) &&
          entity.position[1] < -4 &&
          !["marine-snow", "deep-water", "green-moray"].includes(
            entity.discoveryId,
          )
        ) {
          const mound = this.mesh(smoothStone(5), ice ? "#6f8791" : "#b4ad93", [
            entity.position[0],
            -10.4,
            entity.position[2],
          ]);
          reefSurface(mound.material, !ice);
          this.sceneryChunks.push({
            root: mound,
            x: entity.position[0],
            z: entity.position[2],
          });
          const vertices = mound.geometry.attributes.position;
          for (let k = 0; k < vertices.count; k++) {
            const x = vertices.getX(k),
              y = vertices.getY(k),
              z = vertices.getZ(k);
            const erosion =
              1 + Math.sin(x * 9 + z * 5) * Math.cos(y * 7 - z * 3) * 0.15;
            vertices.setXYZ(k, x * erosion, y * erosion, z * erosion);
          }
          mound.geometry.computeVertexNormals();
          const height = Math.max(0.3, entity.position[1] + 10.4);
          mound.scale.set(
            Math.max(1.4, height * 0.9),
            height,
            Math.max(1.3, height * 0.85),
          );
          this.sim.obstacles.push({
            position: [entity.position[0], -10.4, entity.position[2]],
            radius: height,
          });
        }
      }
    }
    if (!deep && !ice) {
      // Original abstract reef architecture is backdrop; identifiable coral taxa use authored GLBs.
      for (let i = 0; i < 6; i++) {
        const beam = new THREE.Mesh(
          new THREE.CylinderGeometry(0.4, 2.3, 22, 12, 1, true),
          new THREE.MeshBasicMaterial({
            color: 0xb7f4df,
            transparent: true,
            opacity: 0.027,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        );
        beam.position.set(-18 + i * 8, -3, -12);
        beam.rotation.z = -0.28;
        this.rays.add(beam);
      }
    }
    const count = this.options.quality === "low" ? 80 : deep ? 550 : 240;
    const points = new Float32Array(count * 3);
    for (let i = 0; i < points.length; i += 3) {
      points[i] = (random() - 0.5) * 65;
      points[i + 1] = -random() * 15;
      points[i + 2] = (random() - 0.5) * 65;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(points, 3));
    this.particles = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: deep ? "#a7bbd5" : "#cdf4ed",
        size: deep ? 0.027 : 0.035,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      }),
    );
    this.scene.add(this.particles);
    this.track(this.scene);
  }
  private animate = (time: number) => {
    if (!this.running) return;
    const rawDelta = this.last ? (time - this.last) / 1000 : 0;
    const delta = Math.min(rawDelta, 0.1);
    this.last = time;
    if (rawDelta > 0) this.frames.push(rawDelta * 1000);
    if (this.frames.length > 40000) this.frames.shift();
    const nearbyObstacles = this.staticObstacles.filter(
      (o) =>
        Math.hypot(
          o.position[0] - this.sim.position[0],
          o.position[2] - this.sim.position[2],
        ) <
        28 + o.radius,
    );
    this.sim.obstacles = [
      ...nearbyObstacles,
      ...this.actors
        .filter(
          (a) =>
            a.root.visible &&
            ![
              "sea-ice",
              "deep-water",
              "marine-snow",
              "reef-sand",
              "wreck-sand",
              "beach-sand",
            ].includes(a.entity.discoveryId) &&
            a.entity.behavior !== "fly",
        )
        .map((a) => ({
          position: a.root.position.toArray() as Vec3,
          radius:
            a.entity.radius * 0.7 + (a.entity.behavior === "school" ? 0.65 : 0),
        })),
    ];
    this.sim.advance(delta);
    const t = this.options.reducedMotion
      ? 0
      : this.visualMode
        ? 2
        : this.sim.elapsed;
    const pos = new THREE.Vector3(...this.sim.position);
    if (this.elise) {
      this.elise.position.copy(pos);
      this.elise.rotation.y = -this.sim.heading;
      this.elise.position.y += Math.sin(t * 1.8) * 0.055;
      const clip =
        this.sim.mode === "inspecting"
          ? "look"
          : this.sim.turning
            ? "turn"
            : this.sim.surface
              ? "surface"
              : this.sim.motion === "hover"
                ? "idle"
                : this.sim.speed === 2
                  ? "fast"
                  : "swim";
      if (clip !== this.currentClip) {
        this.eliseActions[this.currentClip]?.fadeOut(0.35);
        this.eliseActions[clip]?.reset().fadeIn(0.35).play();
        this.currentClip = clip;
      }
      if (this.visualMode) this.eliseMixer?.setTime(2);
      else this.eliseMixer?.update(this.options.reducedMotion ? 0 : delta);
    }
    const viewDistance =
      this.options.quality === "low"
        ? 34
        : this.options.quality === "high"
          ? 64
          : 44;
    for (const chunk of this.sceneryChunks) {
      const distance = Math.hypot(chunk.x - pos.x, chunk.z - pos.z);
      chunk.root.visible = distance < viewDistance + 22;
      if (chunk.root.visible && this.frame % 12 === 0)
        chunk.root.traverse((node) => {
          if (node instanceof THREE.InstancedMesh && node.userData.fullCount)
            node.count = Math.max(
              1,
              Math.round(node.userData.fullCount * (distance > 30 ? 0.22 : 1)),
            );
        });
    }
    this.actors.forEach((a, i) => {
      a.root.visible =
        Math.hypot(a.base.x - pos.x, a.base.z - pos.z) < viewDistance;
      if (this.sim.habitat.theme === "deep") {
        const zone = this.sim.habitat.depthZones.find(
          (z) => z.id === a.entity.zoneId,
        )!;
        a.root.visible =
          a.root.visible &&
          this.sim.position[1] >= zone.renderY[0] - 1.5 &&
          this.sim.position[1] <= zone.renderY[1] + 1.5;
      }
      if (!a.root.visible) return;
      if (a.entity.behavior === "school") {
        const distance = Math.hypot(a.base.x - pos.x, a.base.z - pos.z);
        a.root.children.forEach((fish, index) => {
          fish.visible =
            index === 0 || distance < 20 || (index === 1 && distance < 32);
        });
      }
      const b = a.entity.behavior;
      a.root.position.copy(a.base);
      if (!this.options.reducedMotion) {
        if (["school", "glide", "surface", "fly"].includes(b)) {
          const r = b === "fly" ? 1.6 : 0.8;
          const phase = t * (b === "school" ? 0.35 : 0.16) + i;
          a.root.position.x += Math.sin(phase) * r;
          a.root.position.z += Math.cos(phase) * r;
          a.root.rotation.y = -phase - Math.PI / 2;
          if (b === "surface")
            a.root.position.y +=
              Math.max(0, Math.sin(t * 0.05)) * Math.max(0, -a.base.y + 0.05);
        }
        if (["school", "glide", "surface"].includes(b)) {
          for (const obstacle of nearbyObstacles) {
            const center = new THREE.Vector3(...obstacle.position);
            const offset = a.root.position.clone().sub(center);
            const minDistance = obstacle.radius + a.entity.radius;
            if (offset.length() < minDistance)
              a.root.position
                .copy(center)
                .add(offset.normalize().multiplyScalar(minDistance));
          }
          const zone = this.sim.habitat.depthZones.find(
            (z) => z.id === a.entity.zoneId,
          )!;
          a.root.position.y = THREE.MathUtils.clamp(
            a.root.position.y,
            zone.renderY[0] + 0.2,
            b === "surface" ? 0.05 : zone.renderY[1] - 0.2,
          );
        }
        if (b === "pulse") {
          a.root.position.y += Math.sin(t * 0.6 + i) * 0.25;
          a.root.scale.setScalar(
            a.entity.scale * (1 + Math.sin(t * 2) * 0.035),
          );
        }
        if (b === "sway") a.root.rotation.z = Math.sin(t * 0.8 + i) * 0.07;
        if (this.visualMode) a.mixer?.setTime(2);
        else a.mixer?.update(delta);
      }
    });
    // Bring the camera into an ice opening before following Elise above the roof.
    const cameraOpening =
      this.sim.habitat.theme === "ice" && pos.y > -4.5
        ? this.sim.habitat.surfaceOpenings?.find(
            (hole) => Math.hypot(pos.x - hole[0], pos.z - hole[2]) < 6,
          )
        : undefined;
    const followDistance = cameraOpening ? 3.4 : 7.2;
    const shoulderDistance = cameraOpening ? 1 : 2.4;
    const desired = pos
      .clone()
      .add(
        new THREE.Vector3(
          -Math.sin(this.sim.heading) * followDistance +
            Math.cos(this.sim.heading) * shoulderDistance,
          2.7,
          Math.cos(this.sim.heading) * followDistance +
            Math.sin(this.sim.heading) * shoulderDistance,
        ),
      );
    desired.y = Math.max(desired.y, this.sim.habitat.bounds.min[1] + 1.2);
    if (!this.sim.surface)
      desired.y = Math.min(
        desired.y,
        this.sim.habitat.theme === "ice" ? -1.2 : -0.65,
      );
    for (const o of this.sim.obstacles) {
      const center = new THREE.Vector3(...o.position);
      if (desired.distanceTo(center) < o.radius + 0.4)
        desired.copy(center).add(
          desired
            .clone()
            .sub(center)
            .normalize()
            .multiplyScalar(o.radius + 0.4),
        );
    }
    const keepInsideOpening = (point: THREE.Vector3) => {
      if (!cameraOpening || point.y < -2) return;
      const dx = point.x - cameraOpening[0];
      const dz = point.z - cameraOpening[2];
      const distance = Math.hypot(dx, dz);
      if (distance > 4) {
        point.x = cameraOpening[0] + (dx * 4) / distance;
        point.z = cameraOpening[2] + (dz * 4) / distance;
      }
    };
    keepInsideOpening(desired);
    this.camera.position.lerp(
      desired,
      this.options.reducedMotion || this.visualMode
        ? 1
        : 1 - Math.exp(-delta * 4),
    );
    keepInsideOpening(this.camera.position);
    const lookAhead = cameraOpening ? 1.5 : 4;
    this.camera.lookAt(
      pos
        .clone()
        .add(
          new THREE.Vector3(
            Math.sin(this.sim.heading) * lookAhead,
            0.25,
            -Math.cos(this.sim.heading) * lookAhead,
          ),
        ),
    );
    this.light.position
      .copy(pos)
      .add(
        new THREE.Vector3(
          Math.sin(this.sim.heading) * 3,
          0.5,
          -Math.cos(this.sim.heading) * 3,
        ),
      );
    if (this.sim.surface !== this.surface) {
      this.surface = this.sim.surface;
      this.options.onSurface(this.surface);
    }
    this.coastal.forEach((o) => (o.visible = this.surface));
    const blend = THREE.MathUtils.clamp(
      (this.camera.position.y + 0.8) / 1.2,
      0,
      1,
    );
    const bg = this.underwater.clone().lerp(this.sky, blend);
    (this.scene.background as THREE.Color).copy(bg);
    (this.scene.fog as THREE.FogExp2).color.copy(bg);
    (this.scene.fog as THREE.FogExp2).density = THREE.MathUtils.lerp(
      this.sim.habitat.lighting.fog,
      0.009,
      blend,
    );
    if (this.wave)
      (this.wave.material as THREE.MeshPhysicalMaterial).opacity =
        0.23 + blend * 0.71;
    if (this.wave)
      this.wave.visible =
        this.sim.habitat.theme !== "deep" || this.sim.position[1] > -1.5;
    if (this.wave && !this.options.reducedMotion) {
      const p = this.wave.geometry.attributes.position;
      for (let i = 0; i < p.count; i++)
        p.setY(
          i,
          Math.sin(p.getX(i) * 0.22 + t * 0.6) *
            Math.cos(p.getZ(i) * 0.18 + t * 0.45) *
            0.12,
        );
      p.needsUpdate = true;
      this.wave.geometry.computeVertexNormals();
    }
    this.waterTime.value = t;
    if (this.particles) {
      const points = this.particles.geometry.attributes.position;
      for (let i = 0; i < points.count; i++) {
        points.setX(
          i,
          pos.x +
            THREE.MathUtils.euclideanModulo(points.getX(i) - pos.x + 32, 64) -
            32,
        );
        points.setZ(
          i,
          pos.z +
            THREE.MathUtils.euclideanModulo(points.getZ(i) - pos.z + 32, 64) -
            32,
        );
      }
      points.needsUpdate = true;
    }
    if (this.frame++ % 8 === 0) {
      const candidates = this.actors.map((a) => {
        const projected = a.root.position.clone().project(this.camera);
        return {
          entity: a.entity,
          position: a.root.position.toArray() as Vec3,
          visible:
            a.root.visible &&
            Math.abs(projected.x) < 1.1 &&
            Math.abs(projected.y) < 1.1 &&
            projected.z < 1,
          centrality: Math.hypot(projected.x, projected.y),
        };
      });
      const selected = selectTarget(
        this.sim.position,
        candidates,
        this.sim.obstacles,
        this.targetId,
      );
      if (selected?.id !== this.targetId) {
        this.targetId = selected?.id;
        this.options.onTarget(selected?.discoveryId);
      }
      const a = this.actors.find((a) => a.entity.id === this.targetId);
      this.highlight.visible = Boolean(a);
      if (a) {
        this.highlight.position.copy(a.root.position);
        this.highlight.quaternion.copy(this.camera.quaternion);
        this.highlight.scale.setScalar(Math.max(0.5, a.entity.radius + 0.25));
      }
    }
    this.renderer.render(this.scene, this.camera);
    this.peakCalls = Math.max(this.peakCalls, this.renderer.info.render.calls);
    this.peakTriangles = Math.max(
      this.peakTriangles,
      this.renderer.info.render.triangles,
    );
    this.raf = requestAnimationFrame(this.animate);
  };
  get selectedEntityId() {
    return this.targetId;
  }
  getStats() {
    const sorted = [...this.frames].sort((a, b) => a - b);
    return {
      frames: sorted.length,
      p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
      p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
      p99: sorted[Math.floor(sorted.length * 0.99)] || 0,
      calls: this.peakCalls,
      triangles: this.peakTriangles,
      currentCalls: this.renderer.info.render.calls,
      currentTriangles: this.renderer.info.render.triangles,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
      renderer: this.renderer
        .getContext()
        .getParameter(
          this.renderer.getContext().getExtension("WEBGL_debug_renderer_info")
            ?.UNMASKED_RENDERER_WEBGL || this.renderer.getContext().RENDERER,
        ),
      position: this.sim.snapshot(),
    };
  }
  resetStats() {
    this.frames = [];
    this.peakCalls = 0;
    this.peakTriangles = 0;
  }
  private disposeResources() {
    this.geometries.forEach((x) => x.dispose());
    this.materials.forEach((x) => x.dispose());
    this.textures.forEach((x) => x.dispose());
    this.geometries.clear();
    this.materials.clear();
    this.textures.clear();
  }
  dispose() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.resize.disconnect();
    this.renderer.domElement.removeEventListener(
      "webglcontextlost",
      this.contextHandler,
    );
    this.renderer.domElement.removeEventListener(
      "pointerup",
      this.pointerHandler,
    );
    this.eliseMixer?.stopAllAction();
    this.actors.forEach((a) => a.mixer?.stopAllAction());
    this.disposeResources();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
