# Rendering and long-session verification

The final hardware performance run passed all eight acceptance checks. Five one-minute tours sustained approximately 60 FPS, 25 destination switches kept resource counts stable, and the exploration soak completed 608,880 ms (10 minutes 8.9 seconds). No interrupted run is treated as a pass.

## Measurement method

Run `npm run build:test`, then `ALLOW_ADULT_VOICE_DEV=false npm run serve:test` in a separate terminal. Run `npm run test:performance` alone, without another browser suite, asset generation or Blender. It takes approximately sixteen minutes: five 60-second tours, five complete destination-switch cycles, and a ten-minute exploration soak covering surface/dive, discoveries, journal saves and unavailable-voice handling.

The runner uses installed Chrome in headless mode with `--enable-gpu`, at 1280×720 and DPR 1, medium detail. Chromium's [official GPU documentation](https://chromium.googlesource.com/chromium/src/+/HEAD/docs/gpu/using-gpu-hardware-in-headless-chrome.md) documents this flag. The actual WebGL adapter is recorded; software renderers cause an immediate failure. A [five-second adapter/coverage probe](../artifacts/performance/headless-probe.json) actually reported Apple M3 Metal, 300 frames in 5.007 seconds and visible page state. That is a setup check, not a performance acceptance result.

The final report records p50/p95/p99 raw frame intervals, total frames and elapsed wall time, average sustained FPS, peak draw calls/triangles, geometry/texture counts, bounded audio and voice diagnostics, JS heap observations, visibility and actual adapter. Acceptance requires at least 30 sustained FPS, p95≤33.3ms, ≤200 draw calls, ≤500,000 visible triangles, stable geometry/texture/source counts across switching, and no page errors. Build JS/CSS hashes identify the measured client.

The benchmark server disables cloud listening explicitly so fake microphone input does not start paid recognition and rendering measurements remain isolated. Actual speech fixtures and session-renewal tests are separate evidence; unavailable-voice handling in this soak is not a live voice reconnect test.

## Rejected earlier sample

The [interrupted 19:23 UTC run](../artifacts/performance/interrupted-20260910-1923.json) recorded only 283 shipwreck frames in 60 seconds, despite a low p95 frame interval. That sample cannot establish sustained rendering. Native window occlusion/backgrounding is suspected, not proven. The run was stopped and is not used for acceptance. The revised harness records average FPS and visibility in addition to percentiles, and avoids a foreground-window dependency. The first three tours in that interrupted report are retained as historical measurements, not substituted into the final report.

## Completed tour measurements

| Habitat | Mean FPS | p95 ms | Peak draw calls | Peak triangles |
|---|---:|---:|---:|---:|
| australia | 60.0 | 16.8 | 79 | 234,708 |
| caribbean | 60.0 | 16.7 | 77 | 410,682 |
| antarctica | 60.0 | 16.7 | 74 | 72,794 |
| shipwreck | 60.0 | 16.7 | 120 | 375,898 |
| deepsea | 60.0 | 16.7 | 32 | 18,028 |

The tour and switching phases ran without another agent browser workload. After all 25 switches, a separate minimal audio-only page began its [actual voice renewal check](VOICE_SOAK.md) during the exploration-resource soak. That page has no Three.js or WebGL scene. Thus the reported tour frame rates are isolated; the later resource soak explicitly coexists with a real audio session.

## Final evidence

[Machine report](../artifacts/performance/report.json) and [runner](../scripts/performance.ts). A report without `finished: true` and passing required budgets is incomplete. The final report has `finished: true`; frame-time p95, sustained frame rate, native renderer, visible samples, draw calls, triangles, stable switching resources and no-page-errors checks are all true. The exploration soak completed without page exceptions. The separate live voice soak failed its command-accuracy check; its successful renewal/cleanup does not convert that voice result into a pass. See [voice findings](VOICE_SOAK.md).

## Later swimming-speed adjustment

After this measured run, the user clarified that Elise should swim faster. The final movement levels are 2/3.2/5 m/s with speed-aware routes and short lateral/vertical nudges. Renderer/assets/shaders are unchanged, but the movement profile differs from this report’s recorded build. Focused movement/browser verification is linked from [QA](QA_REPORT.md); these earlier tour timings are not presented as a rerun of the faster profile.
