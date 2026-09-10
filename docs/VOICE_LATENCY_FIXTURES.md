# Everyday-request latency fixtures

These four original synthetic microphone inputs are separate from the original 35-fixture suite. They are intended to measure recognition plus immediate local command dispatch for clear everyday requests, while checking that negation still prevents action. Their presence does not establish actual recognition accuracy or latency.

| ID | Spoken script | Expected command | WAV duration |
|---|---|---|---:|
| latency-01 | can we go faster | [{"type": "speed", "delta": 1}] | 7.981375 s |
| latency-02 | I want to swim forward | [{"type": "swim"}] | 8.389708 s |
| latency-03 | can we go to the surface | [{"type": "surface"}] | 8.004313 s |
| latency-04 | can we not swim forward | No command | 8.108708 s |

Reproduce with `npx tsx scripts/voice-latency-fixtures.ts`. The [generator](../scripts/voice-latency-fixtures.ts) uses eSpeak NG formant synthesis and FFmpeg, with the same conventions as the original suite: alternating `en-us+f3`/`en-us`, 130/140/150/160 words per minute, 2.2 seconds of leading silence, four seconds of trailing padding, volume multiplier 0.6, and mono 48 kHz PCM16 WAV. Chromium may loop these files for actual microphone-fixture tests. The scripts are original project text; they contain no human or child recordings, cloned voices or third-party audio samples. The [eSpeak output-license explanation](https://espeak.sourceforge.net/license.html) distinguishes synthesizer software from its generated output.

The separate [manifest](../tests/voice/latency-fixtures.json) supplies standard `id`, `path`, `text`, and `expected` fields for the live runner, plus each WAV SHA-256, UTF-8 script SHA-256, recipe SHA-256, synthesis settings and probed duration. An empty expected list means intentional no action. The [build report](../artifacts/voice/latency-fixtures-build.json) records tool versions, actual generated hashes and the check that the original manifest and every original WAV stayed unchanged.

Generator SHA-256 for this build: `15d1f75bcf9cdd84889a98aa7ab529a0c510b81472eccbee684ab52cacf809aa`.

Original 35-fixture manifest SHA-256 before and after: `42846a94acdc1e0f54c09e6d619baa314eff08d64ef813d9b061552b71b62f46`.

The generator verified all four PCM encodings and durations; source inspection confirms the exact leading/trailing silence recipe. It neither starts a browser nor contacts a provider. No live result or auditory review is claimed by this build. A later actual-audio run must record provider identity, command correctness, no action for the negated request, and end-of-speech-to-action timing. Direct calls to the parser can verify grammar but cannot substitute for that live audio measurement.
