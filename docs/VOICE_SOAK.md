# Actual voice renewal soak

The [audio-only harness](../scripts/voice-soak.ts) checks the real `VoiceController` and `registerVoiceRoutes` for at least ten wall-clock minutes, including the normal nine-minute lease renewal. It bundles a minimal local page with esbuild; it loads no game models, Three.js, WebGL renderer, narration or ambience. It does not accelerate the clock or replace recognized speech with injected text.

Prepare without starting a browser or contacting a provider:

```sh
npx tsx scripts/voice-soak.ts --prepare-only
```

After server credentials and explicit synthetic-fixture usage are configured, and other measured browser tours have finished:

```sh
LIVE_AUDIO_TEST=1 npx tsx scripts/voice-soak.ts
```

The runner uses a dedicated localhost server on port 5184 (override `VOICE_SOAK_PORT`), adult development mode and the existing original synthetic stop fixture. An actual button click starts capture. Chromium's fake microphone loops the WAV through a real WebRTC provider connection. The active server readiness response supplies the recorded model names. No human or child recording is used. This consumes actual provider resources and must not be treated as an offline unit test.

A pass requires actual initial commands, at least one successful normal renewal, a newly connected real peer, and commands arriving through that renewed connection. Only stop commands are expected. Samples record live tracks and peer states; at most one of each may remain active. After ten minutes, a visible Stop listening button must close all tracks/peers and revoke the server lease. A final probe uses the old lease token only inside a temporary page closure and must return unauthorized. Tokens, SDP, raw provider events, transcripts and microphone bytes are never included in the report or application logs.

Evidence is written to `artifacts/voice/soak-report.json`: actual elapsed wall time, model names, command types/counts, renewal count, resource samples, local API status codes and error counts. It reports BLOCKED if the key or explicit live-test flag is missing, and FAIL if prerequisites connect but continuity or cleanup fails. Browser errors are counted without retaining arbitrary provider text. The deliberate final unauthorized probe may produce a browser console error; its HTTP status is assessed separately.

This is a ten-minute synthetic-audio continuity and nine-minute handoff check, not a twenty-minute live test, a child-speech accuracy result, a physical microphone test or a claim of an inaudible renewal handoff. The full [live voice fixture suite](VOICE.md) independently checks command accuracy and latency. The actual run below is preserved in the generated report; preparation-only checks do not count as provider evidence.


## Actual run — September 10, 2026

**Overall FAIL: renewal and cleanup passed, but the repeated stop fixture produced wrong commands.** The [actual report](../artifacts/voice/soak-report.json) records a harness start of **20:04:41.561 UTC**, final report completion of **2026-09-10T20:14:44.979188+00:00**, and **600,012 ms** of measured connected-session wall time. Completion time is the original final report file timestamp, not an inferred provider timestamp. The minimal audio-only page ran concurrently with the coordinator's resource-soak phase, after all isolated GPU timing tours had finished.

The actual provider model was `gpt-4o-mini-transcribe`. Astra was configured as `gpt-6-astra`, but this literal-command run made no `/interpret` request; it does not independently exercise Astra. There were 82 command envelopes: **76 stop and 6 unexpected vertical commands**. Five wrong commands occurred before renewal and one after it. Because the harness intentionally retains no transcripts or microphone recordings, the exact incorrectly recognized words cannot be reconstructed. The six wrong commands are a real stop-reliability failure and are not reclassified as harmless silence or a passing renewal test.

The lease renewed successfully at **538,843 ms after initial peer connection**, near the normal nine-minute deadline measured from session enablement. The replacement session request returned HTTP 200. A second real peer connected while the first was closed; eight commands arrived after renewal, including seven correct stops and one wrong vertical command. Connection-status callbacks show 558 ms between renewal's first connecting state and the replacement listening state; this is not a claim of seamless audio or measured speech latency.

Across 120 resource samples, at most one track and one peer remained live. Stop listening returned HTTP 204, closed both created peers and both captured tracks, left no pending command request, and the old authenticated lease then returned HTTP 401. There were zero JavaScript page exceptions. One console error corresponds to the deliberately unauthorized final revocation probe. The browser and dedicated server were closed at completion.

The report retains **FAIL** because its stop-only acceptance check failed. All ten-minute duration, renewal, post-renewal delivery, resource-bound and teardown checks passed individually. These distinctions must remain visible in final release evidence; a successful 34-fixture run elsewhere cannot erase the long-session stop errors.
