# Mermaidia V1 implementation status

Updated 2026-09-10. All milestones have local implementations. The user supplied the server API key during final verification. **Actual OpenAI voice testing passed the specified fixture threshold** and all 85 natural narration clips have been generated. The corrected transcription path passed 32/34 real-audio cases, including all stop and quiet/negated cases; targeted reruns confirmed the two recognition misses. Child cloud deployment is disabled; this is not a child-ready cloud release. The later ten-minute voice soak failed stop reliability (six incorrect vertical commands), although renewal and cleanup passed. Hardware performance passed all eight checks. Evidence below distinguishes executed checks from remaining gates.

| Milestone | State | Evidence / remaining gate |
|---|---|---|
| 0 Inspect/bootstrap | Implemented and verified locally | [Installed toolchain](TOOLCHAIN.md), [doctor](../artifacts/doctor.json), [contracts](CONTRACTS.md), real Blender exports, [clean dependency rehearsal](RELEASE_AUDIT.md). Original PLANS.md preserved. |
| 1 Australian slice | Implemented, browser exercised and visually inspected | [Controller tests](../tests/simulation.test.ts), [browser journeys](../tests/core.spec.ts), [rendered views](../artifacts/review/revision5/), [independent review](INDEPENDENT_REVIEW.md). |
| 2 Voice end to end | Real adapters implemented; deterministic/protocol/lifecycle checks pass; live fixture threshold passed; extended stop-reliability failure remains open | [Voice setup and architecture](VOICE.md), [unit evidence](../artifacts/unit-results.json), [protocol UI test](../tests/voice-ui.spec.ts), [actual live report](../artifacts/voice/live-report.json). Key is configured. Real gpt-4o-mini-transcribe fixtures passed 32/34 (94.1%); actual Astra interpretation passed. [Preserved full run](../artifacts/voice/full-real-suite.json). [Extended soak failure](VOICE_SOAK.md) remains open. |
| 3 Five destinations | Implemented and audited | Five habitats, 15 starts, 39 discoveries, 29 biological entries. [Content audit](../artifacts/content-validation.json), [inspected source index](REFERENCE_INDEX.md), [asset audit](../artifacts/asset-validation.json), [art review](ART_DIRECTION.md). All five internal visual scores reached 10/12; not expert certification. |
| 4 Curiosity/accessibility | Implemented; browser regression passed | Narrated cards, local journal, optional activities, keyboard/touch, reduced motion and settings. [Journeys](../tests/core.spec.ts), [resilience/accessibility](../tests/resilience.spec.ts), [future parent test](PARENT_TEST.md). |
| 5 Polish/reliability | Implemented; hardware tours/resource soak passed; voice reliability issue open | [Lifecycle and movement regressions](../tests/review.test.ts), [performance runner](../scripts/performance.ts), [measurement report](../artifacts/performance/report.json). Five tours ≈60 FPS, 25 stable switches and 608,880 ms soak; all eight budgets pass. [Voice soak](VOICE_SOAK.md) retains six wrong commands. |
| 6 Independent verification/handoff | Independent review and production release audit complete; extended voice accuracy gate failed | [Independent review](INDEPENDENT_REVIEW.md), [README](../README.md), [release audit](RELEASE_AUDIT.md), [QA](QA_REPORT.md). |

## Latest world expansion

All five populated oceans are now 240 × 240 m (5× wider and longer, 25× area), with 25 encounter regions and 176–191 discoverable entity instances per destination. Added reef arches/gardens, a roughly 100 m wreck exterior, outer wildlife starts and nine usable Antarctic leads. [Implementation and quick actual-play evidence](EXPANDED_WORLDS.md). No unit/full regression run; historical small-world benchmarks are not claimed for this expansion.

## Latest home-screen change

The text-heavy opening menu has been replaced with animated Elise on the left, a swipeable picture carousel, three icon-led starting spots and one large Play button. [Implementation and quick visual check](MENU_CAROUSEL.md). The user requested hackathon pacing: this change received a build/type check and a brief actual browser check, not a broad test run.

## Accepted changes to the original brief

- Spoken controls default on, with immediate browser audio-only permission preflight. Permission-check tracks close immediately, including late grants. Denied/pending permission leaves play available. This follows the user's explicit startup request.
- Voice is primary. In the server-authorized adult local mode, Start swimming connects automatically without a second settings checkbox. The welcome caption does not delay listening with narration. A prominent microphone shows actual connection/listening/speaking state; buttons are backups. Spoken card close, keep swimming, pause/resume and session renewal are implemented. Missing credentials are identified explicitly. Browser protocol tests simulate provider events and cannot establish recognition accuracy.
- Following the user’s explicit request for faster physical swimming, speeds are now **2, 3.2 and 5 m/s** (previously 0.8, 1.2 and 2). This supersedes the original plan’s 2 m/s cap. Space and “go faster” use the same levels and also accelerate surface/discovery routes. Lateral/vertical nudges remain short; S, Down Arrow and Stop halt movement immediately. Increasing speed while hovering does not start motion. [Movement regressions](../tests/simulation.test.ts) verify actual distance, route acceleration and top-speed stopping/collision bounds.
- Preferred narration is OpenAI `gpt-4o-mini-tts` / `marin`, with an original warm, playful delivery and reviewed text only. No character or performer imitation. [Narration](NARRATION.md) documents the live cache and offline generator. All 85 reviewed lines were generated and now ship locally; format/hash/loudness audits pass. [Generation report](../artifacts/narration/build-report.json), [audio measurements](../artifacts/narration/audio-audit.json). Human listening remains unverified.
- The opening screen is now a full-screen cinematic ocean menu with destination selection, three starting spots, subtle motion and reduced-motion support. [Inspected desktop](../artifacts/menu-desktop.png), [mobile](../artifacts/menu-mobile.png), [starting spots](../artifacts/menu-starts-mobile.png), [original generated art provenance and prompt](MENU_ART.md).

## Definition of done

- [x] Local bootstrap, installed dependencies, assets, build and production launch have executed evidence: [toolchain](TOOLCHAIN.md), [release rehearsal](RELEASE_AUDIT.md).
- [x] Dark-haired original animated Elise and five environments exported, loaded and inspected: [art direction](ART_DIRECTION.md), [independent review](INDEPENDENT_REVIEW.md).
- [x] Five destinations, fifteen starts, required content counts and signature experiences implemented: [content audit](../artifacts/content-validation.json), [browser journeys](../tests/core.spec.ts).
- [x] Identities/facts/placements have inspected evidence and shipped assets have provenance: [research](HABITAT_RESEARCH.md), [sources](REFERENCE_INDEX.md), [asset audit](../artifacts/asset-validation.json). Agent review, not scientific certification.
- [x] Spoken navigation/Astra exercised through actual provider audio: [full run](../artifacts/voice/full-real-suite.json) passed the specified ≥90% threshold, all stop cases and zero commands in the quiet/negated/unrelated set. Two short-word recognition failures remain recorded.
- [x] Keyboard/touch, actual proximity question cards, narration, journal and activities implemented and exercised: [journeys](../tests/core.spec.ts), [audio audit](../artifacts/audio/browser-report.json).
- [ ] Child cloud deployment prerequisites confirmed: unconfirmed; child transmission remains disabled server-side.
- [x] Recoverable exploration without health, combat, punishment, time limit or losing progress: [controller regressions](../tests/review.test.ts).
- [x] Audio mixing/mute/teardown technically verified: [audio audit](../artifacts/audio/audit.json), [mixer tests](../tests/narration.test.ts), [lifecycle tests](../tests/voice-continuous.test.ts). Human audible comfort is unverified.
- [ ] All quality gates pass: 208 unit tests, 25 browser checks plus six provider-fix checks and five final speed/voice checks, visual/provenance audits, final hardware performance and exploration soak passed. The actual ten-minute voice soak completed and failed stop reliability; [failure evidence](VOICE_SOAK.md) is preserved.
- [x] Final documentation reconciled with actual reports, including historical build scope and failed recognition evidence: [QA](QA_REPORT.md), [final build](../artifacts/final-build.json), [link audit](../artifacts/documentation-links.json).
- [x] No locked destination or placeholder scene substitutes for a required habitat. Simplified artistic wildlife is documented as such.

## External prerequisites and unverified checks

The user supplied the ignored local `.env` API key and the server was restarted. Adult local voice is configured and actual recognition has been verified on the documented synthetic fixture set and the complete natural narration pack now ships locally. The key remains server-only.

Provider-side under-13 retention/account controls and endpoint compatibility have not been confirmed. A developer flag, parent checkbox or `store:false` is not evidence of those controls. Actual adult-device microphone, human audible comfort, supervised parent/child usability and scientific expert review have not occurred. [Parent test](PARENT_TEST.md) is a future script.

Ambient sound is original sound design. The quiet Australian surface wildlife cue uses a real CC0 buff-banded rail recording; [provenance](BIRD_AUDIO.md) states its Victoria recording site, without claiming it was recorded at Green Island.
