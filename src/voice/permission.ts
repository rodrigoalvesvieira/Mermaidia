export type MicrophonePermissionResult =
  "granted" | "denied" | "unavailable" | "pending";
/** Local permission preflight only. Never creates a provider session, peer, or recorder.
 * The browser may leave its prompt open after our nonblocking timeout. A late
 * grant is still closed before its result is observed, so no track is leaked.
 */
export async function requestMicrophonePermission(
  options: {
    timeoutMs?: number;
    signal?: AbortSignal;
    onLateResult?: (result: MicrophonePermissionResult) => void;
  } = {},
): Promise<MicrophonePermissionResult> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia)
    return "unavailable";
  if (options.signal?.aborted) return "pending";
  let pending = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abortHandler: (() => void) | undefined;
  const capture: Promise<MicrophonePermissionResult> = Promise.resolve()
    .then(() =>
      navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      }),
    )
    .then((stream) => {
      stream.getTracks().forEach((track) => track.stop());
      return "granted" as const;
    })
    .catch((error: unknown) => {
      const name =
        error instanceof Error
          ? error.name
          : typeof error === "object" && error !== null && "name" in error
            ? String(error.name)
            : "";
      return name === "NotAllowedError" ||
        name === "PermissionDeniedError" ||
        name === "SecurityError"
        ? ("denied" as const)
        : ("unavailable" as const);
    })
    .then((result) => {
      if (pending && !options.signal?.aborted) options.onLateResult?.(result);
      return result;
    });
  const timeout = new Promise<MicrophonePermissionResult>((resolve) => {
    timer = setTimeout(
      () => resolve("pending"),
      Math.max(0, options.timeoutMs ?? 10_000),
    );
    abortHandler = () => resolve("pending");
    options.signal?.addEventListener("abort", abortHandler, { once: true });
  });
  try {
    const result = await Promise.race([capture, timeout]);
    pending = result === "pending";
    return result;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    if (abortHandler)
      options.signal?.removeEventListener("abort", abortHandler);
  }
}
