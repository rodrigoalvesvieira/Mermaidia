import { VoiceController } from "../../src/voice/VoiceController";

const startedAt = Date.now();
// Retain the lease token only in this page's closure for a post-stop revocation
// probe. It is never included in snapshots, reports, console output or storage.
let leaseToken = "";
const nativeFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const response = await nativeFetch(input, init);
  if (input === "/api/voice/enable" && response.ok) {
    const enabled = await response.clone().json();
    leaseToken = typeof enabled.csrf === "string" ? enabled.csrf : "";
  }
  return response;
};
const tracks: MediaStreamTrack[] = [];
const peers: RTCPeerConnection[] = [];
const getUserMedia = navigator.mediaDevices.getUserMedia.bind(
  navigator.mediaDevices,
);
navigator.mediaDevices.getUserMedia = async (constraints) => {
  const stream = await getUserMedia(constraints);
  tracks.push(...stream.getTracks());
  return stream;
};
const NativePeer = window.RTCPeerConnection;
window.RTCPeerConnection = new Proxy(NativePeer, {
  construct(target, args) {
    const peer = new target(...args);
    peers.push(peer);
    return peer;
  },
});
const commands: { atMs: number; types: string[]; renewal: number }[] = [];
const statuses: { atMs: number; status: string }[] = [];
const controller = new VoiceController({
  context: () => ({ sceneGeneration: 1, sessionGeneration: 1, targets: [] }),
  onCommands: (envelope) => {
    commands.push({
      atMs: Date.now() - startedAt,
      types: envelope.commands.map((c) => c.type),
      renewal: controller.diagnostics.renewals,
    });
  },
  onStatus: (status) => {
    statuses.push({ atMs: Date.now() - startedAt, status });
    document.querySelector("output")!.textContent = status;
  },
});
document.querySelector("#start")!.addEventListener("click", () => {
  void controller.start({ adultDevelopment: true });
});
document
  .querySelector("#stop")!
  .addEventListener("click", () => controller.stop());
Object.assign(window, {
  __voiceSoak: {
    probeRevocation: async () => {
      const response = await nativeFetch("/api/voice/renew", {
        method: "POST",
        headers: { "x-voice-csrf": leaseToken },
      });
      leaseToken = "";
      return response.status;
    },
    snapshot: () => ({
      atMs: Date.now() - startedAt,
      diagnostics: controller.diagnostics,
      commands: [...commands],
      statuses: [...statuses],
      resources: {
        capturedTracks: tracks.length,
        liveTracks: tracks.filter((t) => t.readyState === "live").length,
        createdPeers: peers.length,
        peerStates: peers.map((p) => p.connectionState),
        allTracksEnded: tracks.every((t) => t.readyState === "ended"),
        allPeersClosed: peers.every((p) => p.connectionState === "closed"),
      },
    }),
  },
});
