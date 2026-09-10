# Elise's narration

Elise's preferred narrator is OpenAI `gpt-4o-mini-tts` with the built-in `marin` voice. The direction asks for an original warm, curious, playful ocean explorer: natural conversational delivery, a smile, gentle pauses, and clear short phrases for a five-year-old. It requests no singing, baby talk, added facts, or character/actor imitation. This is AI-generated narration, not a recorded performer or cloned voice. The parent-facing interface must disclose that clearly.

The [official speech guide](https://developers.openai.com/api/docs/guides/text-to-speech) documents voice direction through `instructions`, WAV output and the built-in voices. The installed OpenAI SDK's speech types were also inspected. `marin` is selected following the guide's quality recommendation. Successful real generation is recorded below; the audible result still needs a listening check.

## Reviewed scripts and privacy

[`content/narration.ts`](../content/narration.ts) is the single script registry for the fallback builder, preferred builder and server. All 39 discovery scripts are composed verbatim from the existing common name and reviewed child sentences; their evidence IDs are preserved. The guidance now leads with spoken commands: “swim forward,” “go faster,” “surface,” “what is this fish,” and “close” after a discovery card.

The server accepts an existing script ID only. It does not accept free text, microphone bytes, transcripts, child names, custom voices or browser-selected models. This generation of predefined non-personal scripts is independent of the microphone transmission gate. Nothing in this feature enables microphone capture or changes recognition authorization.

## Integration and operation

Register `registerNarrationRoutes(app)` from `server/narration.ts` before the static/Vite middleware. Keep `OPENAI_API_KEY` server-only; never use a `VITE_` variable. The server provides:

- `GET /api/narration/status`: truthful key configuration and preferred/fallback identities, without credentials or a claim that generation has succeeded.
- `GET /api/narration/:id`: verified preferred offline audio, or lazy provider generation of the registry's exact script. Unknown IDs, free-text query parameters and cross-origin generation are refused.

The server deduplicates simultaneous requests for one ID. Generated WAVs are validated and cached with a 48-entry/32 MiB LRU limit. A maximum of two generations run concurrently, with at most 24 new generations per minute and eight pending ID lookups. Individual responses are limited to 4 MiB, requests time out after 12 seconds, and failed generation imposes a 15-second cooldown. Error responses are sanitized. The cache is in memory; it disappears when the process restarts. HTTP revalidation avoids serving an old script indefinitely.

The audio mixer first requests this preferred route, which serves the verified shipped pack without needing a provider key. When the route is unavailable, the mixer directly plays the existing local WAV and reports `offline-fallback`, with a 30-second route retry interval. **That enum describes a delivery path, not an eSpeak voice:** all 85 currently shipped narration WAVs are Marin, including those fetched directly from `/assets/audio/`. It reports `openai-marin` after preferred-route audio has loaded and decoded; this may also be a verified local file and does not imply a new API request. `onNarratorSource` and `diagnostics.narrator` support truthful parent status; the fallback-path label is “Narrator: local narration pack.” A voice command remains possible while speech is downloading: microphone suppression and ambient ducking begin at actual playback, immediately before `source.start()`. Stop, card close, habitat changes and disposal abort pending narration and prevent late responses from starting. Existing narration completion restores capture through `onNarrating(false)`. Muting all sound or setting narration volume to zero cancels pending/playing narration; silent narration never suppresses the microphone. The voice-ready welcome is caption-only so Start swimming can begin listening immediately.

## Offline generation

After a server key is configured and actual generation is authorized, run:

```sh
npx tsx scripts/narration-build.ts --only=narration-welcome,narration-controls
npx tsx scripts/narration-build.ts
npx tsx scripts/narration-audit.ts
npm run assets:validate
npm run content:validate
```

The first command is an optional small listening sample; the second covers every reviewed line. Nothing invokes these paid requests automatically during install or the production build. FFmpeg is required. The builder uses the same provider direction, applies gentle transient compression and measured two-pass normalization to -22 LUFS with a -6 dBTP ceiling, and writes mono 24 kHz PCM16 WAVs. It preserves ambient and bird assets. Each successful file receives actual OpenAI model/voice provenance, generation date, SHA-256 and a fingerprint of the script and voice direction in `assets/manifests/audio.json`. Matching files are reused only after checksum verification. Successful assets remain registered if a later request fails; the builder stops and writes a sanitized report under `artifacts/narration/build-report.json`. A missing key exits without modifying audio.

`npx tsx scripts/audio-build.ts --cues-only` checks the eleven guidance clips and preserves matching, checksum-verified Marin files. It renders eSpeak only for a missing or changed script without a matching preferred clip. A full fallback build follows the same preservation rule and keeps ambient/bird assets and untouched records. Thus the fallback authoring tool remains available when generation is unavailable or a new script needs temporary audio, but the shipped 85-clip pack currently contains no eSpeak narration. The runtime `offline-fallback` enum must not be presented as a claim about synthesis technology.

## Verification and present boundary

[`tests/narration.test.ts`](../tests/narration.test.ts) exercises reviewed text fidelity, the exact mocked speech API payload, unknown-ID rejection, deduplication, cache budgets, concurrency/rate limits, timeout cancellation, malformed audio, sanitized route errors, no-key/offline behavior, microphone suppression at playback and cancellation of late audio. These are mocked provider tests, not evidence of an audible Marin rendition.

On 2026-09-10, after the user configured a server key and authorized generation, all **85 reviewed lines were actually generated** with the configured `gpt-4o-mini-tts` / `marin` request. There were 85 successful generations and no failed lines in the [generation report](../artifacts/narration/build-report.json). Each registry entry contains the actual generated file's final SHA-256, voice/model attribution and matching script fingerprint. The complete preferred pack is now present locally and can be served without another provider call; the earlier missing-key boundary no longer applies to this pack. A [key-disabled service check](../artifacts/narration/offline-playback.json) actually retrieved the final welcome WAV with provider configuration set false and zero provider calls; this verifies local delivery, not a human listening session.

The first numerical audit identified ten short clips outside the intended ±1 LU loudness tolerance. These were not called a pass: all preferred clips were processed locally with gentle transient compression followed by measured two-pass normalization. This correction made **zero additional provider requests** and updated file/registry/report hashes. The [normalization report](../artifacts/narration/normalization-report.json) records before/after hashes; `scripts/audio/normalize-narration.ts` now supplies the same normalization to future builds. `npx tsx scripts/narration-normalize.ts` can repair a previously generated pack without contacting the provider.

| Executed check | Actual result |
| --- | --- |
| Preferred scripted clips | 85 / 85 generated and fingerprint/checksum verified |
| Decoded format | Mono, 24,000 Hz, PCM16 for all 85 |
| Combined duration | 500.85 seconds |
| Measured integrated loudness | −22.53 to −21.93 LUFS |
| Loudest measured true peak | −5.99 dBTP |
| Per-clip loudness tolerance | All within −22 ± 1 LUFS; no peak exceeds −5.8 dBTP tolerance |

Evidence: [per-clip measurements and hashes](../artifacts/narration/audio-audit.json), [generation log](../artifacts/narration/generation-run.log), and [general audio audit](../artifacts/audio/audit.json). Reproduce the preferred-pack checks with `npx tsx scripts/narration-audit.ts`; this command reads local files and makes no provider requests.

**Auditory quality remains unverified.** A generated file and numerical pass do not establish warmth, natural delivery, scientific-name pronunciation or child comfort. Listen to the welcome, movement instructions and scientific names for those qualities and the clean return to command capture. No human or expert listening session is claimed here.
