import OpenAI from "openai";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Express } from "express";
import { getNarrationLine, type NarrationLine } from "../content/narration";
import type { AssetRecord } from "../src/shared/contracts";

export const narrator = {
  model: "gpt-4o-mini-tts",
  voice: "marin",
  response_format: "wav" as const,
  instructions:
    "Speak as Elise, an original warm, curious, playful ocean explorer. Natural, smooth conversational delivery with a light sense of adventure and a smile. Unhurried but lively; clear short phrases and gentle pauses for a five-year-old listener. Vary emphasis naturally. Read the provided words exactly. Do not sing, use baby talk, add sound effects, imitate any character or actor, or add facts.",
};
export function narrationFingerprint(line: NarrationLine) {
  return createHash("sha256")
    .update(JSON.stringify({ ...narrator, text: line.text, version: 1 }))
    .digest("hex");
}
export function validateNarrationAudio(bytes: Buffer) {
  if (
    bytes.length < 44 ||
    bytes.length > 4 * 1024 * 1024 ||
    bytes.toString("ascii", 0, 4) !== "RIFF" ||
    bytes.toString("ascii", 8, 12) !== "WAVE"
  )
    throw new NarrationError(502, "Narration unavailable");
  return bytes;
}
export class NarrationError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
export type NarrationProvider = (
  line: NarrationLine,
  signal: AbortSignal,
) => Promise<Buffer>;
export const openAINarration: NarrationProvider = async (line, signal) => {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new NarrationError(503, "Narration unavailable");
  const client = new OpenAI({ apiKey: key, maxRetries: 0, timeout: 12_000 });
  const response = await client.audio.speech.create(
    { ...narrator, input: line.text },
    { signal },
  );
  const reader = response.body?.getReader();
  if (!reader) throw new NarrationError(502, "Narration unavailable");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 4 * 1024 * 1024)
        throw new NarrationError(502, "Narration unavailable");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  return validateNarrationAudio(Buffer.concat(chunks));
};

/** Offline generated audio is accepted only when script fingerprint and file checksum both match. */
export async function readBuiltNarration(
  line: NarrationLine,
): Promise<Buffer | undefined> {
  try {
    const records = JSON.parse(
      await readFile("assets/manifests/audio.json", "utf8"),
    ) as AssetRecord[];
    const record = records.find(
      (r) =>
        r.id === line.id &&
        r.creator === "Mermaidia original scripts; OpenAI speech generation" &&
        r.modifications.includes(
          `Narration fingerprint: ${narrationFingerprint(line)}`,
        ),
    );
    if (!record || record.localPath !== `public/assets/audio/${line.id}.wav`)
      return;
    const bytes = await readFile(path.resolve(record.localPath));
    if (createHash("sha256").update(bytes).digest("hex") !== record.sha256)
      return;
    return validateNarrationAudio(bytes);
  } catch {
    return undefined;
  }
}

type ServiceOptions = {
  provider?: NarrationProvider;
  built?: typeof readBuiltNarration;
  configured?: () => boolean;
  now?: () => number;
  timeoutMs?: number;
  maxEntries?: number;
  maxBytes?: number;
  perMinute?: number;
  concurrency?: number;
};
export class NarrationService {
  private cache = new Map<string, Buffer>();
  private pending = new Map<string, Promise<Buffer>>();
  private requests: number[] = [];
  private totalBytes = 0;
  private active = 0;
  private retryAfter = 0;
  constructor(private options: ServiceOptions = {}) {}
  get configured() {
    return this.options.configured?.() ?? Boolean(process.env.OPENAI_API_KEY);
  }
  get diagnostics() {
    return {
      cached: this.cache.size,
      bytes: this.totalBytes,
      pending: this.pending.size,
      active: this.active,
    };
  }
  async get(id: string): Promise<Buffer> {
    const line = getNarrationLine(id);
    if (!line) throw new NarrationError(404, "Unknown narration");
    const cached = this.cache.get(id);
    if (cached) {
      this.cache.delete(id);
      this.cache.set(id, cached);
      return cached;
    }
    const pending = this.pending.get(id);
    if (pending) return pending;
    // Bound even pre-generation file lookups when many distinct IDs arrive at once.
    if (this.pending.size >= 8) throw new NarrationError(429, "Narration busy");
    const task = this.load(line)
      .then((bytes) => {
        const maxBytes = this.options.maxBytes ?? 32 * 1024 * 1024;
        while (
          this.cache.size &&
          (this.cache.size >= (this.options.maxEntries ?? 48) ||
            this.totalBytes + bytes.length > maxBytes)
        ) {
          const first = this.cache.keys().next().value!;
          this.totalBytes -= this.cache.get(first)!.length;
          this.cache.delete(first);
        }
        if (bytes.length <= maxBytes) {
          this.cache.set(id, bytes);
          this.totalBytes += bytes.length;
        }
        return bytes;
      })
      .finally(() => {
        this.pending.delete(id);
      });
    this.pending.set(id, task);
    return task;
  }
  private async load(line: NarrationLine) {
    const built = await (this.options.built ?? readBuiltNarration)(line);
    if (built) return validateNarrationAudio(built);
    if (!this.configured)
      throw new NarrationError(503, "Narration unavailable");
    const now = (this.options.now ?? Date.now)();
    this.requests = this.requests.filter((time) => now - time < 60_000);
    if (
      now < this.retryAfter ||
      this.active >= (this.options.concurrency ?? 2) ||
      this.requests.length >= (this.options.perMinute ?? 24)
    )
      throw new NarrationError(429, "Narration busy");
    this.requests.push(now);
    this.active++;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new NarrationError(504, "Narration unavailable"));
      }, this.options.timeoutMs ?? 12_000);
    });
    try {
      return validateNarrationAudio(
        await Promise.race([
          (this.options.provider ?? openAINarration)(line, controller.signal),
          deadline,
        ]),
      );
    } catch (error) {
      this.retryAfter = (this.options.now ?? Date.now)() + 15_000;
      throw error instanceof NarrationError
        ? error
        : new NarrationError(502, "Narration unavailable");
    } finally {
      clearTimeout(timer!);
      this.active--;
    }
  }
}
export function registerNarrationRoutes(
  app: Express,
  service = new NarrationService(),
) {
  app.get("/api/narration/status", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({
      configured: service.configured,
      preferred: "openai-marin",
      fallback: "local-reviewed-narration-pack",
      aiGenerated: true,
    });
  });
  app.get("/api/narration/:id", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (
      req.method !== "GET" ||
      Object.keys(req.query).length ||
      Number(req.headers["content-length"] ?? 0) > 0
    ) {
      res.status(400).json({ error: "Reviewed narration IDs only" });
      return;
    }
    const origin = req.get("origin");
    if (
      req.get("sec-fetch-site") === "cross-site" ||
      (origin && origin !== (process.env.APP_ORIGIN ?? "http://localhost:5173"))
    ) {
      res.status(403).json({ error: "Origin refused" });
      return;
    }
    try {
      const bytes = await service.get(String(req.params.id));
      if (!res.destroyed)
        res
          .type("audio/wav")
          .setHeader("Cache-Control", "private, no-cache")
          .send(bytes);
    } catch (error) {
      if (!res.destroyed)
        res
          .status(error instanceof NarrationError ? error.status : 502)
          .json({ error: "Narration unavailable" });
    }
  });
  return service;
}
