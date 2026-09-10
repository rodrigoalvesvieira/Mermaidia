# Mermaidia

Mermaidia: Make a splash and play with ocean friends!

Explore five 3D ocean destinations with Elise by speaking: “swim forward”, “go faster”, “go to the surface”, and “what is this fish?” Voice is the main play control; keyboard and touch are backups. Each ocean now spans 240 × 240 metres, with 25 populated encounter regions. Fifteen starting spots, narrated discoveries, a local journal and gentle activities are included. The wildlife starting choice jumps into an outer region. [Expansion details](docs/EXPANDED_WORLDS.md).

```sh
./scripts/bootstrap
npm run dev
```

Open **http://localhost:5173**. Live OpenAI voice control requires a server key. The shipped pack includes 85 reviewed Marin narration clips: no API key is needed to play them, use keyboard/touch controls, or hear ambient audio. Spoken controls default on: the page requests microphone permission, then immediately closes the permission-check track. Denying or leaving the prompt unanswered never blocks play. After authorized voice setup, listening starts automatically when play begins, stays connected across discovery cards and pauses, and renews during longer sessions. “Keep swimming” closes a card and swims; “resume” closes a pause without starting motion. Actual child cloud listening remains unavailable until the documented account controls are confirmed.

The app is an implemented local build under verification, **not a certified child-ready cloud release**. See [implementation status](docs/IMPLEMENTATION_STATUS.md), [QA evidence](docs/QA_REPORT.md), and [voice readiness](docs/VOICE.md) for actual passes, limitations, and unavailable live checks.

## Run and verify

```sh
npm ci
npm run doctor
npm run assets:validate
npm run content:validate
npm run typecheck
npm run lint
npm test
npm run build
npm run start
```

`npm run start` serves the production build at the same local URL; stop the development server first. `PORT` changes the port; set matching `APP_ORIGIN` for voice APIs. The server binds loopback by default and does not publish a site.

```sh
npm run test:e2e       # Chromium journeys plus Firefox/WebKit core checks
npm run test:visual    # saved scene screenshots
npm run verify        # required non-live build/content/assets/unit/browser checks
npm run test:voice:live
npm run test:release    # after build: actual production load/security + clean npm ci
```

For adult local voice play, add `OPENAI_API_KEY` to the ignored `.env`, set `ALLOW_ADULT_VOICE_DEV=true`, restart the server, allow the browser microphone prompt, then choose an ocean and click **Start swimming**. Listening starts automatically with no extra in-game checkbox, and the welcome caption does not delay it with narration. An empty key is reported explicitly in the voice control and settings. The key never goes in client code. `gpt-4o-mini-transcribe` streams microphone audio over WebRTC; common commands apply immediately after their finalized transcript without an extra interpretation request. Actual latency is measured only by the live runner.

The 85 shipped Elise narration clips were generated with `gpt-4o-mini-tts`, the `marin` voice and original warm, playful delivery instructions. They speak only reviewed game text, with no character or performer imitation, and play locally without a key. A server key is needed only for live voice controls or generating new narration: `npm run narration:build` updates the reviewed pack, and the server can generate missing reviewed lines on demand. Grown-up settings identify the playback path; the local narration pack now contains Marin audio too. All clips pass checksum, format and loudness checks; human listening quality remains unverified. See [narration and actual generation evidence](docs/NARRATION.md).

Live voice testing is separately gated and records BLOCKED without configured credentials. It never treats mocked transcripts as speech recognition. [Voice setup](docs/VOICE.md) explains the real WebRTC transcription path, server-side Astra interpreter, adult synthetic fixtures, and child deployment prerequisites.

For isolated hardware measurements, run `npm run build:test` and `ALLOW_ADULT_VOICE_DEV=false npm run serve:test` (port 5174), then `npm run test:performance` alone. It takes about 16 minutes and uses installed Chrome in headless mode with native GPU support, records the actual adapter, and rejects software rendering. Cloud listening is disabled only in this isolated benchmark; real speech uses its separate live test. Use `TEST_URL=http://localhost:5174 npm run test:e2e` against the same fixed snapshot. These test builds expose diagnostics and a context-loss test control; normal production builds do not.

## Authoring

All production 3D models and their rendered portraits are original Blender output. The decorative 2D menu reef is original AI-generated artwork; its prompt, source image, conversion and provenance are recorded in [menu art](docs/MENU_ART.md). The included assets are sufficient to play; Blender is needed only to rebuild the 3D artwork.

```sh
npm run assets:build
```

Set `BLENDER_BIN` if Blender is outside PATH or the standard macOS application directory. The bootstrap script reuses Homebrew on macOS or apt on Linux, retains the existing Node runtime, installs FFmpeg/eSpeak NG and Playwright browsers, and never downloads a remote shell installer. Linux package installation may require sudo. Optional three-view contact sheets use Pillow: `python3 scripts/blender/contact_sheets.py`.

Assets use meters, glTF Y-up and -Z forward. Read [art direction](docs/ART_DIRECTION.md), [content contracts](docs/CONTRACTS.md), [habitat research](docs/HABITAT_RESEARCH.md), and [reference index](docs/REFERENCE_INDEX.md). References are not shipped media licenses. Audio includes synthetic narration, original ambience, and a real CC0 rail recording excerpt with [item-level provenance](docs/BIRD_AUDIO.md). [ATTRIBUTIONS.md](ATTRIBUTIONS.md) and in-app grown-up credits are generated from the audited asset registry.

## Controls

- Up/W swims; Space increases speed; Down/S stops. Left/Right or A/D turns. Swimming starts at 2 m/s, then accelerates to 3.2 and 5 m/s; “go faster” selects the same levels. Speed also affects surface/discovery travel.
- Q/E glides sideways; R/F moves vertically. U visits the surface.
- `?` (Shift+/) or `/` opens the nearby highlighted discovery. Escape closes or pauses; J opens the journal.
- Large onscreen buttons provide the same actions. Voice examples include “swim forward”, “turn right”, “go right”, “stop”, and “go to the surface”. Navigation stop keeps listening active; Stop listening closes the microphone.

The grown-up view contains sound, captions, reduced motion, quality, default spoken-control preference, privacy notes and local progress reset. Only settings, journal IDs, activity IDs and valid starting spots are saved in `mermaidia-v1` local storage. No names, transcripts, recordings or analytics are retained by this application.

## Evidence

Generated evidence is in ignored `artifacts/`: screenshots in `visual/`, art contact sheets in `art/`, asset/content validation JSON, unit and browser reports, audio audits, performance tours and release audit. Run the documented scripts to reproduce it. [Toolchain](docs/TOOLCHAIN.md) records actual installed versions. [Parent test script](docs/PARENT_TEST.md) is a future supervised check, not a claim that a child study happened.
