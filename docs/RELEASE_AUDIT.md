# Production release audit

Recorded 2026-09-10 19:57 UTC against the final production build with the immersive menu, automatic voice setup and 85 generated Marin narration clips. **Passed** the measured load/transfer budgets, production secret/test-hook checks, and isolated dependency-install rehearsal. This audit does not establish live cloud speech, child usability, or scientific expert approval.

## Reproduce

```sh
npm run build
npx tsx scripts/release-audit.ts
```

The script starts the actual production server on `127.0.0.1:5182`, opens installed **headed Google Chrome**, applies CDP network throttling, visits all five destinations through normal buttons, then closes the browser and server. Use `RELEASE_AUDIT_PORT` to change the port. Run alone when gathering timings. `--install-only` runs only the isolated dependency rehearsal; `--skip-install` reuses its existing evidence and runs the production audit. The script never enables test-mode builds or test hooks. The separate test server is not measured.

Evidence: [network JSON](../artifacts/release/network.json), [production static audit](../artifacts/release/production-static.json), [clean install](../artifacts/release/clean-install.json), [npm log](../artifacts/release/npm-ci.log), and [production server log](../artifacts/release/server.log). Build code filenames and SHA-256 hashes are retained in the JSON to identify the measured release. Scene captures are `artifacts/release/production-{australia,caribbean,antarctica,shipwreck,deepsea}.png`; these capture successful rendered visits, not an art-rubric approval.

## Network results

Hardware: Apple M3, macOS/Darwin 25.5.0; Chrome 153.0.8010.37, headed, 1280×720, DPR 1, default medium picture detail. `Network.emulateNetworkConditions` used 20,000,000 bits/s down and up, 80 ms latency, an empty browser context, disabled HTTP cache, and blocked service workers. Chrome's synthetic microphone and local permission grant let the default permission probe complete. The audit child server explicitly overrides `ALLOW_ADULT_VOICE_DEV=false`, preventing automatic synthetic-device cloud recognition even when the development server is configured for adult voice play. It retains the configured server key for preferred narration, including verified offline clips. Actual recognition is evaluated by the separate live voice runner; no live recognition result is implied by this loading benchmark. This run used the override with an actual configured server key and the generated preferred audio pack. The benchmark received the preferred welcome narration from `/api/narration/narration-welcome` (HTTP 200; 293,222 encoded response bytes). The [generation report](../artifacts/narration/build-report.json) documents 85 completed `gpt-4o-mini-tts` / `marin` clips; loading them does not certify warmth or scientific pronunciation by human listening.

Actual encoded response transfer bytes were collected from `Network.loadingFinished.encodedDataLength`. These include HTTP transfer overhead and all completed initial landing-page/code/portrait/audio/model requests. The server supplied `Content-Encoding: identity`; these are actual uncompressed transfers and still fit the compressed-asset ceilings. No hypothetical gzip saving is counted.

| Destination | Measured transferred MB (decimal) | Destination selection to playable | Budget | Result |
|---|---:|---:|---:|---|
| Australian coast / Green Island, first cold visit including landing page | 5.825 | 2.035 s | ≤15 MB initial | Pass |
| Caribbean / Buck Island | 2.180 | 1.386 s | ≤25 MB incremental | Pass |
| Antarctica / Casey | 2.776 | 1.391 s | ≤25 MB incremental | Pass |
| The Benwood / Florida Keys | 5.425 | 2.387 s | ≤25 MB incremental | Pass |
| Deep sea / Monterey | 1.363 | 1.112 s | ≤25 MB incremental | Pass |

The stricter first-load timing, **initial navigation through first playable Australia**, was **3.814 s**, below the ≤10 s target. Landing-page network settling took 1.750 s and transferred 2.356 MB. The script waits for a visible canvas and the loading overlay to disappear, then waits for network idle before totaling that destination's bytes. It records both Start-swimming click and destination-selection timings in JSON. The progress overlay was observed visible during every destination load. Five destinations rendered with no JavaScript page errors or non-canceled failed requests. Five destination-narration downloads were explicitly canceled as menu speech was superseded by starting play; their URLs and `net::ERR_ABORTED` status are retained in the report. Completed-response byte totals exclude partial bytes from canceled transfers, so they are not an exact wire-byte census. Console-error collection belongs to the separate rendering/browser suite; this release runner collects page exceptions.

The menu exposed all five exact catalog destination names in order, verified by an explicit assertion against its current `h2` headings. The initial map requested **zero GLBs**. Each later GLB request belonged to the selected destination or shared Elise; all exact model filenames are retained in the JSON. The map does load small representative portraits of all five places. Shared assets may be transferred again because the HTTP cache was deliberately disabled, making the incremental byte figures conservative. Application audio buffers may still be reused; this is not a claim of a second cold browser context for each destination. No external-origin requests occurred during the audit.

## Production boundary checks

The audit inspected every shipped client JS/HTML/CSS/JSON file, checked for credential-shaped strings and actual environment/local `.env` secret values without logging those values, and verified no dotenv files or source maps were bundled. No known secret or credential-shaped string was found. This is a bounded scan, not proof against every possible credential format.

There are **zero assignments to `window.__mermaidia` in production output**. One harmless cleanup reference (`delete window.__mermaidia`) remains; string presence alone is therefore not used as the pass criterion. The actual production page returned `typeof window.__mermaidia === 'undefined'` in all five destinations.

Requests for `/.env`, `/server/voice.ts`, and `/package.json` returned the HTML application shell through the SPA fallback, not the requested files. They contained neither known secrets nor server implementation. HTTP 200 here denotes the fallback shell, not file exposure. The long-lived server credential was never sent to a client or logged by this audit.

## Isolated install rehearsal

The unchanged-lockfile clean-install evidence was retained from 19:22 UTC; this final production-only rerun used `npm run test:release -- --skip-install`. In that actual rehearsal, `npm ci --no-audit --no-fund` ran from a new temporary directory containing only `package.json` and the exact project lockfile, with no existing `node_modules`. The normal npm download cache was allowed. It installed 290 packages in **2.080 s**, exited 0, and preserved lockfile SHA-256 `348652eca92fcda38f3d677b3fe79bc0425b16b5465eba8bd32f9e500ca83f73`. The temporary directory was removed after evidence capture.

Node v26.8.2 / npm 11.19.1 resolved React, Three.js, OpenAI, Vite, TypeScript and Playwright from that fresh install. Actual executable probes also passed: esbuild 0.28.2, Vite 8.3.0 and TypeScript 6.0.3. npm 11 reported that esbuild/fsevents install scripts were not on its allowlist; this was retained in the log. The platform binaries and tool probes worked without those scripts. No script-approval policy was changed.

This was a clean dependency-install rehearsal, not a fresh OS setup: Blender, Chrome and browser system prerequisites were already installed. Production build validation used the working repository with its generated local assets. A separate full repository clone/build was not represented as part of this install-only check.
