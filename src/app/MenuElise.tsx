import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/** The same Elise as in the game, floating beside the scene picker. */
export function MenuElise({
  reducedMotion = false,
}: {
  reducedMotion?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 20);
    camera.position.set(0.9, 0.15, -4.8);
    camera.lookAt(0, 0, 0);
    scene.add(new THREE.HemisphereLight(0xe3faff, 0x366474, 2.2));
    const key = new THREE.DirectionalLight(0xffe8c7, 3.2);
    key.position.set(-3, 4, -5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x77fff1, 2);
    rim.position.set(3, 1, 2);
    scene.add(rim);
    let model: THREE.Object3D | undefined;
    let mixer: THREE.AnimationMixer | undefined;
    let disposed = false;
    let frame = 0;
    let previous = 0;
    const release = (object: THREE.Object3D) => {
      object.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) return;
        node.geometry.dispose();
        const materials = Array.isArray(node.material)
          ? node.material
          : [node.material];
        for (const material of materials) {
          for (const value of Object.values(material))
            if (value instanceof THREE.Texture) value.dispose();
          material.dispose();
        }
      });
    };
    const resize = () => {
      const { width, height } = element.getBoundingClientRect();
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      // Keep the full tail in frame on a narrow phone layout as well.
      camera.position.z = -Math.max(4.8, 2.2 / camera.aspect);
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animate = (now: number) => {
      if (disposed) return;
      if (!reducedMotion && !motion.matches && !document.hidden)
        mixer?.update(Math.min((now - previous) / 1000 || 0, 0.05));
      previous = now;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
    new GLTFLoader().load(
      "/assets/models/elise.glb",
      (gltf) => {
        if (disposed) {
          release(gltf.scene);
          return;
        }
        model = gltf.scene;
        const center = new THREE.Box3()
          .setFromObject(model)
          .getCenter(new THREE.Vector3());
        model.position.sub(center);
        scene.add(model);
        mixer = new THREE.AnimationMixer(model);
        const idle = gltf.animations.find((clip) => clip.name === "idle");
        if (idle) mixer.clipAction(idle).play();
        resize();
        setReady(true);
        frame = requestAnimationFrame(animate);
      },
      undefined,
      () => {
        /* The existing portrait stays visible if WebGL/model loading fails. */
      },
    );
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      mixer?.stopAllAction();
      if (model) release(model);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [reducedMotion]);
  return (
    <div
      className="menu-elise"
      role="img"
      aria-label="Elise, your mermaid friend"
    >
      <div className="elise-glow" />
      <img
        className={ready ? "elise-fallback loaded" : "elise-fallback"}
        src="/assets/portraits/elise.png"
        alt=""
      />
      <div className="elise-stage" ref={host} />
      <span className="elise-name">
        Elise <span aria-hidden="true">✧</span>
      </span>
    </div>
  );
}
