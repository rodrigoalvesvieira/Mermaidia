import { getNarrationLine } from "../../content/narration";
type Volumes = { ambience: number; narration: number; muted: boolean };
type Loop = { source: AudioBufferSourceNode; gain: GainNode };
/** Original ambience plus reviewed scripted narration. No recording or browser speech synthesis. */
export class AudioMixer {
  private context?: AudioContext;
  private master?: GainNode;
  private channels = new Map<string, GainNode>();
  private limiter?: DynamicsCompressorNode;
  private buffers = new Map<string, AudioBuffer>();
  private active = new Set<AudioBufferSourceNode>();
  private loops: Loop[] = [];
  private voice?: AudioBufferSourceNode;
  private loadGeneration = 0;
  private narrationGeneration = 0;
  private narrationAbort?: AbortController;
  private narratorUnavailableUntil = 0;
  private narratorSource = "not-played";
  onNarratorSource?: (source: "openai-marin" | "offline-fallback") => void;
  private birdTimer?: ReturnType<typeof setTimeout>;
  private theme = "reef";
  private surface = false;
  private speaking = false;
  private disposed = false;
  private volumes: Volumes = { ambience: 0.45, narration: 0.8, muted: false };
  onNarrating?: (active: boolean) => void;
  onError?: (message: string) => void;
  private visibility = () => {
    if (document.hidden) {
      this.stopNarration();
      void this.context?.suspend();
    }
  };
  constructor() {
    if (typeof document !== "undefined")
      document.addEventListener("visibilitychange", this.visibility);
  }
  async unlock() {
    if (this.disposed) return;
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.limiter = this.context.createDynamicsCompressor();
      this.limiter.threshold.value = -8;
      this.limiter.knee.value = 10;
      this.limiter.ratio.value = 8;
      this.limiter.attack.value = 0.006;
      this.limiter.release.value = 0.22;
      this.master.connect(this.limiter);
      this.limiter.connect(this.context.destination);
      for (const name of [
        "ambience",
        "movement",
        "wildlife",
        "ui",
        "narration",
      ]) {
        const gain = this.context.createGain();
        gain.connect(this.master);
        this.channels.set(name, gain);
      }
      this.refresh();
      void this.loadLoops();
    }
    if (this.context.state === "suspended") await this.context.resume();
  }
  private async buffer(id: string) {
    if (!/^[a-z0-9-]+$/.test(id)) throw Error("Invalid audio asset");
    const existing = this.buffers.get(id);
    if (existing) return existing;
    const res = await fetch(`/assets/audio/${id}.wav`);
    if (!res.ok) throw Error("Missing narration");
    const bytes = await res.arrayBuffer();
    if (!this.context || this.disposed) throw Error("Audio closed");
    const buffer = await this.context.decodeAudioData(bytes);
    if (this.disposed || !this.context) throw Error("Audio closed");
    if (this.buffers.size >= 20)
      this.buffers.delete(this.buffers.keys().next().value!);
    this.buffers.set(id, buffer);
    return buffer;
  }
  private async narrationBuffer(id: string, signal: AbortSignal) {
    if (!getNarrationLine(id)) throw Error("Unknown narration");
    const cacheId = `preferred:${id}`;
    const cached = this.buffers.get(cacheId);
    if (cached) {
      this.setNarratorSource("openai-marin");
      return cached;
    }
    if (Date.now() >= this.narratorUnavailableUntil) {
      const deadline = new AbortController();
      const abort = () => deadline.abort();
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) deadline.abort();
      const timer = setTimeout(abort, 13_000);
      try {
        const res = await fetch(`/api/narration/${id}`, {
          signal: deadline.signal,
        });
        if (!res.ok || !res.headers.get("content-type")?.includes("audio/"))
          throw Error("Narrator unavailable");
        const bytes = await res.arrayBuffer();
        if (
          bytes.byteLength > 4 * 1024 * 1024 ||
          signal.aborted ||
          !this.context ||
          this.disposed
        )
          throw Error("Narration cancelled");
        const buffer = await this.context.decodeAudioData(bytes);
        if (signal.aborted || this.disposed) throw Error("Narration cancelled");
        if (this.buffers.size >= 20)
          this.buffers.delete(this.buffers.keys().next().value!);
        this.buffers.set(cacheId, buffer);
        this.setNarratorSource("openai-marin");
        return buffer;
      } catch {
        if (signal.aborted || this.disposed) throw Error("Narration cancelled");
        this.narratorUnavailableUntil = Date.now() + 30_000;
      } finally {
        clearTimeout(timer);
        signal.removeEventListener("abort", abort);
      }
    }
    if (signal.aborted || this.disposed) throw Error("Narration cancelled");
    // Existing original offline clips remain usable without an account or network.
    const existing = this.buffers.get(id);
    let buffer = existing;
    if (!buffer) {
      const res = await fetch(`/assets/audio/${id}.wav`, { signal });
      if (!res.ok) throw Error("Missing narration");
      const bytes = await res.arrayBuffer();
      if (signal.aborted || !this.context || this.disposed)
        throw Error("Narration cancelled");
      buffer = await this.context.decodeAudioData(bytes);
      if (signal.aborted || this.disposed) throw Error("Narration cancelled");
      if (this.buffers.size >= 20)
        this.buffers.delete(this.buffers.keys().next().value!);
      this.buffers.set(id, buffer);
    }
    if (signal.aborted || this.disposed) throw Error("Narration cancelled");
    this.setNarratorSource("offline-fallback");
    return buffer;
  }
  private setNarratorSource(source: "openai-marin" | "offline-fallback") {
    this.narratorSource = source;
    this.onNarratorSource?.(source);
  }
  private ramp(node: GainNode, value: number, time = 0.22) {
    if (!this.context) return;
    const p = node.gain,
      t = this.context.currentTime;
    p.cancelScheduledValues(t);
    p.setValueAtTime(p.value, t);
    p.linearRampToValueAtTime(value, t + time);
  }
  private refresh() {
    if (!this.master) return;
    this.ramp(this.master, this.volumes.muted ? 0 : 0.7);
    for (const [name, node] of this.channels)
      this.ramp(
        node,
        name === "narration"
          ? this.volumes.narration
          : name === "ambience"
            ? this.volumes.ambience * (this.speaking ? 0.23 : 1)
            : name === "ui"
              ? 0.22
              : 0.15,
      );
    this.loops.forEach((loop, i) =>
      this.ramp(
        loop.gain,
        i === 0 ? (this.surface ? 0.12 : 0.8) : this.surface ? 0.8 : 0,
        0.8,
      ),
    );
  }
  setVolumes(values: Partial<Volumes>) {
    this.volumes = { ...this.volumes, ...values };
    this.volumes.ambience = Math.max(0, Math.min(1, this.volumes.ambience));
    this.volumes.narration = Math.max(0, Math.min(1, this.volumes.narration));
    if (this.volumes.muted || this.volumes.narration === 0)
      this.stopNarration();
    this.refresh();
  }
  setHabitat(theme: string) {
    clearTimeout(this.birdTimer);
    if (this.theme === theme && this.loops.length) return;
    this.theme = ["reef", "caribbean", "ice", "wreck", "deep"].includes(theme)
      ? theme
      : "reef";
    this.stopNarration();
    void this.loadLoops();
  }
  setSurface(value: boolean) {
    if (value === this.surface) return;
    this.surface = value;
    this.refresh();
    clearTimeout(this.birdTimer);
    if (value && this.theme === "reef") this.scheduleBird(4000);
  }
  private scheduleBird(delay: number) {
    this.birdTimer = setTimeout(() => {
      void this.playBird();
    }, delay);
  }
  private async playBird() {
    if (
      !this.surface ||
      this.theme !== "reef" ||
      this.disposed ||
      !this.context
    )
      return;
    try {
      const buffer = await this.buffer("buff-banded-rail-call");
      if (
        !this.surface ||
        this.theme !== "reef" ||
        this.disposed ||
        !this.context ||
        this.active.size >= 8
      )
        return;
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.connect(this.channels.get("wildlife")!);
      this.active.add(source);
      source.onended = () => {
        source.disconnect();
        this.active.delete(source);
      };
      source.start();
    } catch {
      this.onError?.("A shore sound could not load.");
    }
    if (!this.disposed && this.surface && this.theme === "reef")
      this.scheduleBird(37000);
  }
  private async loadLoops() {
    if (!this.context || this.disposed) return;
    const generation = ++this.loadGeneration;
    this.loops.forEach((loop) => {
      loop.source.stop();
      loop.source.disconnect();
      loop.gain.disconnect();
      this.active.delete(loop.source);
    });
    this.loops = [];
    try {
      const buffers = await Promise.all([
        this.buffer(`ambience-${this.theme}`),
        this.buffer(`surface-${this.theme}`),
      ]);
      if (generation !== this.loadGeneration || this.disposed || !this.context)
        return;
      this.loops = buffers.map((buffer) => {
        const source = this.context!.createBufferSource(),
          gain = this.context!.createGain();
        source.buffer = buffer;
        source.loop = true;
        gain.gain.value = 0;
        source.connect(gain);
        gain.connect(this.channels.get("ambience")!);
        this.active.add(source);
        source.start();
        return { source, gain };
      });
      this.refresh();
    } catch {
      if (generation === this.loadGeneration)
        this.onError?.("Some sounds could not load. You can keep exploring.");
    }
  }
  async narrate(assetId: string) {
    this.stopNarration();
    if (this.volumes.muted || this.volumes.narration === 0 || this.disposed)
      return;
    const generation = ++this.narrationGeneration;
    const controller = new AbortController();
    this.narrationAbort = controller;
    await this.unlock();
    if (generation !== this.narrationGeneration || this.disposed) return;
    try {
      const buffer = await this.narrationBuffer(assetId, controller.signal);
      if (
        generation !== this.narrationGeneration ||
        this.disposed ||
        !this.context
      )
        return;
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.connect(this.channels.get("narration")!);
      // Keep command capture responsive during network/decode. Duck capture at the
      // actual playback boundary so Elise cannot transcribe her own narration.
      this.speaking = true;
      this.onNarrating?.(true);
      this.refresh();
      this.voice = source;
      this.active.add(source);
      source.onended = () => {
        source.disconnect();
        this.active.delete(source);
        if (this.voice === source) {
          this.voice = undefined;
          this.speaking = false;
          this.onNarrating?.(false);
          this.refresh();
        }
      };
      source.start();
    } catch {
      if (generation === this.narrationGeneration) {
        this.stopNarration();
        this.onError?.("That voice clip could not load.");
      }
    }
  }
  stopNarration() {
    this.narrationGeneration++;
    this.narrationAbort?.abort();
    this.narrationAbort = undefined;
    if (this.voice) {
      this.voice.onended = null;
      this.voice.stop();
      this.voice.disconnect();
      this.active.delete(this.voice);
      this.voice = undefined;
    }
    if (this.speaking) {
      this.speaking = false;
      this.onNarrating?.(false);
      this.refresh();
    }
  }
  async cue(id = "discovery", channel: "ui" | "movement" | "wildlife" = "ui") {
    if (!this.context || this.disposed || this.active.size >= 8) return;
    try {
      const buffer = await this.buffer(`cue-${id}`);
      if (!this.context || this.disposed || this.active.size >= 8) return;
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.connect(this.channels.get(channel)!);
      this.active.add(source);
      source.onended = () => {
        this.active.delete(source);
        source.disconnect();
      };
      source.start();
    } catch {
      this.onError?.("A sound could not load.");
    }
  }
  async suspend() {
    this.stopNarration();
    await this.context?.suspend();
  }
  dispose() {
    clearTimeout(this.birdTimer);
    this.disposed = true;
    this.loadGeneration++;
    this.stopNarration();
    for (const source of this.active) {
      source.onended = null;
      source.stop();
      source.disconnect();
    }
    this.active.clear();
    this.loops.forEach((l) => l.gain.disconnect());
    this.loops = [];
    this.channels.forEach((c) => c.disconnect());
    this.channels.clear();
    this.master?.disconnect();
    this.limiter?.disconnect();
    this.buffers.clear();
    void this.context?.close();
    this.context = undefined;
    if (typeof document !== "undefined")
      document.removeEventListener("visibilitychange", this.visibility);
  }
  get diagnostics() {
    return {
      activeSources: this.active.size,
      buffers: this.buffers.size,
      loops: this.loops.length,
      speaking: this.speaking,
      narrator: this.narratorSource,
      state: this.context?.state ?? "locked",
    };
  }
}
