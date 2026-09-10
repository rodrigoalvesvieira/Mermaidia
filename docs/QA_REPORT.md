# Mermaidia V1 QA evidence

Updated 2026-09-10. This report separates implemented behavior, executed checks and unverified release requirements. [PLANS.md](../PLANS.md) is the specification; [implementation status](IMPLEMENTATION_STATUS.md) tracks all milestones.

## Executed checks

| Check | Actual result | Evidence |
|---|---|---|
| Dependencies/toolchain | Installed Node dependencies, Blender, FFmpeg, eSpeak NG, Chromium/Firefox/WebKit; actual exports/builds executed | [Toolchain](TOOLCHAIN.md), [doctor](../artifacts/doctor.json) |
| Unit/integration | **208 passed** across eight files: controller, grammar, cancellation, microphone lifecycle, server gates, narration cache/mixer and regression cases | [Log](../artifacts/unit-tests.log), [machine results](../artifacts/unit-results.json) |
| Content/ecology audit | Five habitats, 15 starts, 39 discoveries, 29 biological entries; zero validation errors | [Report](../artifacts/content-validation.json), [research](HABITAT_RESEARCH.md), [inspected sources](REFERENCE_INDEX.md) |
| Assets/rights/glTF | **185 registered assets**, zero validation errors; 41 GLBs with zero Khronos errors/warnings | [Report](../artifacts/asset-validation.json), [credits](../ATTRIBUTIONS.md), [menu provenance](MENU_ART.md) |
| Browser regression | **25 checks passed in 6.6 minutes** across Chromium/Firefox/WebKit, including automatic voice startup, missing-key feedback and the new menu. **Six focused checks also passed after the real-provider fixes, then five final movement/voice checks passed in 1.2 minutes after the swimming-speed adjustment** | [Full log](../artifacts/e2e-final.log), [full results](../artifacts/e2e-results.json), [final focused log](../artifacts/e2e-voice-final.log), [focused results](../artifacts/e2e-voice-final.json), [final speed/voice log](../artifacts/e2e-swimming-speed.log), [final speed/voice results](../artifacts/e2e-swimming-speed.json) |
| Visual inspection | All five habitats reached internal **10/12** rubric; actual images and motion frames inspected. Menu inspected on desktop/mobile | [Independent review](INDEPENDENT_REVIEW.md), [art](ART_DIRECTION.md), [desktop menu](../artifacts/menu-desktop.png), [mobile starts](../artifacts/menu-starts-mobile.png) |
| Audio technical audit | Original buffers decode; numerical clipping/loop checks pass; mute, pending narration cancellation, cache and microphone ducking tested | [Numerical audit](../artifacts/audio/audit.json), [browser decode](../artifacts/audio/browser-report.json), [mixer tests](../tests/narration.test.ts) |
| Production/clean install | Production build with the narration pack, before the final movement/grammar adjustment, **passed** load/security checks: 3.814 s and 5.825 MB cold first play. Isolated npm ci also passed. | [Release audit](RELEASE_AUDIT.md), [release artifacts](../artifacts/release/) |
| Hardware performance/soak | The measured build’s five native-GPU tours sustained ≈60 FPS and passed their frame/geometry budgets; 25 switches kept resource counts stable. The 608,880 ms exploration soak completed; all eight performance checks passed. Earlier incomplete run rejected. | [Runner](../scripts/performance.ts), [measurement report](../artifacts/performance/report.json) |
| Actual OpenAI speech | **32/34 (94.1%) passed** through real OpenAI audio; all three stop and seven quiet/negated/unrelated cases passed. Astra structured interpretation passed. Two short-word recognition failures were confirmed and retained in [targeted evidence](../artifacts/voice/short-word-diagnostic.json). | [Full actual run](../artifacts/voice/full-real-suite.json), [voice setup](VOICE.md) |
| Extended live voice soak | **FAIL overall:** 600,012 ms, renewal and cleanup passed, but looping stop audio produced 76 stop and six incorrect vertical commands. | [Actual report and limits](VOICE_SOAK.md) |
| Natural narrator generation | **85/85 generated and verified**, 24 kHz mono PCM16, −22.53…−21.93 LUFS, loudest peak −5.99 dBTP; offline playback verified. | [Actual build report](../artifacts/narration/build-report.json), [narration implementation](NARRATION.md) |

## Voice startup and control evidence

The user requested immediate microphone permission and voice as the primary control. Seven permission-helper tests cover audio-only capture, pending/denied permission and immediate/late track teardown. The permission probe does not create a cloud session. In the already-authorized adult local mode, starting play automatically connects voice with no additional checkbox. The welcome is a caption so narration does not mute the first spoken command. Missing credentials are explicitly identified.

The [browser voice protocol test](../tests/voice-ui.spec.ts) uses simulated provider events, real UI/controller state and a short PCM narration fixture. It exercises direct startup, discovery/close, acceleration, stop, pause/resume, surface, backup buttons and microphone teardown. This verifies integration and UX, **not speech recognition**. The second case verifies that an empty key reports the actual blocker and offers no redundant adult-session checkbox.

Common commands use low-delay OpenAI transcription and local parsing; unresolved navigation uses the real server-side Astra adapter. Deterministic tests cover long-session renewal and cancellation. The completed live run exercised 34 actual audio fixtures: 32 passed (94.1%), including all three clear stop cases and all seven quiet/negated/unrelated cases. The separate actual Astra structured call passed in 2,428 ms. Successful common commands had 438 ms median and 823 ms p95 from the provider speech-stop event to controller dispatch; this is not independently measured acoustic-end latency. Single-word synthetic “resume” and “help” recordings were misrecognized again in targeted reruns. Those failures remain in the reports; no guessed word substitution was added. No substitute transcript test is presented as live voice success.

The subsequent [actual ten-minute voice soak](VOICE_SOAK.md) caught six wrong vertical commands among 82 envelopes from repeated stop audio. Its overall result is FAIL. Normal nine-minute renewal, commands after renewal, bounded tracks/peers and final revocation passed individually. No raw transcripts were retained, so the incorrectly recognized words cannot be reconstructed. This failure remains open despite the earlier fixture threshold pass.

Swimming now uses 2, 3.2 and 5 m/s following the user’s speed clarification. The normal level is 2.5× the prior 0.8 m/s; the top level is 2.5× the prior 2 m/s. Space and spoken acceleration share the levels, including route travel. Unit regressions measure one-second displacement at every level, immediate stopping at top speed, route acceleration, collisions and bounded directional nudges. Browser journeys check acceleration, the cap and changing speed while hovering without starting movement.

## Visual scope and resolved defects

The internal review inspected real rendered views, including underwater/surface/landmark states and movement frames. Corrections included a continuous Antarctic ice roof, wreck plate structure, improved terrain/coral material detail, foreground spacing and proper instanced mesh transforms. A reserved GLSL variable caused a historical failed render; it was fixed and the later review recorded no shader/page errors. The browser visual check now catches shader console errors explicitly. [Independent review](INDEPENDENT_REVIEW.md) retains the earlier failures and subsequent evidence.

The cinematic menu uses original generated 2D environment artwork, separately documented from the original Blender 3D models. Desktop, mobile, all three start choices and reduced-motion handling were inspected. Decorative key art is not geographic or ecological evidence.

## Unverified boundaries

- Actual provider accuracy/latency is established only for the documented synthetic fixture set. A physical adult microphone, child speech, room acoustics, accents and loudspeaker feedback remain unverified.
- Provider under-13 retention/account controls and endpoint compatibility are not confirmed. Child cloud audio is disabled server-side. An application flag, browser permission or `store:false` cannot establish those controls.
- Natural narrator warmth, audible comfort and loudspeaker feedback have not been assessed by human listening. The generated Marin pack ships locally; measured format/loudness and generation success do not establish subjective warmth or pronunciation. eSpeak remains an authoring fallback for missing/changed scripts.
- The real CC0 bird cue is attributed to its Victoria recording site, not represented as a Green Island recording; see [provenance](BIRD_AUDIO.md).
- Simplified original models and internal source/art reviews do not replace a marine-science expert assessment.
- No supervised parent/child usability session occurred. [Parent test](PARENT_TEST.md) is a future script.

## Reproduction

Run `npm run verify` for type/lint/assets/content/unit/build/browser checks. For fixed-build tests, run `npm run build:test`, `ALLOW_ADULT_VOICE_DEV=false npm run serve:test` in another terminal, and `TEST_URL=http://localhost:5174 npm run test:e2e`. [Final build manifest](../artifacts/final-build.json) records the production/test hashes, asset manifests and which browser runs covered the final provider fixes. The prior [measured build manifest](../artifacts/final-build-before-speed.json) identifies the version used for hardware and loading measurements; those measurements were not repeated after the focused movement/grammar change. The earlier [formatting equivalence check](../artifacts/test-build-equivalence.json) refers to the preceding full-suite snapshot, not the later provider build.

Run `npm run test:performance` alone on the desktop, without another browser suite or Blender. It takes approximately 16 minutes and records actual adapter/frame percentiles/resources/errors. `npm run build && npm run test:release` audits production and rehearses isolated installation. `npm run test:voice:live` and `npm run narration:build` separately report missing prerequisites.

Generated evidence is intentionally ignored by Git but exists in this workspace. Each link identifies an actual report, image or reproducible source. No external deployment was performed.
