import { it, expect, vi, afterEach } from "vitest";
import { requestMicrophonePermission } from "../src/voice/permission";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("requests audio only and closes every probe track before returning granted", async () => {
  const track = { stop: vi.fn() },
    other = { stop: vi.fn() },
    getUserMedia = vi
      .fn()
      .mockResolvedValue({ getTracks: () => [track, other] });
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  const network = vi.fn();
  vi.stubGlobal("fetch", network);
  expect(await requestMicrophonePermission()).toBe("granted");
  expect(getUserMedia).toHaveBeenCalledWith({
    audio: { echoCancellation: true, noiseSuppression: true },
    video: false,
  });
  expect(track.stop).toHaveBeenCalledOnce();
  expect(other.stop).toHaveBeenCalledOnce();
  expect(network).not.toHaveBeenCalled();
});
it("denial leaves the application available", async () => {
  vi.stubGlobal("navigator", {
    mediaDevices: {
      getUserMedia: async () => {
        throw new DOMException("Denied", "NotAllowedError");
      },
    },
  });
  expect(await requestMicrophonePermission()).toBe("denied");
});
it("absent capture API or device is unavailable rather than a crash", async () => {
  vi.stubGlobal("navigator", {});
  expect(await requestMicrophonePermission()).toBe("unavailable");
  vi.stubGlobal("navigator", {
    mediaDevices: {
      getUserMedia: async () => {
        throw new DOMException("No device", "NotFoundError");
      },
    },
  });
  expect(await requestMicrophonePermission()).toBe("unavailable");
});
it("unanswered prompt returns pending and a late grant is immediately closed", async () => {
  vi.useFakeTimers();
  let grant!: (value: unknown) => void;
  const track = { stop: vi.fn() };
  vi.stubGlobal("navigator", {
    mediaDevices: {
      getUserMedia: () =>
        new Promise((resolve) => {
          grant = resolve;
        }),
    },
  });
  const onLateResult = vi.fn();
  const result = requestMicrophonePermission({ timeoutMs: 1000, onLateResult });
  await vi.advanceTimersByTimeAsync(1001);
  expect(await result).toBe("pending");
  grant({ getTracks: () => [track] });
  await vi.advanceTimersByTimeAsync(0);
  expect(track.stop).toHaveBeenCalledOnce();
  expect(onLateResult).toHaveBeenCalledWith("granted");
});
it("unmount cancellation returns pending and still closes a later grant", async () => {
  let grant!: (value: unknown) => void;
  const track = { stop: vi.fn() },
    abort = new AbortController();
  vi.stubGlobal("navigator", {
    mediaDevices: {
      getUserMedia: () =>
        new Promise((resolve) => {
          grant = resolve;
        }),
    },
  });
  const result = requestMicrophonePermission({ signal: abort.signal });
  await Promise.resolve();
  abort.abort();
  expect(await result).toBe("pending");
  grant({ getTracks: () => [track] });
  await new Promise((r) => setTimeout(r, 0));
  expect(track.stop).toHaveBeenCalledOnce();
});
it("a pre-aborted probe never asks for capture", async () => {
  const getUserMedia = vi.fn(),
    abort = new AbortController();
  abort.abort();
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  expect(await requestMicrophonePermission({ signal: abort.signal })).toBe(
    "pending",
  );
  expect(getUserMedia).not.toHaveBeenCalled();
});

it("does not update an unmounted consumer when permission is granted after its timeout", async () => {
  vi.useFakeTimers();
  let grant!: (value: unknown) => void;
  const track = { stop: vi.fn() },
    onLateResult = vi.fn(),
    abort = new AbortController();
  vi.stubGlobal("navigator", {
    mediaDevices: {
      getUserMedia: () =>
        new Promise((resolve) => {
          grant = resolve;
        }),
    },
  });
  const result = requestMicrophonePermission({
    timeoutMs: 100,
    signal: abort.signal,
    onLateResult,
  });
  await vi.advanceTimersByTimeAsync(101);
  expect(await result).toBe("pending");
  abort.abort();
  grant({ getTracks: () => [track] });
  await vi.advanceTimersByTimeAsync(0);
  expect(track.stop).toHaveBeenCalledOnce();
  expect(onLateResult).not.toHaveBeenCalled();
});
