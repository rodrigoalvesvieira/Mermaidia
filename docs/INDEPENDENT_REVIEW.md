# Independent integration review

Reviewer: voice/audio development agent, September 10, 2026. This review is independent for the coordinator's game/controller/render/app/content integration. Review and fixes within voice/audio are explicitly self-review; no claim of independent expert, scientific or child-usability certification is made.

**Current result: functional core passes the exercised journeys; final visual polish and external voice/child deployment gates are not signed off.** Evidence: [regression tests](../tests/review.test.ts), [test results](../artifacts/review-unit.json), [actual browser journeys](../artifacts/review/browser.json), and [review screenshots](../artifacts/review/). Live voice remains [BLOCKED](../artifacts/voice/live-report.json) without credentials; no test audio was transmitted.

## What was actually exercised

An actual Chromium 153.0.8010.12 session at 1280×720 opened all five destinations from their normal cards, selected the easy start, pressed the literal `?` key, compared the displayed target with the opened card, closed it with Escape, swam forward and stopped. All five displayed the correct nearby subject; positions changed during swimming and motion returned to hover; there were no page errors. A 768×1024 capture and DOM measurements checked primary control sizes. This is automated adult/developer use, not a five-year-old usability study.

Seven regression tests exercise the real simulation and server. They verify turn-plus-forward ordering, bounds after collision projection, solid-ice exclusion after collision projection, surface arrival for every destination and all fifteen starting spots, rejection of coordinate-bearing model output, and malformed non-ASCII CSRF handling. Two simulation tests and the CSRF test initially failed and pass after fixes. The tests intentionally assert resulting positions/modes or real HTTP responses.

The final current content audit reports 39 discoveries, 29 biological taxa/group labels, five destinations, fifteen starts and 50 source records with zero machine-check errors. Inspection of the validator confirms that it checks referenced evidence/visual-inspection flags, approved asset relationships, allowed placements, activity IDs and nearby-start distances. Those flags and cross-links are evidence of a maintained review trail, not a machine proof of the scientific truth of every sentence.

## Findings and corrective evidence

| Finding | Severity | Result |
|---|---|---|
| Collision projection ran after boundary/ice clamps and could place Elise outside the allowed inset or above solid ice. A constructed under-ice collision produced Y=-0.6 where Y≤-1 was required. | Correctness | Fixed by coordinator; both explicit regressions now pass. |
| A compound “turn right and go forward” lost the turn because starting swim cleared pending rotation. | Correctness | Fixed by coordinator; simulation turns 30° while swimming in the regression. |
| Dominant generated reef rocks were missing from collision/line-of-sight geometry. | Correctness | Coordinator added static obstacle coverage; final collision constraints are regression-tested. Detailed collider/mesh alignment still needs visual traversal review. |
| Pointer selection used distance only and bypassed line of sight. | Correctness | Coordinator now routes pointer target acceptance through `selectTarget`; code inspected. |
| Partial GLB load failures via `Promise.all` could lose already-loaded resources. | Lifecycle | Coordinator changed to `Promise.allSettled` and tracks successful arrivals; code inspected. |
| Voice interpretation could override a newer manual movement because only manual stop canceled pending work. | Correctness | Coordinator now cancels pending interpretation on every command; scene envelope validation remains in the adapter. |
| Pause/settings did not close the microphone. | Privacy/lifecycle | Coordinator now calls `voice.stop()` for those modes; code inspected. |
| A malformed 48-character non-ASCII CSRF header raised a server exception instead of denial. | Robustness, voice self-review | Fixed in owned server by validating the hexadecimal token alphabet; actual HTTP regression returns 401. |
| Provider error only changed status, and obsolete reconnect continuations shared a generation. | Lifecycle, voice self-review | Provider errors now close capture; reconnect advances its generation and aborts the old request. Stop revokes the application session. Existing protocol/lifecycle suite passes. |
| Narration asset paths did not match the filesystem convention expected by the registry validator. Reused spawn IDs also overwrote starting-spot clips. | Integration | Fixed: `public/assets/audio/...` registry paths and `start-${habitatId}-${spawnId}` IDs. All 99 audio records pass hash/format audit and actual browser decode. |
| Hold-to-talk lacked a UI and its keyboard/focus-loss lifecycle needed parity. | Required journey | Coordinator added the control and keyboard/focus-loss teardown; code inspected. Live held capture remains blocked with provider credentials. |
| The microphone button measured 48 CSS pixels high at tablet size. | Accessibility | Coordinator increased the microphone hit target to 56 CSS pixels. Other measured movement/question controls were 56–78 pixels. |

## Visual inspection, with limitations

Actually opened: earlier landing/deep screenshots, the full asset contact sheet, second landing/reef/card captures, and all six fresh independent images in `artifacts/review`. The initial offscreen Elise problem was corrected before the review journeys. The card is readable, the dark-haired teal-tailed guide is original and visible in ordinary reef light, and the destination UI is usable.

The 17:56 UTC captures exposed material problems: the initial highlighted subject sat behind Elise's head, deep-water Elise and animals were too dark, and tropical/Benwood backgrounds shared a conspicuous suspended ellipsoid shoreline viewed from below. Antarctic geometry was readable but sparse and had a pronounced ceiling seam. A contact sheet demonstrates stylized recognizable silhouettes but is not sufficient to award polished wildlife anatomy and habitat scores.

The final review run captured and opened all fifteen underwater/surface/signature views in [artifacts/review/final](../artifacts/review/final/). All five actual surface journeys completed with no page errors, recorded in [final browser results](../artifacts/review/final/browser.json). Easy-start target offsets, less intrusive captions, neutral deep lighting and hidden underwater coast geometry materially improve readability. Deep midwater retains its dark water and no seafloor; its lit foreground subjects are now visible.

Remaining observed defects: the Australian surface arrival intersects the near sand ellipsoid, hiding Elise inside opaque land; wildlife/midnight starts can still put the selected clam/coral/big-red-jelly behind Elise; coast islands retain a conspicuous lens shape and identical tropical composition; ice and ship steel are visibly coarse geometric forms. These were sent to the coordinator with concrete screenshots and suggested corrections. Later fixes require a new corresponding capture, not a retrospective pass on these images.

Internal visual rubric on those captured revisions: 0 = broken/missing, 1 = recognizable but rough, 2 = polished/readable. This is an internal review, not scientific certification. Animation scores use rendered journeys plus animation-code inspection; no expert locomotion certification is implied.

| Destination | Composition/depth | Wildlife identity/anatomy | Movement | Environment | Surface/depth transition | Child usability | Total |
|---|---:|---:|---:|---:|---:|---:|---:|
| Australia | 1 | 1 | 1 | 1 | 0 | 2 | 6/12 |
| Caribbean | 1 | 1 | 1 | 1 | 1 | 2 | 7/12 |
| Antarctica | 1 | 1 | 1 | 1 | 1 | 2 | 7/12 |
| Benwood | 1 | 1 | 1 | 1 | 1 | 2 | 7/12 |
| Deep midwater | 1 | 1 | 1 | 2 | 1 | 2 | 8/12 |

**The required ≥10/12 visual gate is not passed by these captures.** The functioning educational prototype, clear UI and evidence trail are substantial; they do not by themselves establish the requested final documentary-like visual finish.

## Remaining verification boundaries

- Real-provider recognition and Astra account access, actual adult microphone capture, and child-speech accuracy are unverified. The live runner records a blocked result, not a pass.
- The user's later instruction requests an immediate local microphone permission preflight and enabled audio controls. The new `requestMicrophonePermission` helper requests audio only and immediately closes all granted tracks, including late grants after timeout/unmount; six dedicated tests prove those paths. This permission probe creates no cloud session and does not override the server's child-data gate.
- Provider child-data controls are not confirmed. Child cloud transmission remains hard-disabled regardless of the permission probe or a parent checkbox.
- Numerical/browser audio checks passed; audible warmth, loudspeaker feedback and local bird-call recordings remain unverified/missing polish. No third-party bird calls are silently fabricated.
- Human child usability and a marine-science expert review have not happened.
- Concurrent reviewer/browser work contaminated the first performance run as an isolated hardware benchmark. The coordinator treats it as stress/soak evidence and must rerun final performance tours without competing browser workloads.

## Revision 2 — fixed build, 18:17 UTC

This is an additive re-review of the coordinator's later camera, coast, reef-density and lighting changes. Earlier findings and scores above describe earlier captures and remain in the record. The first Vite run was interrupted by generated-file reloads; it is not used as final journey evidence. The completed run used the fixed test build at `http://localhost:5174`, Chromium, 1280×720, normal animation timing (no `?visual` freeze), and the normal destination/start/control UI.

Evidence: [completed journey results](../artifacts/review/revision2/browser.json), [all fresh images](../artifacts/review/revision2/), [recorded full browser session](../artifacts/review/revision2/video/page@7c99243f6019715476c096c02c4a8919.webm), [short Australian movement clip](../artifacts/review/revision2/australia-motion.webm), and [twelve successive half-second video frames](../artifacts/review/revision2/motion-sequence.png). All fifteen underwater/surface/signature images were actually opened. The reviewer also opened the extracted motion-frame sheet, deep forward/turn/stop frames and deep discovery card. Motion observations are based on these real sequential frames and resulting simulation snapshots, not merely the presence of animation clips in source code; continuous audiovisual playback and expert locomotion review are not claimed.

All five destinations completed forward → right turn → stop with changed position, a 30° heading change and final hover. All five surface routes completed. All five signature-start question cards opened with the intended identity: giant clam, elkhorn coral, Weddell seal, yellowtail snapper and big red jelly. No page errors were recorded. These are successful functional checks, distinct from the art rubric.

Confirmed corrections:

- Australian surface arrival no longer places Elise inside opaque sand. [Arrival](../artifacts/review/revision2/australia-surface.png).
- Shoulder framing separates the easy-start targets from Elise; the clam, seal and big red jelly are now visible beside her at their secondary starts. [Clam](../artifacts/review/revision2/australia-signature.png), [seal](../artifacts/review/revision2/antarctica-signature.png), [jelly](../artifacts/review/revision2/deepsea-signature.png).
- Reef colonies and layered terrain provide more foreground/middle-distance structure. [Australia](../artifacts/review/revision2/australia-underwater.png), [Caribbean](../artifacts/review/revision2/caribbean-underwater.png).
- Deep subjects and Elise are visible against dark midwater, with neither an invented seafloor nor a visible shallow-water ceiling. [Twilight](../artifacts/review/revision2/deepsea-underwater.png).

Remaining visual gate failures, based on the rendered result:

- Tropical surface views have a weakly readable water boundary: the reef and Elise's entire tail remain almost as clear as underwater, giving an airborne/dry-stage impression. The horizon is a low, visibly triangulated berm topped by evenly spaced identical horizontal palm crowns. Australia, Caribbean and Benwood reuse this conspicuous composition. Improve the actual above/below-water separation and the shape/material/spacing of the shoreline before calling these transitions polished. [Caribbean surface](../artifacts/review/revision2/caribbean-surface.png).
- Surface wildlife can still overlap Elise: the Caribbean and deep pelicans cover part of her head in these actual arrival frames. The Caribbean elkhorn target is crowded by foreground background-colony geometry. Review arrival framing and selected-subject contrast separately from underwater easy starts. [Deep surface](../artifacts/review/revision2/deepsea-surface.png), [elkhorn start](../artifacts/review/revision2/caribbean-signature.png).
- Australian colonies read as repeated pale ivory branching forms; Caribbean sea fans display a conspicuous regular wire grid. Rock and coral materials remain broadly uniform. The extra density improves depth but does not yet establish the reference-grounded material richness required by the plan.
- Antarctic ice retains a flat ceiling with hard seams and suspended faceted chunks. The surface opening is an exact rectangular slot bounded by thick flat slabs; the foreground slab hides most of Elise. This is recognizable ice, but still visibly schematic. [Underwater](../artifacts/review/revision2/antarctica-underwater.png), [surface](../artifacts/review/revision2/antarctica-surface.png).
- Benwood remains a repetitive tubular rib scaffold with smooth triangular panels and sparse surface detail. It is recognizable as a wreck scene, but does not yet read as convincing present-day corroded steel remains. [Signature view](../artifacts/review/revision2/shipwreck-signature.png).
- The movement frames show response, tail/arm pose changes and camera following, but Elise largely keeps a rigid upright torso, with small repeated appendage motions. Foreground animals have recognizable but simplified smooth bodies and flat fins. Awarding polished species-specific locomotion or anatomy from these observations would overstate the evidence.

| Destination | Composition/depth | Wildlife identity/anatomy | Movement | Environment | Surface/depth transition | Child usability | Total |
|---|---:|---:|---:|---:|---:|---:|---:|
| Australia | 2 | 1 | 1 | 1 | 1 | 2 | 8/12 |
| Caribbean | 2 | 1 | 1 | 1 | 1 | 2 | 8/12 |
| Antarctica | 1 | 1 | 1 | 1 | 1 | 2 | 7/12 |
| Benwood | 2 | 1 | 1 | 1 | 1 | 2 | 8/12 |
| Deep midwater | 2 | 1 | 1 | 2 | 1 | 2 | 9/12 |

The revision improves framing and removes the Australian clipping failure, so no category now receives zero. **No destination reaches the required 10/12: the visual quality gate remains open.** The usability score reflects readable controls/cards in this developer review, not a completed child study. No source, implementation or test code was changed for this review revision. All reviewer browsers were closed before the coordinator's isolated final performance measurements.

## Revision 3 — surface and authored environment fixes

The fixed `localhost:5174` build was reviewed again after the completed 23-test browser suite. The new run preserved normal animation and used the visible **Stop swimming** button: Space now accelerates per the user's later instruction. Evidence: [five complete journeys](../artifacts/review/revision3/browser.json), [fresh underwater/surface/signature images and cards](../artifacts/review/revision3/), [recorded session](../artifacts/review/revision3/video/page@ff8d81836ae0c18a2655395ca5aa32ad.webm), [successive movement frames](../artifacts/review/revision3/motion-sequence.png). All fifteen scene images and the movement-frame sheet were opened. All five journeys moved, turned, stopped at speed zero, reached the surface and opened the correct signature-subject card, with no page errors.

The stronger water surface now visibly submerges Elise's tail and the reef below her. Birds are separated from her head. Broadleaf shore silhouettes replace the identical pole-palms, while Benwood has an open offshore horizon. The Antarctic opening is an irregular continuous lead, with no slab hiding Elise. New sea fans have irregular branches and meshes. Benwood's authored flat, corroded steel, broken plating and irregular edges materially improve the wreck's identity and environmental richness. These changes correct the corresponding earlier defects; they are not carried forward as open failures.

The remaining fixable environment issue in these captures is visible surface uniformity. Australian and Caribbean rocks still look smooth and evenly colored; repeated coral colonies have little local surface variation. Antarctic ice has a broad flat underside, repeated faceted hanging forms and a uniformly colored stony floor. Texture, erosion and gentle ice relief are appropriate next corrections; adding unsupported biological subjects for visual density is not. Movement and wildlife remain readable but simplified, retaining their previous scores.

| Destination | Composition/depth | Wildlife identity/anatomy | Movement | Environment | Surface/depth transition | Child usability | Total |
|---|---:|---:|---:|---:|---:|---:|---:|
| Australia | 2 | 1 | 1 | 1 | 2 | 2 | 9/12 |
| Caribbean | 2 | 1 | 1 | 1 | 2 | 2 | 9/12 |
| Antarctica | 2 | 1 | 1 | 1 | 2 | 2 | 9/12 |
| Benwood | 2 | 1 | 1 | 2 | 2 | 2 | 10/12 |
| Deep midwater | 2 | 1 | 1 | 2 | 2 | 2 | 10/12 |

Benwood and deep midwater now meet this internal rubric's threshold. The other three remain below it, so the all-destination visual gate remains open for this revision. A narrow rubric pass does not imply expert anatomy certification, photorealism or a child-usability study.

A separate brief five-scene counter sample is recorded in [scene-stats.json](../artifacts/review/revision3/scene-stats.json). Peak draws/triangles were Australia 79/232,088, Caribbean 77/408,062, Antarctica 74/62,334, Benwood 120/373,278 and deep midwater 32/18,028. These sample counts fit the plan's limits, but this was an easy-start forward/right/stop sample, not an exhaustive tour. The renderer reported SwiftShader and the recorded frame times are **not** a hardware performance pass. All reviewer browsers and video extraction processes were stopped before the coordinator's next rebuild/performance work.

## Revision 4 — material-shader regression, 18:43 UTC

The content reviewer independently ran the fixed `localhost:5174` snapshot through Australian, Caribbean and Antarctic easy starts, forward/right-turn/stop actions, surface routes and signature starts. No build, implementation or asset changes were made. All nine underwater/surface/signature screenshots and the [successive movement frames](../artifacts/review/revision4/motion-sequence.png) were opened. The [recorded session](../artifacts/review/revision4/video/page@7ffd4068eacf513cf965e318f87fefaf.webm) and [browser results](../artifacts/review/revision4/browser.json) preserve the run. Motion inspection used captured sequential frames and snapshots; continuous audiovisual playback is not claimed.

**This snapshot fails the visual gate due to a real shader compilation regression.** Console collection recorded 28 shader-error messages even though the JavaScript `pageerror` list is empty. The injected GLSL declares `float patch`; `patch` is reserved, so the fragment shader does not compile. This affects limestone/rock, coral and ice material variants. The coordinator was given the exact error and suggested rename to a nonreserved identifier such as `reefPatch`.

Observed consequences:

- [Australian easy start](../artifacts/review/revision4/australia-underwater.png) and [clam start](../artifacts/review/revision4/australia-signature.png) render sand and grass but omit the expected branching coral and rocky habitat structure.
- [Caribbean signature start](../artifacts/review/revision4/caribbean-signature.png) shows a highlighted **Elkhorn coral** identity with an empty target ring. The sea fans remain visible, making the missing coral particularly clear.
- [Antarctic underwater](../artifacts/review/revision4/antarctica-underwater.png) and [surface](../artifacts/review/revision4/antarctica-surface.png) omit the main ice and seafloor surfaces, leaving animals against an almost empty water volume. The intended ice relief cannot be assessed while its material does not draw.

All three journeys still moved, turned 30°, stopped with speed zero, reached the surface and opened the expected named card (giant clam, elkhorn coral and Weddell seal). These functional successes do not excuse an invisible discoverable subject or absent environment. Under the specified rubric, the **environment score is 0 (broken/missing) for each of these three captured destinations**; a 1 or 2 would conceal the rendering failure. Other art categories are not rescored from this broken material revision. Benwood/deep were not rerun, so their revision-3 scores are neither independently renewed nor invalidated here.

A corrected snapshot must be recaptured and actually inspected before the material-polish improvement can receive credit. Future render checks should fail on shader-related console errors as well as JavaScript exceptions. The browser and video capture were closed before notifying the coordinator that performance work could resume.


## Revision 5 — corrected material shader, 18:46 UTC

After the coordinator renamed the reserved GLSL identifier, the independent reviewer repeated the same three-destination journeys against the corrected fixed snapshot at `http://localhost:5174`. No implementation, asset or build changes were made by this reviewer. All nine underwater/surface/signature images and the [successive movement-frame sheet](../artifacts/review/revision5/motion-sequence.png) were actually opened. Evidence: [browser results](../artifacts/review/revision5/browser.json), [all captures](../artifacts/review/revision5/), [recorded session](../artifacts/review/revision5/video/page@166c148ef0d019872506074b9c5af590.webm), and [reproduction script](../artifacts/review/revision5/reproduce.mjs). This run explicitly collects **both JavaScript exceptions and console errors; both lists are empty**, including no shader compilation errors.

The missing environments and elkhorn subject now render. The fresh material result addresses the specific revision-3 surface-uniformity finding:

- [Australia](../artifacts/review/revision5/australia-underwater.png) shows mineral color patches and fine porous variation across irregular rocky mounds, with pale sand channels, seagrass and layered branching colonies. The [clam start](../artifacts/review/revision5/australia-signature.png) retains a visible blue mantle beside Elise. Colony repetition and some foreground crowding remain noticeable, but the habitat now has readable material and depth variation.
- [Caribbean](../artifacts/review/revision5/caribbean-underwater.png) separates broad golden elkhorn shapes, irregular purple fans and locally varied rock surfaces. The [selected elkhorn](../artifacts/review/revision5/caribbean-signature.png) is present inside its highlight instead of an empty target ring. Dense neighboring colonies still limit its visual isolation. The [surface](../artifacts/review/revision5/caribbean-surface.png) keeps the water boundary and bird separation corrected in revision 3.
- [Antarctica](../artifacts/review/revision5/antarctica-underwater.png) has a gently relieved, textured blue ice underside and visible local variation on the blue-gray rocky floor. The [surface lead](../artifacts/review/revision5/antarctica-surface.png) has irregular blue margins and textured bright ice without an opaque foreground slab hiding Elise. Hanging ice forms remain simplified and somewhat repetitive, but light, surface variation and a coherent ceiling now make the environment readable.

All three journeys changed position, turned 30 degrees, stopped at speed zero, reached the surface and opened the expected card (giant clam, elkhorn coral and Weddell seal). The motion frames show camera following and changing appendage poses; simplified upright swimming and stylized wildlife still warrant **1**, not 2, for movement and anatomy. Continuous audiovisual playback and expert locomotion review are not claimed.

| Destination reviewed in revision 5 | Composition/depth | Wildlife identity/anatomy | Movement | Environment | Surface/depth transition | Child usability | Total |
|---|---:|---:|---:|---:|---:|---:|---:|
| Australia | 2 | 1 | 1 | 2 | 2 | 2 | 10/12 |
| Caribbean | 2 | 1 | 1 | 2 | 2 | 2 | 10/12 |
| Antarctica | 2 | 1 | 1 | 2 | 2 | 2 | 10/12 |

These three now meet the internal rubric threshold through readable, coherent stylized environments. Combined with Benwood and deep midwater's **revision-3** scores of 10/12, the recorded destination-specific reviews meet the numerical visual gate. Those two destinations were **not rerun in revision 5**. This is a narrow internal art/readability pass, not a claim of photorealism, expert scientific anatomy certification or a completed child-usability study. The new voice-primary controls are visible in these captures, but this review does not verify live voice recognition or audio quality. Headless rendering here is not hardware performance evidence. The reviewer browser was closed before notifying the coordinator that isolated performance work could proceed.


## Menu revision — desktop and mobile screenshot inspection

The independent reviewer opened the coordinator's four actual saved captures: [desktop ocean selection](../artifacts/menu-desktop.png), [desktop starting spots](../artifacts/menu-starts.png), [mobile ocean selection](../artifacts/menu-mobile.png), and [mobile starting spots](../artifacts/menu-starts-mobile.png). This was an offline image inspection; no additional browser was started and no interaction, console, latency or cloud-voice result is claimed from screenshots.

The underwater key art, restrained gold accents and large title make the menu read as a game entry screen. Desktop views display all five destinations and all three starting spots without clipping. The prominent Start swimming action remains distinct from selecting a starting spot. Both desktop and mobile starting views distinguish the selected choice with a border, fill and star, so selection is not conveyed only by color. The 390-pixel mobile capture shows all three start choices and the large start action within the captured view; title, description and button labels do not overlap.

Mobile ocean selection uses a horizontal row: two cards and part of the third are visible, which suggests additional content to the right. The fourth and fifth destinations are outside this static frame. Their scroll reachability and keyboard focus remain browser-test concerns; this image alone does not establish them. Small secondary labels are less readable at phone size than the primary actions. The rendered discovery portraits preserve the connection to the stylized gameplay models, while the background illustration is substantially more detailed than those models. This menu inspection does not change the destination art scores or certify child usability.

### Final production capture inspection

The coordinator opened the final native-Chrome [Australian](../artifacts/release/production-australia.png) and [Benwood](../artifacts/release/production-shipwreck.png) production captures after the provider/narrator fixes. Reef/terrain materials, Elise, the selected turtle/grunt, wreck plates, sea fans and controls render visibly. These captures intentionally show voice disabled by the release audit's server override; the user's development server separately enables configured local voice. This is a bounded visual inspection, not an additional whole-game art score or microphone test.
