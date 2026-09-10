import { useCallback, useEffect, useRef, useState } from "react";
import { habitats, discoveries, sources } from "../../content/catalog";
import { World } from "../render/World";
import { readSave, writeSave, freshSave, type Save } from "../game/storage";
import type {
  VoiceCommand,
  VoiceReadiness,
  CommandEnvelope,
} from "../shared/contracts";
import { requestMicrophonePermission } from "../voice/permission";
import { VoiceController } from "../voice/VoiceController";
import { AudioMixer } from "../audio/AudioMixer";
import "./style.css";
import { GameMenu } from "./GameMenu";
type Panel = "journal" | "settings" | "help" | "pause" | "discovery" | null;
export function App() {
  const [save, setSave] = useState<Save>(() => readSave(localStorage));
  const [view, setView] = useState<"map" | "starts" | "play">("map");
  const [habitatId, setHabitatId] = useState(habitats[0].id);
  const [spawnId, setSpawnId] = useState(habitats[0].spawns[0].id);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [panel, setPanel] = useState<Panel>(null);
  const [targetId, setTargetId] = useState<string>();
  const [cardId, setCardId] = useState<string>();
  const [message, setMessage] = useState("");
  const [surface, setSurface] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<VoiceReadiness>("off");
  const [voiceActivity, setVoiceActivity] = useState("ready");
  const [narrating, setNarrating] = useState(false);
  const [narratorSource, setNarratorSource] = useState("not-played");
  const [manualControls, setManualControls] = useState(false);
  const [holdVoice, setHoldVoice] = useState(false);
  const [micPermission, setMicPermission] = useState("pending");
  const [cloud, setCloud] = useState<{
    available?: boolean;
    childReady?: boolean;
    configured?: boolean;
    adultDevelopmentMode?: boolean;
    reason?: string;
  }>({});
  const adultVoice = cloud.adultDevelopmentMode === true;
  const cloudRef = useRef(cloud);
  cloudRef.current = cloud;
  const [speed, setSpeed] = useState(0);
  const sceneHost = useRef<HTMLDivElement>(null);
  const world = useRef<World>(null);
  const audio = useRef<AudioMixer>(null);
  const voice = useRef<VoiceController>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const sceneGeneration = useRef(0);
  const sessionGeneration = useRef(0);
  const permissionRequested = useRef(false);
  const autoVoiceStarted = useRef(false);
  const voiceSetupRequested = useRef(false);
  const lastAction = useRef(Date.now());
  const watched = useRef<Record<string, number>>({});
  const commandRef = useRef<(c: VoiceCommand) => void>(() => {});
  const targetRef = useRef(targetId);
  targetRef.current = targetId;
  const viewRef = useRef(view);
  viewRef.current = view;
  const panelRef = useRef(panel);
  panelRef.current = panel;
  const saveRef = useRef(save);
  saveRef.current = save;
  const habitat = habitats.find((h) => h.id === habitatId)!;
  const selected = discoveries.find((d) => d.id === cardId);
  const target = discoveries.find((d) => d.id === targetId);
  const say = useCallback((text: string, cue?: string) => {
    setMessage(text);
    if (cue) void audio.current?.narrate(cue);
  }, []);
  const persist = useCallback(
    (fn: (s: Save) => Save) =>
      setSave((s) => {
        const next = fn(s);
        writeSave(localStorage, next);
        return next;
      }),
    [],
  );
  const close = useCallback(() => {
    setPanel(null);
    world.current?.sim.setMode("exploring");
    audio.current?.stopNarration();
    void audio.current?.unlock();
  }, []);
  const open = useCallback((p: Panel) => {
    voice.current?.cancelPending();
    if (p === "settings") {
      voice.current?.stop();
      autoVoiceStarted.current = false;
    }
    world.current?.sim.setMode(
      p === "journal" ? "journal" : p === "discovery" ? "inspecting" : "paused",
    );
    setPanel(p);
  }, []);
  const inspect = useCallback(() => {
    const id = targetRef.current;
    if (!id) {
      world.current?.sim.stop();
      say(
        "Swim a little closer to something you’re curious about.",
        "narration-no-target",
      );
      return;
    }
    setCardId(id);
    open("discovery");
    if (!saveRef.current.journal.includes(id))
      void audio.current?.cue("discovery");
    persist((s) => ({ ...s, journal: [...new Set([...s.journal, id])] }));
    void audio.current?.narrate("narration-" + id);
  }, [open, persist, say]);
  const home = useCallback(() => {
    autoVoiceStarted.current = false;
    voice.current?.stop();
    audio.current?.stopNarration();
    setPanel(null);
    setView("map");
    setTargetId(undefined);
    world.current?.sim.stop();
  }, []);
  const command = useCallback(
    (c: VoiceCommand) => {
      lastAction.current = Date.now();
      voice.current?.cancelPending();
      switch (c.type) {
        case "swim":
          if (panelRef.current && panelRef.current !== "settings") close();
          break;
        case "inspect":
          if (panelRef.current === "discovery") close();
          else if (!panelRef.current) inspect();
          return;
        case "journal":
          open("journal");
          return;
        case "help":
          open("help");
          return;
        case "pause":
          open("pause");
          return;
        case "close":
        case "resume":
          close();
          return;
        case "surface":
          say(
            "Let’s visit the surface!",
            ["listening", "processing"].includes(voiceStatus)
              ? undefined
              : "narration-surface",
          );
          break;
        case "return":
          say("Back to our starting spot.", "narration-return");
          break;
      }
      world.current?.sim.command(c);
      if (c.type === "speed") setSpeed(world.current?.sim.speed || 0);
    },
    [close, inspect, open, say, voiceStatus],
  );
  commandRef.current = command;
  useEffect(() => {
    const mixer = new AudioMixer();
    audio.current = mixer;
    mixer.onError = (text) => setMessage(text);
    mixer.onNarratorSource = setNarratorSource;
    const controller = new VoiceController({
      context: () => ({
        sceneGeneration: sceneGeneration.current,
        sessionGeneration: sessionGeneration.current,
        targets:
          world.current?.sim.habitat.entities
            .filter((e) => e.id === world.current?.selectedEntityId)
            .map((e) => ({
              id: e.id,
              name: discoveries.find((d) => d.id === e.discoveryId)!.commonName,
            })) || [],
      }),
      onCommands: (envelope: CommandEnvelope) => {
        if (
          envelope.sceneGeneration !== sceneGeneration.current ||
          viewRef.current !== "play"
        )
          return;
        envelope.commands.forEach((c) => commandRef.current(c));
      },
      onActivity: (activity) => {
        setVoiceActivity(activity);
        if (activity === "hearing") lastAction.current = Date.now();
      },
      onStatus: (status: VoiceReadiness, text?: string) => {
        setVoiceStatus(status);
        if (status === "listening") setMicPermission("granted");
        if (text) setMessage(text);
      },
    });
    voice.current = controller;
    mixer.onNarrating = (active: boolean) => {
      setNarrating(active);
      controller.setNarrating(active);
    };
    fetch("/api/voice/status")
      .then((r) => r.json())
      .then(setCloud)
      .catch(() =>
        setCloud({
          available: false,
          reason:
            "The voice server is unavailable. Restart the server and reload this page.",
        }),
      );
    return () => {
      controller.dispose();
      mixer.dispose();
    };
  }, []);
  useEffect(() => {
    if (!save.settings.speechControl || permissionRequested.current) return;
    permissionRequested.current = true;
    const abort = new AbortController();
    void requestMicrophonePermission({
      signal: abort.signal,
      onLateResult: setMicPermission,
    }).then((result) => {
      if (!abort.signal.aborted) {
        setMicPermission(result);
      }
    });
    return () => abort.abort();
  }, [save.settings.speechControl]);
  useEffect(() => {
    if (
      view === "play" &&
      ready &&
      save.settings.speechControl &&
      adultVoice &&
      cloud.available &&
      micPermission === "granted" &&
      !panel &&
      !autoVoiceStarted.current
    ) {
      autoVoiceStarted.current = true;
      // Voice is the first play interaction; do not hold it behind a menu intro.
      audio.current?.stopNarration();
      sessionGeneration.current++;
      void voice.current?.start({ adultDevelopment: true });
    }
  }, [
    view,
    ready,
    adultVoice,
    cloud.available,
    micPermission,
    panel,
    save.settings.speechControl,
  ]);
  useEffect(() => {
    audio.current?.setVolumes({
      ambience: save.settings.ambience,
      narration: save.settings.narration,
      muted: save.settings.muted,
    });
  }, [save.settings]);
  useEffect(() => {
    if (view !== "play" || !sceneHost.current) return;
    sceneGeneration.current++;
    voice.current?.cancelPending();
    setReady(false);
    setError("");
    setTargetId(undefined);
    setSurface(false);
    setSpeed(0);
    audio.current?.setHabitat(habitat.theme);
    try {
      const instance = new World(
        sceneHost.current,
        habitat,
        discoveries,
        spawnId,
        {
          quality: save.settings.quality,
          reducedMotion: save.settings.reducedMotion,
          onTarget: setTargetId,
          onReady: () => {
            if (panelRef.current) world.current?.sim.setMode("paused");
            setReady(true);
            say(
              "Say “swim forward” to begin. Ask “what is this fish?” when something glows.",
              cloudRef.current.available &&
                cloudRef.current.adultDevelopmentMode &&
                saveRef.current.settings.speechControl
                ? undefined
                : "narration-welcome",
            );
          },
          onError: setError,
          onSurface: (value) => {
            setSurface(value);
            audio.current?.setSurface(value);
          },
        },
      );
      world.current = instance;
      if (import.meta.env.DEV || import.meta.env.MODE === "test") {
        (window as any).__mermaidia = {
          snapshot: () => instance.sim.snapshot(),
          stats: () => instance.getStats(),
          resetStats: () => instance.resetStats(),
          ready: () => Boolean(instance.scene.getObjectByName("Elise")),
          voiceStats: () => voice.current?.diagnostics,
          audioStats: () => audio.current?.diagnostics,
          loseContext: () => instance.renderer.forceContextLoss(),
        };
      }
      return () => {
        instance.dispose();
        world.current = null;
        delete (window as any).__mermaidia;
      };
    } catch {
      setError(
        "This ocean needs WebGL 2. Please try a supported browser, or open it again.",
      );
    }
  }, [
    view,
    habitatId,
    spawnId,
    retry,
    save.settings.quality,
    save.settings.reducedMotion,
  ]);
  useEffect(() => {
    if (panel) {
      dialog.current?.showModal();
      if (panel === "settings" && voiceSetupRequested.current) {
        voiceSetupRequested.current = false;
        dialog.current?.querySelector<HTMLElement>("#voice-setup")?.focus();
      }
    } else dialog.current?.close();
  }, [panel]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        viewRef.current !== "play" ||
        (e.target as HTMLElement).closest(
          "input,textarea,select,[contenteditable=true]",
        )
      )
        return;
      if (e.key === "Escape") {
        e.preventDefault();
        if (panelRef.current) close();
        else open("pause");
        return;
      }
      if (panelRef.current) {
        if (
          (e.key === "?" || e.key === "/") &&
          panelRef.current === "discovery"
        ) {
          e.preventDefault();
          close();
        }
        return;
      }
      const keys: Record<string, VoiceCommand> = {
        ArrowUp: { type: "swim" },
        w: { type: "swim" },
        ArrowDown: { type: "stop" },
        s: { type: "stop" },
        " ": { type: "speed", delta: 1 },
        ArrowLeft: { type: "turn", degrees: -30 },
        a: { type: "turn", degrees: -30 },
        ArrowRight: { type: "turn", degrees: 30 },
        d: { type: "turn", degrees: 30 },
        q: { type: "lateral", direction: -1 },
        e: { type: "lateral", direction: 1 },
        r: { type: "vertical", direction: 1 },
        f: { type: "vertical", direction: -1 },
        u: { type: "surface" },
        j: { type: "journal" },
        "?": { type: "inspect" },
        "/": { type: "inspect" },
        "+": { type: "speed", delta: 1 },
        "-": { type: "speed", delta: -1 },
      };
      if (keys[e.key]) {
        e.preventDefault();
        if (!e.repeat) commandRef.current(keys[e.key]);
      }
    };
    const background = () => {
      if (document.hidden) {
        world.current?.sim.stop();
        voice.current?.stop();
        audio.current?.stopNarration();
        if (viewRef.current === "play") open("pause");
      }
    };
    window.addEventListener("keydown", key);
    document.addEventListener("visibilitychange", background);
    return () => {
      window.removeEventListener("keydown", key);
      document.removeEventListener("visibilitychange", background);
    };
  }, [close, open]);
  useEffect(() => {
    if (view !== "play") return;
    const id = setInterval(() => {
      const now = Date.now();
      if (
        saveRef.current.settings.hints &&
        !panelRef.current &&
        now - lastAction.current > 55000
      ) {
        say(
          "I wonder what lives here? Look for a little golden circle.",
          world.current?.sim.motion === "hover" ? "narration-idle" : undefined,
        );
        lastAction.current = now + 65000;
      }
      const sim = world.current?.sim;
      if (!sim || sim.mode !== "exploring") return;
      if (targetRef.current)
        watched.current[targetRef.current] =
          (watched.current[targetRef.current] || 0) + 1;
      const completed = habitat.activities
        .filter((a) =>
          a.kind === "surface"
            ? sim.surface
            : a.kind === "watch"
              ? a.targetIds.some((id) => (watched.current[id] || 0) >= 5)
              : a.targetIds.some((id) => saveRef.current.journal.includes(id)),
        )
        .map((a) => a.id);
      if (completed.some((id) => !saveRef.current.activities.includes(id)))
        persist((s) => ({
          ...s,
          activities: [...new Set([...s.activities, ...completed])],
        }));
    }, 1000);
    return () => clearInterval(id);
  }, [view, habitat, say, persist]);
  const start = () => {
    audio.current?.stopNarration();
    void audio.current?.unlock();
    persist((s) => ({ ...s, lastStart: { habitatId, spawnId } }));
    setView("play");
  };
  const settings = (patch: Partial<Save["settings"]>) =>
    persist((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  const toggleVoice = async () => {
    audio.current?.stopNarration();
    if (
      [
        "listening",
        "connecting",
        "requesting-permission",
        "processing",
      ].includes(voiceStatus)
    ) {
      voice.current?.stop();
      return;
    }
    if (!adultVoice || !cloud.available) {
      try {
        const response = await fetch("/api/voice/status");
        if (!response.ok) throw Error("Voice status unavailable");
        const latest = await response.json();
        setCloud(latest);
        if (latest.available && latest.adultDevelopmentMode) {
          autoVoiceStarted.current = true;
          sessionGeneration.current++;
          void voice.current?.start({ adultDevelopment: true });
          return;
        }
      } catch {
        setCloud({
          available: false,
          reason:
            "The voice server is unavailable. Restart the server and try again.",
        });
      }
      voiceSetupRequested.current = true;
      open("settings");
      return;
    }
    autoVoiceStarted.current = true;
    sessionGeneration.current++;
    void voice.current?.start({ adultDevelopment: adultVoice });
  };
  const voiceActive = [
    "listening",
    "processing",
    "connecting",
    "requesting-permission",
  ].includes(voiceStatus);
  const voiceBlocker =
    cloud.configured === false
      ? "OpenAI API key is missing."
      : cloud.available === false
        ? cloud.reason || "The voice server is unavailable."
        : !adultVoice
          ? "Checking the voice connection…"
          : micPermission === "denied"
            ? "Allow microphone access in your browser, then try again."
            : micPermission === "unavailable"
              ? "Connect a microphone, then try again."
              : "";
  const voiceLabel =
    narrating && voiceActive
      ? "Elise is speaking…"
      : voiceStatus === "connecting"
        ? "Connecting your voice…"
        : voiceStatus === "requesting-permission"
          ? "Allow your microphone"
          : voiceStatus === "processing" ||
              (voiceActivity === "interpreting" && voiceActive)
            ? "I heard you…"
            : voiceStatus === "listening"
              ? voiceActivity === "hearing"
                ? "I’m listening…"
                : "Listening to you"
              : voiceBlocker
                ? voiceBlocker
                : "Start voice play";
  const showFallback = !voiceActive || manualControls || holdVoice;
  return (
    <main className={"app " + (save.settings.reducedMotion ? "reduced" : "")}>
      {view !== "play" ? (
        <GameMenu
          view={view}
          habitat={habitat}
          spawnId={spawnId}
          journalCount={save.journal.length}
          reducedMotion={save.settings.reducedMotion}
          canContinue={Boolean(
            save.lastStart &&
            habitats.some(
              (h) =>
                h.id === save.lastStart?.habitatId &&
                h.spawns.some((s) => s.id === save.lastStart?.spawnId),
            ),
          )}
          onSettings={() => open("settings")}
          onJournal={() => open("journal")}
          onMap={() => setView("map")}
          onStart={start}
          onContinue={() => {
            if (!save.lastStart) return;
            setHabitatId(save.lastStart.habitatId);
            setSpawnId(save.lastStart.spawnId);
            void audio.current?.unlock();
            setView("play");
          }}
          onDestination={(id) => {
            const chosen = habitats.find((h) => h.id === id)!;
            void audio.current?.unlock();
            setHabitatId(id);
            setSpawnId(chosen.spawns[0].id);
            setView("starts");
            void audio.current?.narrate("destination-" + id);
          }}
          onSpawn={(id) => {
            setSpawnId(id);
            void audio.current?.narrate("start-" + habitat.id + "-" + id);
          }}
        />
      ) : (
        <>
          <div className="world" ref={sceneHost} />
          <div className="vignette" />
          <header className="play-header">
            <button
              className="glass round"
              onClick={home}
              aria-label="Ocean map"
            >
              ⌂
            </button>
            <div className="location-chip">
              <span>
                {surface ? "ABOVE THE WATER" : "EXPLORING WITH ELISE"}
              </span>
              <h1>{habitat.name}</h1>
            </div>
            <div className="header-actions">
              <button
                className="glass round"
                onClick={() => open("journal")}
                aria-label="Discovery journal"
              >
                ▤<small>{save.journal.length}</small>
              </button>
              <button
                className="glass round"
                onClick={() => open("help")}
                aria-label="Help"
              >
                ⓘ
              </button>
              <button
                className="glass round"
                onClick={() => open("pause")}
                aria-label="Pause"
              >
                Ⅱ
              </button>
            </div>
          </header>
          <aside className="curiosity">
            <span className="eyebrow">A LITTLE WONDER</span>
            <p>
              {habitat.activities.find((a) => !save.activities.includes(a.id))
                ?.text || "Your ocean is always here to explore."}
            </p>
            <div className="activity-dots">
              {habitat.activities.map((a) => (
                <span
                  key={a.id}
                  className={save.activities.includes(a.id) ? "done" : ""}
                >
                  {save.activities.includes(a.id) ? "✓" : "○"}
                </span>
              ))}
            </div>
          </aside>
          {save.settings.subtitles && message && (
            <div className="caption" role="status">
              {message}
            </div>
          )}
          <div
            className={"play-controls " + (showFallback ? "" : "voice-only")}
          >
            <div className="steering">
              <button
                aria-label="Turn left"
                onClick={() => command({ type: "turn", degrees: -30 })}
              >
                ↶
              </button>
              <button
                className="forward"
                aria-label="Swim forward"
                onClick={() => command({ type: "swim" })}
              >
                ↑<small>Swim</small>
              </button>
              <button
                aria-label="Turn right"
                onClick={() => command({ type: "turn", degrees: 30 })}
              >
                ↷
              </button>
              <button
                aria-label="Move left"
                onClick={() => command({ type: "lateral", direction: -1 })}
              >
                ←
              </button>
              <button
                className="stop"
                aria-label="Stop swimming"
                onClick={() => command({ type: "stop" })}
              >
                ■<small>Stop</small>
              </button>
              <button
                aria-label="Move right"
                onClick={() => command({ type: "lateral", direction: 1 })}
              >
                →
              </button>
            </div>
            <div className="voice-dock">
              {target && (
                <div className="target-label">{target.commonName}</div>
              )}
              <div className="voice-main-row">
                <button
                  className={"primary-mic " + (voiceActive ? "listening" : "")}
                  onClick={toggleVoice}
                  aria-label={
                    voiceActive ? "Stop listening" : "Start listening"
                  }
                  aria-pressed={voiceActive}
                >
                  <svg
                    className="mic-icon"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <rect x="9" y="2" width="6" height="12" rx="3" />
                    <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" />
                  </svg>
                  <span role="status">{voiceLabel}</span>
                  {voiceActive && (
                    <span
                      className={
                        "voice-wave " +
                        (voiceActivity === "hearing" ? "hearing" : "")
                      }
                      aria-hidden="true"
                    >
                      ▂ ▅ ▃ ▆ ▂
                    </span>
                  )}
                </button>
                <button
                  className={"question " + (target ? "eligible" : "")}
                  onClick={inspect}
                  aria-label="What is that?"
                >
                  ?
                </button>
              </div>
              <p className="voice-prompt">
                {voiceBlocker && !voiceActive
                  ? cloud.configured === false
                    ? "Add OPENAI_API_KEY to the server’s .env and restart it. Then Start swimming will listen automatically."
                    : voiceBlocker
                  : "Say “go faster”, “go to the surface”, or “what is this fish?”"}
              </p>
              {voiceActive && (
                <button
                  className="fallback-toggle"
                  onClick={() => setManualControls(!manualControls)}
                  aria-expanded={manualControls}
                >
                  {manualControls
                    ? "Hide swimming buttons"
                    : "Show swimming buttons"}
                </button>
              )}
            </div>
            <div className="travel-controls">
              <div>
                <button
                  aria-label="Go up"
                  onClick={() => command({ type: "vertical", direction: 1 })}
                >
                  ↑
                </button>
                <button
                  aria-label="Go down"
                  onClick={() => command({ type: "vertical", direction: -1 })}
                >
                  ↓
                </button>
                <button
                  className="surface-button"
                  onClick={() =>
                    command({ type: surface ? "dive" : "surface" })
                  }
                >
                  {surface ? "↓ Dive" : "☀ Surface"}
                </button>
              </div>
              <div>
                <button
                  aria-label="Swim slower"
                  onClick={() => command({ type: "speed", delta: -1 })}
                >
                  −
                </button>
                <span className="speed-label">
                  {["Gentle", "Cruising", "Faster"][speed]}
                </span>
                <button
                  aria-label="Swim faster"
                  onClick={() => command({ type: "speed", delta: 1 })}
                >
                  +
                </button>
              </div>
              {holdVoice && (
                <button
                  className="hold-talk"
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    audio.current?.stopNarration();
                    voice.current?.setTransmitting(true);
                    if (voiceStatus !== "listening")
                      void voice.current?.start({
                        adultDevelopment: adultVoice,
                      });
                  }}
                  onPointerUp={() => voice.current?.setTransmitting(false)}
                  onPointerCancel={() => voice.current?.setTransmitting(false)}
                  onLostPointerCapture={() =>
                    voice.current?.setTransmitting(false)
                  }
                  onBlur={() => voice.current?.setTransmitting(false)}
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      voice.current?.setTransmitting(true);
                      if (voiceStatus !== "listening")
                        void voice.current?.start({
                          adultDevelopment: adultVoice,
                        });
                    }
                  }}
                  onKeyUp={() => voice.current?.setTransmitting(false)}
                >
                  Hold to talk
                </button>
              )}
            </div>
          </div>
          {!ready && !error && (
            <div className="loading" role="status">
              <div className="loading-shell">◒</div>
              <h2>A little ocean is waking up…</h2>
              <p>Elise is getting ready to explore.</p>
            </div>
          )}
          {error && (
            <div className="loading">
              <h2>Let’s try again</h2>
              <p>{error}</p>
              <button
                className="primary"
                onClick={() => setRetry((x) => x + 1)}
              >
                Open the ocean again
              </button>
              <button onClick={home}>Back to the map</button>
            </div>
          )}
        </>
      )}
      <dialog
        ref={dialog}
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        className={"modal " + (panel === "discovery" ? "discovery-modal" : "")}
        aria-label={
          panel === "discovery" ? selected?.commonName : panel || "Ocean guide"
        }
      >
        <button className="modal-close" onClick={close} aria-label="Close">
          ×
        </button>
        {voiceActive && panel !== "settings" && (
          <div className="dialog-voice">
            <span role="status">
              {narrating
                ? "Elise is speaking. I’ll listen again in a moment."
                : "Listening. Say “keep swimming” when you’re ready."}
            </span>
            <button
              onClick={() => voice.current?.stop()}
              aria-label="Stop listening"
            >
              Microphone off
            </button>
          </div>
        )}
        {panel === "discovery" && selected && (
          <>
            <div className="discovery-portrait">
              <img
                src={"/assets/portraits/" + selected.assetId + ".png"}
                alt={selected.commonName}
              />
              <span className="sticker">✧ New things to wonder about</span>
            </div>
            <div className="discovery-text">
              <p className="eyebrow">HELLO, OCEAN NEIGHBOR</p>
              <h2>{selected.commonName}</h2>
              {selected.childSentences.map((s, i) => (
                <p key={i}>{s.text}</p>
              ))}
              <button
                className="primary"
                onClick={() =>
                  void audio.current?.narrate(selected.narrationAssetId)
                }
              >
                ♪ Hear about me
              </button>
              <details>
                <summary>For curious grown-ups</summary>
                <p>
                  <i>{selected.scientificName}</i>
                </p>
                <p>{selected.behavior}</p>
                <p>
                  Artistic reconstruction based on evidence. We watch wildlife
                  with space to move.
                </p>
                {[
                  ...new Set(
                    selected.childSentences.flatMap((s) => s.evidenceIds),
                  ),
                ]
                  .map((id) => sources.find((s) => s.id === id))
                  .filter(Boolean)
                  .map((s) => (
                    <p key={s!.id}>
                      <a href={s!.url} target="_blank" rel="noreferrer">
                        {s!.publisher} · {s!.title} ↗
                      </a>
                    </p>
                  ))}
              </details>
            </div>
          </>
        )}
        {panel === "journal" && (
          <div className="modal-body">
            <p className="eyebrow">YOUR LITTLE BOOK OF WONDERS</p>
            <h2>Ocean friends</h2>
            <p>
              {save.journal.length
                ? "Every hello has a place here."
                : "Ask “what is this fish?” near marine life. Your discoveries will grow here."}
            </p>
            <div className="journal-grid">
              {save.journal
                .map((id) => discoveries.find((d) => d.id === id))
                .filter(Boolean)
                .map((d) => (
                  <button
                    key={d!.id}
                    onClick={() => {
                      setCardId(d!.id);
                      setPanel("discovery");
                    }}
                  >
                    <img
                      src={"/assets/portraits/" + d!.assetId + ".png"}
                      alt=""
                    />
                    <span>{d!.commonName}</span>
                  </button>
                ))}
            </div>
            <button className="primary" onClick={close}>
              Keep exploring
            </button>
          </div>
        )}
        {panel === "pause" && (
          <div className="modal-body centered">
            <p className="eyebrow">A QUIET LITTLE PAUSE</p>
            <h2>The ocean can wait.</h2>
            <p>Elise will be right here.</p>
            <button className="primary" onClick={close}>
              Keep swimming
            </button>
            <button
              onClick={() => {
                close();
                command({ type: "return" });
              }}
            >
              Take me back to the start
            </button>
            <button onClick={() => setPanel("settings")}>
              Sound & settings
            </button>
            <button onClick={home}>Choose another ocean</button>
          </div>
        )}
        {panel === "help" && (
          <div className="modal-body">
            <p className="eyebrow">LET’S SWIM TOGETHER</p>
            <h2>Follow your curiosity.</h2>
            <div className="help-grid">
              <div>
                <b>♩</b>
                <h3>Say where to go</h3>
                <p>
                  Say “swim forward”, “go faster”, or “stop”. Elise listens
                  while you explore.
                </p>
              </div>
              <div>
                <b>↶ ↷</b>
                <h3>Turn & glide</h3>
                <p>Say “turn left”, “turn right”, or “go to the surface”.</p>
              </div>
              <div>
                <b>?</b>
                <h3>Say hello</h3>
                <p>
                  A golden circle means something is close. Ask “what is this
                  fish?” After Elise finishes, say “keep swimming”.
                </p>
              </div>
            </div>
            <p>
              Backup controls: arrows to swim and turn; Space to go faster; Q/E
              sideways; R/F up/down; U surface; J journal; ? or / to look
              closer; Escape to pause.
            </p>
            <p>
              Voice is the main way to explore. A grown-up can finish voice
              setup; buttons and keys are always available too.
            </p>
            <button className="primary" onClick={close}>
              Let’s explore
            </button>
          </div>
        )}
        {panel === "settings" && (
          <div className="modal-body settings">
            <p className="eyebrow">FOR GROWN-UPS</p>
            <h2>A comfortable little ocean</h2>
            <p className="narrator-source">
              {narratorSource === "openai-marin"
                ? "Narrator: natural Elise voice."
                : narratorSource === "offline-fallback"
                  ? "Narrator: local narration pack."
                  : "Narrator: Elise’s natural voice is included with the game."}
            </p>
            <p>
              Elise’s narration is an AI-generated original character voice. It
              does not imitate a real performer.
            </p>
            <button
              className="narrator-preview"
              onClick={() => void audio.current?.narrate("narration-start")}
            >
              Hear Elise’s voice
            </button>
            <label>
              Narration volume
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={save.settings.narration}
                onChange={(e) =>
                  settings({ narration: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Ocean ambience
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={save.settings.ambience}
                onChange={(e) => settings({ ambience: Number(e.target.value) })}
              />
            </label>
            {(["muted", "reducedMotion", "subtitles", "hints"] as const).map(
              (key, i) => (
                <label className="check" key={key}>
                  <input
                    type="checkbox"
                    checked={save.settings[key]}
                    onChange={(e) => settings({ [key]: e.target.checked })}
                  />
                  {
                    [
                      "Mute all sound",
                      "Reduce decorative motion",
                      "Show captions",
                      "Gentle exploration suggestions",
                    ][i]
                  }
                </label>
              ),
            )}
            <label>
              Picture detail
              <select
                value={save.settings.quality}
                onChange={(e) =>
                  settings({
                    quality: e.target.value as Save["settings"]["quality"],
                  })
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <h3 id="voice-setup" tabIndex={-1}>
              Voice is how we explore
            </h3>
            <label className="check">
              <input
                type="checkbox"
                checked={save.settings.speechControl}
                onChange={(e) => {
                  settings({ speechControl: e.target.checked });
                  if (!e.target.checked) voice.current?.stop();
                  else {
                    permissionRequested.current = false;
                  }
                }}
              />
              Spoken controls on by default
            </label>
            <p>
              Microphone permission: {micPermission}. The game asks when it
              opens. A permission check immediately closes its audio track;
              cloud listening starts only after deployment setup permits it.
            </p>
            <p>
              Listening sends microphone audio to OpenAI for navigation. This
              app does not save speech. In server-authorized adult local mode,
              listening starts as play begins. Stopping voice closes the
              microphone. Other people’s commands can also be heard.
            </p>
            <p className="availability">
              {cloud.reason || "Checking the voice connection…"}
            </p>
            <p>
              {adultVoice
                ? "This server already authorizes adult local voice play. No extra in-game switch is needed: choose an ocean and Start swimming."
                : "Adult local voice play must be enabled on the server."}
            </p>
            {!cloud.childReady && (
              <p className="child-voice-status">
                Child cloud voice remains disabled because provider retention
                and deployment controls have not been confirmed.
              </p>
            )}
            <label className="check">
              <input
                type="checkbox"
                checked={holdVoice}
                onChange={(e) => {
                  setHoldVoice(e.target.checked);
                  voice.current?.setTransmitting(!e.target.checked);
                }}
              />
              Hold-to-talk button for shared spaces
            </label>
            <p>
              Once enabled, Elise listens automatically during play. After a
              discovery is read aloud, say “keep swimming” to close it. Say
              “pause” and “resume” to take a break. Stop listening closes the
              microphone.
            </p>
            <p>
              Keyboard and touch are backup controls and also work without an
              account.
            </p>
            <details>
              <summary>Sources, credits & privacy</summary>
              <p>
                All 3D artwork is an original artistic reconstruction. Real
                places are compressed into small worlds. Elise’s deep-water
                observation light is fictional.
              </p>
              <p>
                Only settings, discovery IDs, activity IDs and starting spots
                stay in this browser. No names, recordings, transcripts or
                analytics are stored.
              </p>
              <a href="/credits.html" target="_blank" rel="noreferrer">
                Read evidence and asset credits ↗
              </a>
            </details>
            <button
              className="danger-quiet"
              onClick={() => {
                voice.current?.stop();
                persist(() => freshSave());
                say("Your journal and settings have been reset.");
              }}
            >
              Reset local journal and settings
            </button>
            <button className="primary" onClick={close}>
              Done
            </button>
          </div>
        )}
      </dialog>
    </main>
  );
}
