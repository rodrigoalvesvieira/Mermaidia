# Mermaidia V1 — executable build prompt

This document is the implementation brief for a new Codex session in this repository. Read it completely, then build and verify the game. It is intentionally more specific than a product pitch. Research and documentation references were checked on September 10, 2026; recheck changing APIs and installation requirements when implementing.

## 1. Your assignment and working agreement

Build **Mermaidia**, a beautiful, single-player, browser-based underwater exploration game for children around five. The player is **Elise**, an inquisitive mermaid with dark hair. Deliver a working V1 with rich, animated 3D marine environments, spoken navigation, nearby-object discovery cards, surface exploration, ambient audio, and gentle reasons to keep exploring.

Execute the work, including installing all necessary development, asset-production, browser-testing, and runtime dependencies. Do not stop at a scaffold, a design document, a static mockup, a single generic aquarium, or a narrated video. This file is the plan; the next session's job is implementation.

- Inspect the repository, applicable `AGENTS.md` files, available tools, and installed programs first. Preserve existing user changes. At planning time the repository contained an empty `README.md` and no application code.
- Make routine engineering and art decisions autonomously. Use the defaults below when an answer is absent. Ask only for genuinely missing credentials, required permission, or a material decision that cannot be inferred. Continue independent work while a blocker is unresolved.
- Install dependencies rather than handing the user a shopping list. Respect sandbox approval requirements. Never install through unreviewed remote shell scripts, overwrite a working system toolchain, or fabricate a successful installation.
- Use multiple development agents for bounded, independent tasks when useful. Section 15 defines ownership and integration rules. Development agents are not autonomous characters running inside the game.
- Work through the milestones in section 16. Keep `docs/IMPLEMENTATION_STATUS.md` current with completed work, next steps, evidence, and real blockers so another session can resume.
- Use research and existing imagery to inform original or properly licensed assets. Do not treat AI output as scientific evidence.
- Build the complete local experience even if API access is unavailable. Implement the real cloud integration behind its adapter and configuration, test what can be tested, and explicitly distinguish an unavailable live test from a pass. Cloud voice remains a V1 requirement; a fallback is not evidence that it works.
- Do not publish, buy media, sign up for paid services, or upload private recordings as a side effect of development. Local build and test work is authorized by this brief.

## 2. Product promise and visual direction

The experience should feel like gently swimming inside an illustrated nature documentary: dimensional, richly lit, alive, inviting, and based on recognizable real animals. Elise is a fictional guide through an evidence-based natural world. Her magic explains comfortable underwater exploration, never invented wildlife facts.

Use a third-person follow camera so Elise's dark hair and tail are visible. Give her an original, age-appropriate design with a comfortable swim top, expressive face, and attractive tail. Default to a teal tail with subtle iridescence; do not imitate a franchise character. Animate idle floating, relaxed swimming, faster swimming, turns, looking toward discoveries, and surface bobbing. Hair and tail should respond gently to motion without obscuring her face or the view. Express curiosity through looking, pointing, and occasional short observations such as “I wonder what lives here?”

Use layered reef geometry, identifiable animal silhouettes, appropriate textures and materials, restrained water particles, depth-dependent color, convincing scale, moving light where appropriate, and species-specific movement. Avoid a final scene made mainly of colored primitives, identical fish with different colors, a flat blue backdrop, photographic billboards pretending to be animals, or unreviewed generated textures depicting invented anatomy. Procedural Blender modeling is welcome when its final result meets the visual and evidence requirements.

The child should quickly understand three things: choose a place, swim, and ask about what they find. Keep developer concepts, API/model names, performance statistics, source-license metadata, and configuration out of normal play. Put those in parent/developer views and documentation.

## 3. V1 scope: five compact, complete destinations

Implement all five destinations below. Each should be a deliberately composed small explorable world, not an attempt to simulate an entire ocean. Build the Australian reef first as the quality benchmark, then reuse the engine and pipeline to complete the others. All destinations are available at the start. Do not ship locked or “coming soon” cards as completed environments.

| Destination | Required experience | Scientific and geographic boundary |
| --- | --- | --- |
| Australian coast — Great Barrier Reef | Sunlit coral garden, sand channels, supported seagrass zone, reef-edge view, turtles/fish/invertebrates, surface birds and a sandy shoreline view | Select a documented reef/island subregion before choosing the final roster. Verify that the selected species, shore, and seagrass occur together. |
| Caribbean — Buck Island / St Croix | Distinct Caribbean reef forms, locally documented fish and invertebrates, shallow coastal habitats, surface and beach view | Use Caribbean evidence and local species. Do not reuse an Indo-Pacific clownfish scene with a different title. |
| Antarctica — coastal ice | Cold-water seafloor, plankton/krill where supported, documented Antarctic animals, ice underside, accessible open water, surface ice and locally appropriate birds | Select one named coastal region and season. Never mix Antarctic animals with Arctic polar bears or assume all penguins live together. |
| Shipwreck — Benwood, Florida Keys | A recognizable, evidence-based wreck exterior with documented structure, marine growth, local wildlife, and a surface view | Label it Florida Keys. Use site surveys/photos; do not invent an intact pirate ship, treasure chest, or relocate it to the Caribbean. No interior maze or distressing history in the child flow. |
| Deep sea — Monterey Bay midwater | Actual deep-water exploration with depth-zoned animals, suspended particles, gentle marine snow, documented light behavior, and a supported path to the local surface | Distinguish deep midwater from the seafloor. Do not put reef coral, sunbeams, beach plants, or every deep animal at one depth. |

These are bounded interpretations of documented places, not claims of survey-accurate digital twins. Record geographic compression and art adjustments in the habitat notes. A nearby shoreline may be represented as a separate coastal zone connected by a short transition when literal scale is impractical.

Each destination must have:

- At least **six distinct, evidence-supported biological entries**, with at least **24 distinct taxa across the entire game**. Shared species count once globally. A supported genus/group label is acceptable when the evidence cannot justify species-level identification; do not inflate counts with color variants or individual instances.
- At least two discoverable non-animal subjects such as seagrass, algae, rock, sand, ice, reef structure, or wreck structure. These may overlap with biological entries where appropriate, but never count a nonliving feature as a species.
- At least three visually distinct landmarks or small subzones, three optional curiosity activities, and three explicit starting points: an easy introduction, a wildlife encounter, and an appropriate surface/depth/landmark location.
- A guaranteed nearby discovery on the easy route within about 30 seconds at the slow default speed, with other encounters visible along the next minute of travel. Do not scatter everything randomly and hope it is found.
- A seamless or gently transitioned surface experience with sky, waves or ice/open-water conditions, and locally supported surface wildlife. At least the Australian and Caribbean destinations show a beach; Antarctica shows an appropriate ice/coastal scene.
- At least two observable animal behaviors, for example schooling, grazing, fin propulsion, a turtle surfacing, a bird landing, or a documented jelly swimming pattern. Behaviors must fit the actual organism and location.

Deep water requires an explicit travel design. Separate rendered movement coordinates from scientifically meaningful depth metadata if distances are compressed. “Go to the surface” from deep water starts a short, cancelable ascent journey with a soft transition through depth zones and arrival at a valid surface spawn. Announce “Let's visit the surface!” Do not imply a real animal follows Elise across incompatible depths or require a child to hold a button for twenty minutes. In Antarctic ice, route to an opening before surfacing; never move through solid ice.

Out of scope for V1: multiplayer, combat, survival, breeding/economy systems, ads, purchases, competitive leaderboards, an infinite procedural ocean, VR, open-ended chatbot conversations, and a global ocean-scale seamless map. Native mobile apps and full land walking are also outside V1. Responsive touch controls in the browser are included.

## 4. Child experience, agency, and engagement

The opening screen prominently shows Elise and large illustrated destination cards. Selecting a destination reveals three pictured starting spots, with a welcoming default. “Start swimming” begins quickly; do not make reading, microphone access, or an account prerequisites.

Use a warm English voice and short, readable captions. Give visual demonstrations for swimming and the question button. The first minute should include choosing a start, moving, and discovering one subject. Explanations should generally be one or two short sentences, approximately 15–35 words, with one concrete idea at a time. Scientific names belong in an optional grown-up detail area.

There is **no danger to Elise or the player**: no health or oxygen meters, drowning, freezing, pressure damage, attack behavior, jump scares, game-over screens, loud alarms, punishment, time limits, or losing progress. Predatory species may exist if depicted calmly and accurately, without a hunting sequence. Do not falsely teach that real wild animals are safe to touch; Elise observes at a respectful distance.

Use soft collisions and gentle steering around reefs, animals, wrecks, and ice. Prevent getting stuck or leaving playable water. Provide a large home/map control and a simple “take me back” voice command. Pause and help are always accessible.

Create a local **discovery journal** with picture-based entries and optional narration. Finding something adds an illustration/sticker without capturing, feeding, collecting, or removing wildlife. Revisit entries anytime. Examples of optional activities: “Find something that waves,” “Watch a turtle swim,” and “Look above the water.” Verify each activity's subject exists in its destination. No forced sequence; free exploration always remains available.

Celebrate discoveries briefly with a soft visual flourish and quiet cue. Use no streaks, random paid rewards, guilt about leaving, or pressure to play longer. An idle prompt may offer one gentle suggestion after roughly 45–60 seconds, with a cooldown and an off switch. Never repeatedly talk over a quiet child.

Persist only local game settings, journal IDs, optional activity progress, and valid last-start information using a versioned schema. Recover from malformed storage. Allow a parent to reset progress. Returning to the game should be easy without a name, login, or identifying profile.

Provide keyboard and large touch alternatives for every essential action. Aim for at least 56 CSS-pixel primary hit targets, visible focus, readable contrast, and usable layouts at 1280×720 and 768×1024. Text, shape, and icons should accompany color signals. Offer reduced motion, subtitles, and independent narration/ambience volume settings. Camera roll, head-bob, and strong motion blur are off. Respect reduced-motion preferences and avoid flashing effects.

## 5. Evidence-first content and terminology

Use **marine life** for living things, **habitat** for where they live, **seafloor/substrate** for surfaces such as sand and rock, and **features** for other discoveries. Internally use categories such as `animal`, `plant`, `alga`, `fungus_or_microbe`, `geological_feature`, and `human_made_feature`, plus tags. Coral is an animal; seagrass is a flowering plant; kelp is algae; rocks and ice are nonliving. A reef can be a habitat/structure whose living corals have their own entries. Verify these explanations against science sources before publishing cards.

Before modeling each identifiable species or named feature:

1. Find authoritative location/ecology evidence and inspect photographic or audiovisual references. Prefer field observations, research institutions, local park agencies, NOAA, AIMS/Reef Authority, NPS, Australian Antarctic Program, MBARI, and museum collections.
2. Use National Geographic and BBC/Blue Planet materials as audiovisual references when accessible. Identify the actual article/episode/clip and timestamp used; their names alone are not citations. Cross-check species and location claims with science/local sources. Record inaccessible or paywalled materials as unavailable rather than pretending to have inspected them.
3. Record geographic occurrence, supported depth, season when relevant, substrate, body proportions, adult/juvenile state, markings, approximate real size, locomotion, and at least one observed behavior. Use multiple views when available.
4. Write the child-facing facts in original language. Associate every factual sentence with evidence IDs. Separately record which evidence supports the visual identification and the habitat placement; a global species range alone is weak evidence of a local encounter.
5. Review the model against the references from side/front/three-quarter views and in its actual habitat lighting. Check fins/limbs, tail/body form, markings, scale, movement, and distribution. Fix uncertainty by using an honestly broader label, replacing the subject with a supported one, or omitting the unsupported claim.

Require at least one authoritative ecology/location source and one inspected visual source per biological entry; they may be from the same institution. Use two independent factual sources for surprising or potentially conflicting claims. For a wreck, record source date and distinguish its present remains from reconstruction. For deep-sea footage, record dive/depth context when provided; research-light illumination is not evidence that the habitat is naturally bright.

Do not claim that generated assets are non-hallucinated merely because a prompt mentioned real species. The assurance is the reference trail, constrained construction, visual comparison, and review. Clearly describe the result in grown-up credits as an artistic reconstruction based on evidence. Accessibility lighting or compressed travel is allowed, but log it and avoid presenting it as a biological fact.

### Content and rights records

Create machine-readable content with runtime validation. At minimum define these conceptual records; refine the TypeScript/Zod structures before parallel implementation:

```ts
type SourceRecord = {
  id: string;
  url: string;
  publisher: string;
  title: string;
  accessedOn: string;
  locator?: string; // section, figure, dive, clip timecode
  supports: string[];
  inspected: boolean;
};

type AssetRecord = {
  id: string;
  localPath: string;
  sha256: string;
  creator: string;
  originUrl?: string;
  licenseIdOrTerms: string;
  licenseUrl?: string;
  attribution: string;
  modifications: string[];
  distribution: 'approved' | 'reference_only' | 'blocked';
  evidenceIds: string[];
  buildRecipe?: string;
};

type DiscoveryRecord = {
  id: string;
  commonName: string;
  scientificName?: string;
  category: string;
  childSentences: { text: string; evidenceIds: string[] }[];
  visualEvidenceIds: string[];
  assetId: string;
  narrationAssetId: string;
  habitatPlacements: {
    habitatId: string;
    zoneIds: string[];
    evidenceIds: string[];
    realDepthM?: [number, number];
    season?: string;
  }[];
  realSizeM?: [number, number];
  visualAdjustments: string[];
};
```

Also define `HabitatDefinition`, `SpawnDefinition`, `ActivityDefinition`, `EntityInstance`, and `VoiceCommand` as shared contracts. Habitat records carry location, season, depth zones, allowed discovery IDs, safe bounds, surface route, spawns, landmarks, lighting/audio configuration, evidence, and documented spatial simplifications.

Reference access is not redistribution permission. Keep documentary footage, photographs, sounds, and 3D models out of shipped assets unless their exact rights allow the intended distribution and modification. Do not rip Blue Planet music/video, remove watermarks, bypass access controls, or infer permission from a search thumbnail. Check item-level terms, including third-party credits on government and research sites. Prefer original models and sound design, CC0/public-domain assets with verified status, or suitable attributed licenses. Avoid licenses that conflict with the intended use; request a decision only if a particular paid/restricted asset is essential and no suitable replacement exists.

Keep evidence links and notes separately from distributable media. Generate `ATTRIBUTIONS.md` and in-app grown-up credits from the asset registry. The asset audit fails on missing provenance, unknown rights, missing files/checksums, or any `reference_only`/`blocked` asset included in the production bundle. This includes textures, HDRIs, audio, fonts, images, and downloaded models. Links to references do not confer rights to copy them.

## 6. Stack and reproducible installation

Default to **TypeScript + React + Vite + Three.js**, using React Three Fiber/Drei if compatible versions simplify the scene implementation. Use React for menus, accessible overlays, and journal views; keep per-frame simulation out of React state. Use a small Node/TypeScript server for protected OpenAI calls and local production serving. A monorepo or a single package with clearly separated client/server directories is fine; do not introduce unnecessary infrastructure.

Use **Blender → glTF/GLB → Three.js/WebGL2** for the authored 3D asset pipeline. Use **Astra plus a separate Realtime audio integration** for optional connected interpretation, described in section 9. Rendering, collisions, wildlife motion, and ordinary command application run locally and never depend on model latency.

Install and record compatible versions of:

| Purpose | Default tools |
| --- | --- |
| Runtime/build | Supported Node release satisfying the selected Vite/tool requirements; npm with a committed lockfile; TypeScript; Vite; React |
| 3D | `three`, compatible `@react-three/fiber` and `@react-three/drei` if used, corresponding type packages |
| Server/content | `openai`, `zod`, a small server such as Express, necessary types and TypeScript runner/build tooling |
| Authoring | Blender with its bundled Python and glTF exporter; a dedicated Python virtual environment only for additional external scripts |
| Asset validation/optimization | Khronos glTF validator; glTF Transform CLI or API; matching decoder/transcoder support for any chosen compression |
| Tests | Vitest, Playwright and its needed browsers, accessibility checks such as axe, lint/format tooling |
| Audio processing | FFmpeg if used for conversion, loops, and loudness checks |

At the time this prompt was written, Node `v26.8.2` and npm `11.19.1` were on PATH; `blender` was not. Do not assume that a missing command means the application is absent: inspect standard Blender application locations and support a `BLENDER_BIN` override. Do not depend on the original user's absolute paths.

Before installing, check the current primary documentation and package compatibility. Resolve versions once and pin them in the lockfile and `docs/TOOLCHAIN.md`. Do not use floating `latest` downloads at application runtime or add incompatible React/Fiber versions with forced peer-dependency overrides. If the present Node version works, retain it; otherwise use a project-scoped/version-manager installation without replacing the user's existing runtime.

Provide an idempotent `scripts/bootstrap` entry point with macOS instructions and reasonable Linux support. On macOS, reuse Homebrew if available and use its Blender package only if needed; otherwise use the official distribution with checksum verification. Explain and request only actual permission boundaries. Blender is an authoring dependency, not something a player must install. Download browser binaries needed for tests and run their smoke tests. Detect unavailable GPU/browser prerequisites and report them explicitly.

Create these executable project commands, adapting their internals to the chosen structure:

```text
npm run doctor             # installed versions, assets, renderer and config readiness; no secrets
npm run dev                # client + API server, one documented local URL
npm run build              # production client/server build
npm run start              # serve the production build locally
npm run assets:build       # deterministic Blender generation/export + optimization
npm run assets:validate    # glTF integrity, references, rights, budgets
npm run content:validate   # schema, citations, placement, activities, narration links
npm run lint
npm run typecheck
npm run test               # deterministic unit/integration tests
npm run test:e2e           # browser flows and failure cases
npm run test:visual        # reproducible reference views
npm run test:voice:live    # separately enabled real-provider audio test
npm run verify            # required non-live checks, with useful failure summaries
```

Use `npm ci` for clean reproduction after the lockfile exists. Include only documented empty/example secrets in `.env.example`. Keep actual keys server-side and out of git, browser bundles, screenshots, logs, and parent UI. A no-key launch must succeed and explain voice availability in the grown-up settings. Do not leave the application waiting forever for credentials.

## 7. Architecture and game state

Use a deterministic simulation core with a fixed update step, bounded accumulated time, seeded scene randomness, and separate rendering interpolation. Cap catch-up after tab suspension. Express world scale consistently in meters, with a documented Blender/glTF/Three.js axis conversion and explicit mapping when educational depth differs from compact rendered coordinates.

Suggested structure (adapt when there is a clear benefit):

```text
src/app/                    menus, onboarding, journal, parent settings
src/game/                   simulation, camera, movement, collisions, transitions
src/render/                 environment, wildlife, materials, lighting, effects
src/audio/                  ambience, narration, mixing, lifecycle
src/voice/                  browser capture, provider adapters, command parsing
src/shared/                 schemas and pure commands shared with server/tests
server/                     session creation and Astra gateway
content/habitats/           evidence-backed location manifests
content/discoveries/        facts, taxonomy, placements, narration IDs
content/evidence/           inspected source records
assets/source/              original .blend files or reproducible source recipes
assets/manifests/           asset provenance and production inventories
public/assets/              approved optimized GLBs, textures, audio, thumbnails
scripts/blender/            generation, export, render and inspection recipes
tests/                      unit, browser, voice fixtures and visual scenes
docs/                       decisions, source/rights notes, status and QA reports
artifacts/                  ignored generated screenshots, videos and reports
```

Model application modes explicitly: choosing destination/start, loading, exploring, inspecting, journal, paused, and transitioning. Model voice readiness separately: off, needs setup, requesting permission, connecting, listening, processing, disconnected, and failed. Opening a card/journal or pausing stops Elise and clears pending movement; returning to play leaves her stopped until another command. Backgrounding the tab stops movement and microphone transmission. Return to a known valid spawn if recovery is needed.

For swimming, use a kinematic controller with a capsule or sphere, simple obstacle colliders, swept checks/substeps as necessary, and explicit water bounds. No full fluid simulation is needed. Keep the camera above/behind Elise with eased yaw, no roll, obstruction avoidance, and no clipping through reef or terrain. Soft boundaries guide the player back without a scary message. Animals steer around obstacles and respect their habitat/depth zones.

Dispose of scene geometries, materials, render targets, event listeners, audio nodes, and unused textures when switching destinations. Cancel obsolete loads and API results with scene/session generation IDs. Handle asset-loading failures, WebGL unavailability/context loss, resize, storage corruption, and network interruption with recoverable states. Do not silently show an empty scene as success.

## 8. Movement and discovery controls

Make voice primary when enabled, with identical command semantics across voice, keyboard, and touch. Provide visible examples and a large microphone control. Default to tap-to-start/tap-to-stop listening after grown-up setup; also provide hold-to-talk for noisy/shared spaces and a clearly indicated hands-free session. Use a brief listening cue and persistent microphone status that does not depend on reading. Do not promise speaker identification: another person's valid command can be recognized while listening is active.

Implement the following grammar plus natural paraphrases. Directions are relative to Elise's heading, not the world compass. “Turn right” changes orientation; “go right” moves sideways. Clearly demonstrate the distinction during onboarding.

| Spoken examples | Required deterministic result |
| --- | --- |
| “Swim forward”, “go ahead”, “let's go” | Swim forward at current speed until another motion command, stop, pause, or boundary intervention. |
| “Stop”, “wait”, “stay here” | Cancel motion and auto-travel immediately upon accepted command; remain hovering. |
| “Turn right/left” | Smoothly rotate heading 30 degrees over about 0.6 seconds; preserve preexisting forward swim, otherwise turn in place. |
| “Turn around” | Smoothly rotate 180 degrees at a comfortable capped rate. |
| “Go right/left”, “move to the right/left” | A short lateral move relative to heading, about 2 meters or 1.5 seconds, collision-constrained; keep heading and then hover. |
| “Go up/down”, “a little higher/lower” | Short bounded vertical movement within navigable water, then hover. |
| “Go to the surface”, “swim to the top” | Start collision-aware ascent to an accessible surface arrival; cancelable by stop or another movement command. |
| “Dive”, “go underwater” | From the surface, move to a shallow safe underwater waypoint; from depth, a short downward move. Never jump to a distant depth arbitrarily. |
| “Go faster”, “speed up”; “slower”, “slow down” | Change one level among slow/normal/fast with capped comfortable speed; do not start motion while stopped. |
| “Go to that turtle”, “look at the jellyfish” | Resolve only visible/recently highlighted valid entities; approach a respectful viewing distance, or ask a short clarification if ambiguous. |
| “What is that?”, “tell me about this” | Open the same discovery card as the question control for the current eligible target. |
| “Take me back”, “go to the start” | Return by a gentle transition to this destination's selected valid start. |
| “Pause”, “resume”, “close”, “open my journal”, “help” | Execute the corresponding bounded UI action; resume does not restart old motion. |

Start speed defaults near 0.8 m/s, normal around 1.2 m/s, fast at most 2 m/s; tune with camera and scene scale and record the actual constants. Faster swimming must never make the child lose control. A stop button/key remains immediate even when a network voice response is delayed. Support combinations such as “turn right and go forward” as an ordered, bounded sequence; “stop” overrides the sequence. For conflicting or unclear speech, stay still or preserve the current safe state and give one short clarification. Silence, unrelated non-command speech, “don't turn right,” and unrecognized words must not become movement. Navigation “stop” halts Elise while leaving the enabled listening session available for the next command; stopping voice is a separate explicit action.

Define a discriminated `VoiceCommand` union with bounded values and an envelope containing an ID, utterance ID, scene/session generation, and timestamps. Validate incoming model arguments. Deduplicate events; reject stale commands (default over 2 seconds after the finalized utterance, configurable), commands for an old scene, and unrecognized target IDs. The controller owns all motion; a model may never emit raw coordinates, executable code, arbitrary URLs, or unbounded durations. Choose one authoritative interpretation path per utterance so a transcript parser and a model tool call cannot both execute it.

The **question-mark key** must work as the user requested: recognize `event.key === '?'` including Shift+/ on US layouts; also allow unmodified `/` when not editing text as a discoverable convenience. Provide a large on-screen `?` button and keyboard help. Ignore game hotkeys in editable controls and respect modal focus.

Choose nearby targets using world-space distance from the subject's surface, camera visibility, line of sight, and centrality, with hysteresis so the highlight does not flicker between schooling fish. Group school instances by species when appropriate. Use a configurable generous radius around 4–6 meters for ordinary subjects, adjusted for large subjects. Highlight the eligible target subtly. Permit explicit pointer selection of a visible nearby object.

On `?`, stop Elise and open an accessible card with the subject's name, portrait/model preview, short sourced facts, and a replay-narration control. Freeze the selected identity even if the animal subsequently moves. Keep subtle environmental animation. Escape, Close, `?`, and voice “close” return to play without resuming movement. With no eligible target, show a friendly nearby-object hint rather than an empty card. Never identify an object solely from a model's visual guess when the game already knows its entity ID.

## 9. Astra and realtime voice/audio

The requested technologies have different roles. Current official documentation identifies `gpt-6-astra` as a text/image model without audio support, so use it through a server-side Responses integration for constrained language interpretation or reviewed content-authoring assistance. Use a separate audio-capable Realtime model for the live audio leg. Do not assume Astra itself accepts microphone audio. Revalidate these capabilities when building. [Astra model documentation](https://developers.openai.com/api/docs/models/gpt-6-astra)

Use browser WebRTC with a short-lived client credential minted by the backend, or the officially documented server-mediated session handshake. The long-lived API key belongs only on the server. As of the research date, the official WebRTC guide uses `gpt-realtime-2.1`; confirm actual account access and supported session configuration instead of silently changing the requested Astra component. [Realtime WebRTC guide](https://developers.openai.com/api/docs/guides/realtime-webrtc)

Serve microphone-enabled play over HTTPS or localhost. Request audio only; handle a permission prompt that remains unanswered without blocking other controls. Browser microphone permission and parent setup are separate concerns. [Browser microphone requirements](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)

Recommended V1 implementation:

1. `VoiceInputAdapter` receives microphone audio and exposes finalized transcription events through the documented Realtime transcription/session configuration. Select and document the supported audio/transcription model separately from `ASTRA_MODEL=gpt-6-astra`.
2. A local deterministic intent parser handles the common navigation vocabulary immediately after final transcription. Normalize punctuation and polite filler while preserving negation and word order. Do not execute every partial transcript fragment.
3. Only an unresolved navigation utterance goes to the server-side Astra adapter. Supply the command schema, a small allowlist of currently valid target IDs/names, and necessary state. Return a validated command, a clarification, or no action. Never let this request block rendering or local controls.
4. Route both paths through the same command validator and reducer. Keep per-utterance cancellation and deduplication. A newer stop invalidates earlier pending results.
5. Play concise preapproved acknowledgments and card narration. Optional Realtime voice output may render constrained acknowledgments, but must not produce unreviewed wildlife facts. For V1, pre-rendered narration of reviewed text is the reliable default.

If the selected Realtime configuration yields tool calls rather than finalized transcripts, document that alternative and use it as the single interpretation authority for that utterance; do not execute both paths. Base the adapter on the current documented event lifecycle, not invented API schemas. The official transcription guide describes separate transcription sessions and events. [Realtime transcription documentation](https://developers.openai.com/api/docs/guides/realtime-transcription)

Astra integration must be real: exercise its server adapter with an ambiguous navigation fixture and verify bounded structured output when a key is available. If unavailable, report that exact integration as unverified. Astra-assisted offline fact drafting still requires cited evidence and review. Do not send camera frames continuously or use any model for per-frame wildlife behavior.

Implement reconnect with bounded backoff, request cancellation, timeouts, rate limiting, same-origin protections, validated request sizes, and session limits. A token/session endpoint is not a public unlimited API proxy: check the application session, allowed origin, model/configuration allowlist, and voice enablement. Return only necessary short-lived material, and never log tokens or raw payloads. Enforce an application-side maximum connected session duration, default ten minutes, with an easy parent-controlled reconnect. Report usage estimates to parents when feasible; do not claim a precise spending cap from a client timer.

Mic permission denied, missing device, missing key, offline network, provider error, timeout, and session expiry must leave the game playable. Show one reassuring availability message and keep keyboard/touch controls obvious. A typed developer transcript console is useful for testing but must be labeled as such; it is not implemented speech recognition. Do not depend on browser `SpeechRecognition` as the only voice path or assume it processes audio locally.

### Child microphone data

This is a child-directed application, so treat microphone audio and free speech as potentially personal data. Parent setup explains when audio leaves the device and offers play without microphone access. Capture starts only after the explicit microphone action and required setup; stopping voice closes tracks and connections. Do not retain raw audio/transcripts, create voiceprints, request a child's name, or include speech in analytics, crash reports, URLs, journal storage, or source-control fixtures.

Before enabling cloud transmission for a child, verify the provider's current under-13 requirements and the actual account/endpoint controls. OpenAI's guidance requires zero data retention before processing personal data of under-13 children; it also calls for age-appropriate safeguards. A parent checkbox alone is not proof of provider-side retention configuration. [Under-18 API guidance](https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance)

OpenAI documents approval requirements for Zero Data Retention. `store: false`, an environment flag, and omitting application logs are not substitutes for approved account controls. Record the confirmed deployment configuration and endpoint compatibility in the grown-up setup documentation. Until that is established, disable child cloud audio server-side, allow adult/synthetic development fixtures, and finish the local experience. Do not call this a completed child-ready cloud release while the prerequisite remains unresolved. [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data)

This requirement must not expand V1 into an open-ended counseling/chat product. Keep voice limited to navigation and curated discovery interactions. Use short, preapproved responses for irrelevant requests. Keep any necessary parent-facing privacy/release notes concrete and proportional.

## 10. Blender asset production and rendering

Produce original Blender source files or fully reproducible Blender Python recipes for Elise, identifiable wildlife, plants/algae, terrain pieces, ice, and wreck components. Each biological model must point to its inspected references and dimensional assumptions. Reuse rigging and material tooling across species without disguising one incompatible anatomy as another.

Pipeline requirements:

1. Define units, forward/up axes, naming, pivots, bounding boxes, material conventions, and animation clip names. Bake procedural shading to supported PBR textures where necessary. Do not assume arbitrary Blender node networks survive glTF export.
2. Generate/model in Blender, apply required transforms and modifiers, construct usable UVs, author normals, rig where appropriate, and create cyclic animations. Use real geometric silhouettes and species-specific markings.
3. Export `.glb` with intended mesh, armature, animation, and material data. Use headless Blender with a Python error exit code so script failures cannot appear successful. Keep the source recipe, seed, and Blender version in the build manifest.
4. Run a glTF validator and content/asset validation. Check finite bounds, scale, normals, material/texture links, animation durations, required clips, skeletal deformations, and no accidental cameras/lights/hidden source collections.
5. Optimize with measured benefits: remove unused data, generate appropriate levels of detail, and use texture/mesh compression supported by the loader. Configure and locally serve the corresponding decoders/transcoders. Do not require every optional compression system at once.
6. Render reference views in Blender and load the actual exported file in a Three.js inspection scene. Check actual lighting, color, alpha/depth behavior, animation, and scale in the browser. The Blender preview alone does not validate the shipped asset.
7. Save a contact sheet for Elise and every species, alongside source IDs and review findings. Fix anatomy/appearance issues before increasing scene density.

Start with a command equivalent to the following, verifying flags against the installed Blender release. Its glTF exporter is bundled; a third-party exporter extension should not be necessary. [Khronos Blender glTF exporter](https://github.com/KhronosGroup/glTF-Blender-IO), [headless conversion example](https://github.com/KhronosGroup/glTF-Tutorials/blob/main/BlenderGltfConverter/README.md)

```sh
blender --background --factory-startup --python-exit-code 1 --python scripts/blender/build_assets.py -- --seed 4107 --output public/assets
```

Require zero glTF validation errors and review each unresolved warning. When enabling meshopt or KTX2, register the appropriate decoder/texture loader and detect renderer support before loading; test their local paths in the production build. [glTF Validator](https://github.com/KhronosGroup/glTF-Validator), [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html), [KTX2Loader](https://threejs.org/docs/pages/KTX2Loader.html), [glTF Transform](https://gltf-transform.dev/cli)

Use restrained water effects that survive low quality settings: believable underwater fog, color absorption approximations, surface waves, shallow caustic-like lighting, visible silhouettes, and depth-appropriate particles. The surface crossing must not cause a white flash, inverted water, a missing sky, or rapid toggling between sound/visual states. Use transition hysteresis and blend visual/audio state over a short interval.

Deep sea must remain welcoming and navigable without becoming a sunlit reef. Provide a gentle fictional observation light associated with Elise; identify it as an accessibility/art choice in parent notes. Only use emission/bioluminescence where supported for the subject. Avoid depicting every translucent animal as self-illuminating.

Support high/medium/low quality through pixel-ratio limits, fewer secondary particles, simplified water, cheaper shadows, levels of detail, frustum culling, and instancing for compatible school fish/vegetation. Preserve recognizable foreground wildlife and discovery usability at low quality. Keep approved game assets local; do not rely on hotlinked research websites during play.

## 11. Ambient sound and narration

Implement a managed Web Audio mixer with separate ambience, movement, wildlife, UI, and narration channels. Start/resume audio after a user gesture, provide mute and sliders, and respect browser lifecycle restrictions.

- Underwater: gentle water movement, subtle Elise swimming swishes, locally appropriate recorded/synthesized habitat texture, sparse justified animal sounds, and restrained UI cues.
- Surface: softly blended waves, wind when appropriate, and correctly identified local bird calls. Antarctic ice/open-water ambience and Monterey coastal ambience should sound distinct from tropical reefs.
- Depth: reduce surface sound and use a quiet, nonthreatening deep-water soundscape. Do not invent loud whale or fish calls as facts about unrelated species.
- Nearby moving fish may receive very subtle designed movement swishes for feedback; document these as sound design, not field recordings or proof that those fish make that noise.
- Loop smoothly, randomize intervals within bounds, use distance attenuation where useful, cap concurrent voices, and duck ambience under narration. Prevent the game's own narration from being reinterpreted as navigation, using echo cancellation and explicit narration/listening coordination.

Use licensed recordings or original sound design; preserve item-level provenance. Pre-render reviewed card narration and essential onboarding/command cues, using a permissible synthesis tool or original recordings. Ship these assets so the no-key game remains friendly to a pre-reader. Never clone a documentary narrator or imitate a named performer's voice. Browser speech synthesis can be an additional fallback but not the only way required narration works.

Verify there are no obvious loop clicks, abrupt crossing pops, missing decoded buffers, extreme volume differences, or digital clipping. Use a conservative mix and limiter; device volume prevents making universal physical loudness guarantees. Capture test output when possible and listen to representative loops and transitions using available audio tools. If listening is unavailable, label that part unverified instead of claiming it sounds good.

## 12. Performance and resilience budgets

Treat these as V1 engineering targets and report actual hardware/browser/settings with measurements. Do not use software-rendered CI timings to claim consumer GPU performance.

| Metric | Initial acceptance target |
| --- | --- |
| Main reference device | Available Apple Silicon laptop, Chrome, 1280×720, medium quality, bounded DPR; record actual model/GPU/browser |
| Sustained scene performance | At least 30 FPS equivalent at the 95th-percentile frame time (≤33.3 ms) over a warmed 60-second tour in every destination; aim for 60 FPS |
| Interaction dispatch | Accepted local command changes controller state within 100 ms; stop clears motion on the next simulation step |
| Cloud speech response | Aim for end-of-speech to visible action ≤1.5 s median and ≤2.5 s p95 on the measured connection; report recognition and interpretation latency separately |
| First destination load | Target ≤10 s on a 20 Mbps/80 ms throttled connection, with immediate progress UI and retry; measure first visit separately from cache |
| Initial network assets | Target ≤15 MB compressed for first playable destination; lazy-load other destinations |
| Destination size | Target ≤25 MB incremental compressed assets each; stream optional detail if necessary |
| Typical visible scene | Initial budget ≤200 draw calls and ≤500k triangles at medium quality, adjusted only with recorded performance evidence |
| Memory/resource lifecycle | No monotonic growth after five full destination cycles; after settling, tracked live textures/geometries/audio nodes return within 10% of comparable baseline |

Collect renderer counters, frame-time percentiles, loading timings, and approximate memory/resource counts in developer diagnostics, not the child HUD. If a target fails, optimize or revise the approach with evidence. Do not silently drop a destination, replace 3D wildlife with icons, or loosen budgets until a broken build passes. On unsupported WebGL, provide a friendly diagnostic/retry screen; this is not a substitute for the required 3D experience.

## 13. Verification: prove behavior as you build

Create `docs/QA_REPORT.md` and attach actual logs, screenshots, short recordings, measurements, and known limitations. A checked box without evidence is not a pass. Separate `automated`, `agent inspected`, `live provider`, and `human usability` results. Repeat checks after relevant changes, rather than running everything endlessly or testing only at the end.

### A. Pure logic and contract tests

- Test every command intent and at least 60 natural-language cases covering paraphrases, polite filler, negation, stop priority, compounds, ambiguous entities, silence/noise text, out-of-domain requests, and malformed model output. Assert resulting state and motion, not just parser return strings.
- Under different render rates and large frame gaps, movement is frame-rate independent, finite, bounded, and collision-safe. Test surface routing under ice, deep-water travel cancellation, obstacles, scene switches, and return-to-start.
- Test duplicate utterances, out-of-order callbacks, stale commands, pending Astra responses after stop, and callbacks for an old scene. One utterance produces at most one execution path.
- Test discovery selection through/behind obstacles, several nearby animals, large subjects, no eligible subject, moving/despawned subjects, modal focus, and literal `?` keyboard behavior.
- Test local-save migration/corruption/reset and activity completion without collecting animals.
- Test content schemas and cross-references: source inspection, facts with evidence, allowed habitat/depth placements, valid start points, valid activity targets, asset rights, narration files, and complete destination/entry counts.

### B. Browser end-to-end tests

Use Playwright against the running app and production build. Test Chrome/Chromium as primary and Firefox/WebKit for supported core behavior. Note that Playwright WebKit does not prove real Safari microphone behavior.

1. Launch without credentials; select each of five destinations and all three starting spots. Assert that the intended habitat is loaded, Elise is present, and each spawn is valid in water with a reachable discovery.
2. Swim, turn, go sideways, change speed, stop, surface, dive, and return. Assert pose, position, navigation state, and surface state using narrow test-only instrumentation; do not infer movement from a toast alone.
3. Approach a known subject, press actual `?`, verify the correct fact card and source-backed text, play narration, close, and verify stopped movement. Repeat using touch/on-screen controls.
4. Complete an optional activity, confirm the journal updates, reload, and verify local persistence. All destinations remain freely selectable.
5. Deny microphone permission; inject network/session/model failures; verify controls and exploration still work. Test retries and recovery without duplicating sessions.
6. Mock malformed and delayed provider events to prove cancellation/validation. Verify no long-lived API key is exposed in built client assets, browser storage, console, request URLs, or error payloads. Keep necessary short-lived browser session credentials in memory only and out of logs/storage.
7. Verify no microphone/network audio before opt-in, and no live track/transmission after explicitly stopping voice/listening, leaving play, or tab backgrounding. Navigation “stop” must still allow the next spoken instruction. Cloud child mode must remain disabled when deployment readiness is absent.
8. Resize, use keyboard focus through menus/modals, test reduced motion and sound settings, force a missing asset/context-loss case, and repeat habitat switching.

Test hooks must be dev/test-only, narrowly scoped, and excluded or disabled in production. The tests still exercise the rendered application and normal handlers. Directly setting final state is not a navigation test.

### C. Actual speech and audio checks

Maintain a reproducible, rights-cleared set of adult/spoken or synthetic audio fixtures with their expected commands, not recordings of children. Feed real audio through the browser capture path using a supported fake microphone device and through the configured live provider when credentials permit. Include clear commands, natural variations, pauses, mild background ambience, and ambiguous speech. Label synthetic/adult evidence accurately.

- Exercise at least 30 utterances through the full audio → transcription/interpretation → controller path; require ≥90% correct intended outcomes on this documented fixture set, 100% stop success on clear stop fixtures, and zero movement on the chosen silence/unrelated/negated fixtures.
- Separately test the Astra fallback with unresolved but valid navigation requests, and show that stale or malformed results cannot move Elise.
- Record end-of-speech/action latency, model IDs, test date, network conditions, fixture type, sample count, and failures. Do not report an injected transcript or mock provider response as a live speech test.
- Exercise narration while listening and confirm it does not trigger commands. Test permission dismissal, unplugged/unavailable mic, connection expiry, and user cancellation.
- Use a real adult microphone in a headed browser if authorized and available. If not, mark actual device capture unverified even if fake-device audio succeeds.

Adult/synthetic accuracy cannot establish five-year-old speech accuracy. Provide a short supervised parent/child test script for later, with consent and appropriate data controls, without recording a child by default. A human should be able to observe whether the child can choose a start, navigate, stop, surface, and inspect something with little help. Do not claim that this human study happened if it did not.

### D. Visual, ecological, and audio inspection

Use deterministic seeds, fixed cameras/times, known assets-ready conditions, and fixed viewport/quality settings for screenshots. Disable only nondeterministic timing in the visual test mode; do not remove the effects or models being evaluated. Capture at least three views per destination (underwater, surface, and its signature landmark/depth), plus Elise close-up, a discovery card, journal, loading, and low-quality views.

Actually open and inspect the images. Look for readable Elise silhouette and dark hair, convincing 3D richness, species distinctions, fin/limb/body mistakes, impossible habitat mixtures, camera clipping, transparent sorting errors, missing textures, incorrect scale, blank frames, inaccessible cards, and an overly dark deep sea. Compare wildlife contact sheets with reference evidence. Automated pixel snapshots find regressions, but a baseline approved without inspection proves little. [Playwright visual comparison documentation](https://playwright.dev/docs/test-snapshots)

Use a 0–2 review rubric for each destination: composition/depth, wildlife identity/anatomy, movement, environmental plausibility, surface/depth transition, and child usability. Define 0 as broken/missing, 1 as recognizable but rough, 2 as polished/readable. Require no zeros and at least 10/12, with evidence notes and corrective actions; this is an internal art review, not scientific certification. Source audits must independently pass even if the art score is high.

Capture representative ambient/narration transitions and inspect both files and audible output where available. Check loop boundaries, decoding errors, clipping, correct bird/habitat provenance, narration clarity, and no unwanted feedback into navigation.

### E. Measured tours and independent review

Run a repeatable 60-second camera/player tour in each destination on the stated real rendering environment, followed by repeated destination switching. Save frame-time percentiles, draw calls, triangle counts, load sizes, and resource lifecycle data. Run a ten-minute exploration soak covering surface/deep transitions, repeated discovery cards, voice reconnects, and journal saves. Investigate uncaught errors and resource growth.

Have an independent development agent review the implementation against this brief and attempt to break the movement/voice/evidence assumptions. Resolve concrete findings and rerun the affected checks. Do not rely on an agent's “looks good” without inspecting the actual game artifacts.

## 14. Source starting points and research deliverables

Use the sources below as research starting points, not as a substitute for per-subject evidence or licenses. Open the specific pages you rely on, record supported claims and access dates, and follow to exact item records. Do not claim to have watched an entire archive. A comprehensive literature review is unnecessary; enough direct evidence to construct and review the selected V1 subjects is required.

Produce `docs/HABITAT_RESEARCH.md` with a roster table for every destination: subject, local occurrence evidence, depth/season, visual reference, behavior, planned asset, and uncertainty. Produce `docs/ART_DIRECTION.md` with reference-linked contact sheets and original Elise design decisions. Keep specific documentary clips in a reference index with item-level access and rights status.

Ecological and audiovisual starting points inspected during planning:

| Source | What it can support; what still needs verification |
| --- | --- |
| [Reef Authority — Great 8](https://www.gbrmpa.gov.au/learn/animals/great-8) | Australian reef candidates including anemonefish, giant clams, turtles, mantas, and Maori wrasse. Verify exact taxon, host relationships, and selected local subregion before modeling. |
| [NPS — Buck Island](https://home.nps.gov/buis/index.htm/park-brochure.htm) and [Buck Island animals](https://home.nps.gov/buis/learn/nature/animals.htm) | Caribbean elkhorn reef, turtles, brown pelicans, frigatebirds, and seasonal terns. Check the chosen season and avoid treating older population/conservation statements as current data. |
| [British Antarctic Survey — Antarctic wildlife](https://www.bas.ac.uk/about/education-and-schools/antarctic-wildlife/) | Reference material for krill, penguins, Weddell seals, seabirds, and other Antarctic organisms. A continent-wide page does not establish that all of them share the chosen coastal scene. |
| [NOAA — Benwood wreck](https://floridakeys.noaa.gov/shipwrecktrail/benwood.html) | The wreck lies between French Reef and Dixie Shoals in about 25–45 feet of water, with broken remains and a relatively intact bow. Follow the survey/360-degree links for structural references; inspect separate rights before using linked 3D data. |
| [MBARI — bloody-belly comb jelly](https://www.mbari.org/animal/bloody-belly-comb-jelly/) | *Lampocteis cruentiventer*, a North Pacific midwater comb jelly documented at 250–1,500 m and up to 16 cm. Use its anatomy and footage; distinguish a comb jelly from a true jellyfish. |
| [MBARI — Monterey Bay crown jelly discovery](https://www.mbari.org/news/scientists-discover-a-new-species-of-deep-sea-crown-jelly-in-monterey-bay/) | *Atolla reynoldsi* at 1,013–3,189 m, with distinctive coiled tentacles and without the usual long trailing tentacle. It belongs in an appropriately deep zone, not automatically beside every other deep species. |
| [MBARI — Animals of the Deep](https://www.mbari.org/education/animals-of-the-deep/) | Additional described deep-sea subjects and research clips. Select a coherent roster using actual depth/location evidence. |
| [National Geographic — underwater photography](https://www.nationalgeographic.com/photography/article/underwater-photos-gallery) and [corals](https://www.nationalgeographic.com/animals/invertebrates/facts/corals-1) | Captioned imagery and coral education/video references. Inspect exact images/segments; do not infer permission to ship them. |
| [BBC Earth — Blue Planet II](https://www.bbcearth.com/shows/blue-planet-ii) | Official clips and episode pointers including reef/deep topics for movement and composition study. Log the particular clip and timecode actually viewed; exclude disturbing sequences from child-facing material. |
| [NOAA Ocean Exploration — bioluminescence](https://oceanexplorer.noaa.gov/education/bioluminescence/) | Educational imagery/video and light-production context. Verify organism-specific luminous structures rather than applying glow to all deep animals. |

For reusable media, inspect exact credits and exceptions. NOAA describes reuse conditions and third-party limitations, and NPS media records carry item-specific credit information; these are starting points for the rights audit, not blanket licenses for everything linked from the sites. [NOAA Ocean Exploration FAQ](https://oceanexplorer.noaa.gov/faqs/), [NOAA image-use guidance](https://www.omao.noaa.gov/image-licensing-usage-info), [example NPS photo record and usage notice](https://www.nps.gov/media/photo/gallery-item.htm?gid=5BE124D6-1DD8-B71B-0B00-7D4B1AF89E2D&id=5d7d2159-1dd8-b71b-0bd2-d6bf68caacd9)

Technical starting points already consulted for this plan:

- [Vite getting started](https://vite.dev/guide/) — check current runtime requirements and installation instructions before selecting the toolchain.
- [Three.js documentation](https://threejs.org/docs/) — use the installed release's loader/material/renderer documentation.
- [Blender Homebrew cask](https://formulae.brew.sh/cask/blender) and [Playwright browser installation](https://playwright.dev/docs/browsers) — verify actual installation and browser binaries on the build machine.
- [Astra model documentation](https://developers.openai.com/api/docs/models/gpt-6-astra) — verify model modalities and supported integration.
- [Realtime WebRTC](https://developers.openai.com/api/docs/guides/realtime-webrtc) and [Realtime transcription](https://developers.openai.com/api/docs/guides/realtime-transcription) — use actual session/event contracts.
- [Under-18 guidance](https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance) and [data controls](https://developers.openai.com/api/docs/guides/your-data) — verify the actual deployment's child-audio prerequisites.
- [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots) — stabilize the environment and inspect captured results.

## 15. Beneficial multi-agent development

Use a coordinator plus up to three parallel workers when tools permit. Spawn only for a concrete task that can proceed while the coordinator does useful independent work. If parallel agents are unavailable, use the same division sequentially and continue.

Suggested first wave after contracts and the asset conventions are defined:

| Owner | Bounded responsibility | Reviewable output |
| --- | --- | --- |
| Coordinator | Bootstrap, shared schemas, simulation/controller, integration, milestone gates | Running vertical slice; tests and integrated architecture |
| Habitat/content worker | Per-place roster/evidence, facts, activities, asset rights records | Validated data and source notes; no invented species claims |
| Blender/art worker | Elise and first reference-backed wildlife/reef assets | Rebuildable sources, exported GLBs, actual renders, asset manifest |
| Voice/audio worker | Voice provider/Astra adapters, command fixtures, audio lifecycle and mixer | Tested adapters, configuration, audio assets with provenance |

Start the testing/UX review worker in a later wave when a runnable slice exists. Parallel habitat expansion can follow the proven asset/scene recipe. Do not let separate agents create five incompatible engines or schemas.

Give each worker explicit owned directories and agreed interfaces. The coordinator owns shared contracts, dependency manifests, lockfiles, and integration-sensitive root files. Workers propose dependency changes to the coordinator instead of racing to install. Share assets in predictable paths; do not overwrite another worker's files. Each handoff states changed files, commands run, evidence paths, unresolved issues, and integration assumptions. An agent completion message does not replace the coordinator's integrated tests.

## 16. Milestones with exit gates

Complete the milestones in order while parallelizing independent tasks inside them. Update status and keep the app runnable at every stage.

| Milestone | Implement | Required exit evidence |
| --- | --- | --- |
| 0 — Inspect and bootstrap | Repository audit, dependency installation, schemas, toolchain report, research roster, secret-safe config, tiny rendered GLB smoke test | Installed version report; browser opens app; Blender exports a valid asset; no user changes lost |
| 1 — Playable Australian slice | Elise, reference-backed reef assets, third-person swimming, collisions, one surface transition, nearby `?` card, sound and keyboard/touch | Actual browser screenshots/video; controller/card tests; one validated evidence/rights chain end to end |
| 2 — Voice end to end | Capture/session lifecycle, common commands, Astra fallback, cancellation, parent controls, failure modes | Deterministic cases pass; actual audio fixtures reach controller; live-provider/device results or precise blocked prerequisites |
| 3 — Five destinations | Full required rosters, landmarks, starts, surface/depth travel, signature visuals and sound | All five playable; content count/placement/license audits pass; contact sheets and scene captures inspected |
| 4 — Curiosity and accessibility | Journal, optional activities, onboarding, narration, touch/keyboard parity, reduced motion, local save | Browser journeys pass; all core play works without reading/microphone/credentials; supervised test script ready |
| 5 — Polish and reliability | Rendering/audio polish, load optimization, lifecycle fixes, cross-browser core checks, production serving | Performance and soak reports; no unresolved crashes, placeholder assets, or broken required journeys |
| 6 — Independent verification and handoff | Review against all requirements, fix findings, clean installation rehearsal, final documentation | Reproducible run/build commands; evidence-linked QA report; honest release/readiness status |

Do not substitute a technology demo for milestone 3. Do not spend the entire effort making one gorgeous title screen while movement, discovery, or other destinations remain unfinished. When a visual budget is tight, reduce background density before sacrificing identifiable foreground animals or interaction quality.

## 17. Definition of done and final handoff

Use this checklist in `docs/IMPLEMENTATION_STATUS.md`; link each item to its evidence rather than checking it automatically:

- [ ] A new developer can bootstrap, build assets, run `npm ci`, launch, test, and serve the production build using the README.
- [ ] All required dependencies were actually installed/verified, or an exact external blocker is documented without claiming completion.
- [ ] Elise is visibly dark-haired, original, expressive, animated, and inquisitive in a convincing 3D environment.
- [ ] All five destinations, fifteen selectable starting spots, required content counts, and signature surface/deep/wreck experiences work.
- [ ] Wildlife/plant/algae/feature identities, appearances, placements, behaviors, and child facts have inspected source evidence; shipped assets have approved rights.
- [ ] Spoken navigation and Astra fallback are implemented with bounded commands and tested through real audio/provider paths where access permits.
- [ ] Keyboard/touch fallbacks, actual `?` proximity cards, narration, journal, and optional curiosity activities work.
- [ ] Child-directed cloud audio deployment prerequisites are confirmed before child transmission is enabled; no child speech is stored by the app.
- [ ] Exploration is always safe, recoverable, and free of punishment, pressure, or frightening encounters.
- [ ] Distinct ambience, surface transitions, narration ducking, mute/settings, and microphone/audio teardown are verified.
- [ ] Required automated checks, inspected visuals, scientific/provenance audits, performance measurements, and the soak test have evidence.
- [ ] `README.md`, `.env.example`, `ATTRIBUTIONS.md`, toolchain, research, art, QA, and status documents accurately describe the actual result.
- [ ] There are no placeholder scenes or silent feature substitutions presented as finished work.

The final response should tell the user what works, the exact local URL/start command, where the evidence and screenshots live, and any remaining blockers or unverified human/device checks. Distinguish **implemented**, **automatically verified**, **live verified**, and **ready for children**. Never claim live speech recognition, scientific expert review, child usability testing, or successful dependency installation based only on mocks or intent.

Begin by inspecting the repository and setting up the toolchain. Then build Mermaidia through the milestones above.
