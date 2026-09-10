# Surface bird audio: source review and production decision

Reviewed September 10, 2026. One real, rights-cleared buff-banded rail call is supplied. The pelicans remain silent in their normal gliding behavior. No snow-petrel call has been approved; that audio requirement remains unavailable rather than replaced with another species or an invented whistle.

## Supplied rail recording

* **Taxon:** Buff-banded Rail, *Gallirallus philippensis* (also *Hypotaenidia philippensis*).
* **Recorder:** John Cull, iNaturalist user `bbdown`.
* **Actual recording locality:** Inverness Road / York Road, Mount Evelyn, Victoria, Australia. **This is not a Green Island field recording.** The game uses it as a recording of the same identified bird species; Green Island occurrence is supported separately by the existing `green-rail` evidence.
* **Observation date:** August 26, 2024.
* **Exact item:** [iNaturalist observation 238018928](https://www.inaturalist.org/observations/238018928), sound **1185828**; [public API metadata](https://api.inaturalist.org/v1/observations/238018928); [original WAV](https://static.inaturalist.org/sounds/1185828.wav?1724652137).
* **Rights:** The sound object's `license_code` is `cc0`, with `attribution: no rights reserved`. This was inspected on the exact audio item, independently from the taxon's unrelated default photograph license. [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Credit is retained as good practice.
* **Identity evidence:** The observation is research grade, with two current confirming identifications (`bbdown` and `see_j`). This is a community-identified field recording, not a new scientific expert audit by Mermaidia. The metadata's initial taxon and current IDs agree.
* **Captured proof:** [Reduced item metadata](../assets/source/bird-audio-provenance.json), full API result `artifacts/bird-audio/buff-banded-rail-inat.json`. The public observation HTML could not be loaded by the web reader; the official public JSON API and audio file were accessible and inspected.

The shipped [buff-banded-rail-call.wav](../public/assets/audio/buff-banded-rail-call.wav) contains **2.40–3.45 seconds** of the original 9.791667-second recording. It preserves original timing and pitch. A high-pass at 1000 Hz reduces background rumble; a low-pass at 10000 Hz limits upper-frequency field noise. FFmpeg loudness filtering targets -24 LUFS / -9 dBTP before another 3 dB reduction and 80/130 ms boundary fades. The output is mono, 48 kHz, signed 16-bit PCM, **1.05 seconds**, **100,878 bytes**.

Measured output sample peak: **-13.32 dBFS**; RMS **-31.99 dBFS**. It decodes successfully, has nonzero signal, finite samples, and no clipped samples. [Analysis log](../artifacts/bird-audio/processed-analysis.log). Original and processed spectrograms were opened and inspected; the original shows three repeated harmonic call events and the excerpt retains one complete event. [Original spectrum](../artifacts/bird-audio/rail-spectrum.png), [processed spectrum](../artifacts/bird-audio/processed-spectrum.png).

**Audible quality inspection is unverified.** These tools expose decoding and spectrogram inspection, but they do not establish that a human listened on the target speakers or that the short excerpt is free of all incidental background sounds. Do not describe a successful command-line decode as a listening pass.

Reproduce with:

```sh
python3 scripts/audio/build-bird-call.py
```

The recipe downloads the exact CC0 original if absent, applies the recorded conversion, and regenerates [bird-audio.json](../assets/manifests/bird-audio.json) with its SHA-256. The asset is approved for distribution on verified rights grounds; this is separate from the unverified audible-quality check. The new source record is [bird-audio-source.json](../content/evidence/bird-audio-source.json), included in the shared source registry as `rail-audio-inat`.

### Playback assignment

Implemented playback is limited to the Australian surface soundscape: the first call is scheduled four seconds after surfacing, then at 37-second intervals while the surface/theme conditions remain eligible. It uses the wildlife channel at low fixed gain and respects master mute; diving, scene changes and disposal clear the timer. The excerpt is a separate one-shot sound, not part of the looping water layer.

The original assignment proposed distance attenuation near the visible rail, narration exclusion and pausing the schedule. Those finer conditions are not currently enforced by the bird scheduling code; do not describe them as verified. The recording locality remains visible in grown-up provenance. No human listening or speaker-comfort pass has been established.

## Brown pelican: keep gliding adults quiet

Cornell's [Brown Pelican Sounds](https://www.allaboutbirds.org/guide/Brown_Pelican/sounds) explains that adults normally remain silent, with a low hoarse sound associated with a particular display. Its louder begging examples belong to nestlings, and bill pops are associated with nest defense. These behaviors are not the calm flying adults depicted in Mermaidia. The reviewed [Audubon account](https://www.audubon.org/field-guide/bird/brown-pelican) likewise locates low grunts at nesting grounds. Silent gliding pelicans in Buck Island, Florida Keys and Monterey are therefore a deliberate evidence-based choice, not a substitute call. No Cornell/Macaulay audio is redistributed.

## Snow petrel: unavailable recording

No suitably licensed and behavior-appropriate recording was established during this bounded search. The [AAP snow-petrel species page](https://www.antarctica.gov.au/about-antarctica/animals/flying-birds/petrels-and-shearwaters/snow-petrel/) supplies photographs and ecology, but no call file. [AAP Sounds of Antarctica](https://www.antarctica.gov.au/news/galleries/sounds/) provides a black-browed albatross example, which is not substituted for the snow petrel. An iNaturalist sound query for *Pagodroma nivea* returned zero items (saved under `artifacts/bird-audio/snow-petrel-inat.json`). Xeno-canto's species page was blocked to the research tool by robots policy, so no item license there was claimed inspected.

[ML42315](https://macaulaylibrary.org/audio/42315) documents Ted Parker's February 3, 1988 juvenile snow-petrel recording on Coronation Island, South Orkneys. Its metadata says an alarm behavior from a downy young bird in a crevice. No redistribution license was verified, and both the behavior and age are unsuitable for our calmly flying adults. BBC/Sound Ideas snow-petrel products found in search are paid/licensed media; none were purchased or copied. The remaining gap is an appropriately identified, rights-cleared adult call with actual listening review. Antarctic wind, water and ice ambience must not be relabeled as that missing bird call.

## Other candidates rejected

* Commons [Buff-banded Rail06.ogv](https://commons.wikimedia.org/wiki/File:Buff-banded_Rail06.ogv), Aviceda, Lady Elliot Island, November 2006, CC BY-SA 3.0: exact video license was inspected, but the focal bird's contribution to its soundtrack was not established. Not shipped.
* Richard Littauer's iNaturalist observation 331652320, CC BY sound: observer uncertainty and mixed bird background; not selected.
* Patrick Connolly's observation 271153561, CC BY sound: research grade but initial frog/bird uncertainty and a different call type; the clearer CC0 record above was selected instead.
* Numerous other rail recordings have CC BY-NC or all-rights-reserved sound licenses. They were not treated as CC0 just because observation metadata was publicly readable.

## Offline reproduction and integrity

The unchanged, rights-cleared CC0 [original WAV](../assets/source/rail-238018928.wav) is retained in the repository, so the conversion works offline. The recipe prefers that source file; only if it is absent does it download the exact original URL. In either case it verifies SHA-256 **86da4e48a2793a114ba42371c858b317bcb596bd9fbd16ae02fe6192a46f7332** before converting and fails on any mismatch. The original and derived excerpt have separate approved provenance records in the bird-audio manifest. No auditory expert review or human listening session has been claimed.

The coordinator assigned the call four seconds after surfacing in the Australian destination, then every 37 seconds while eligible, using the quiet wildlife channel. This is an implementation handoff, not evidence of speaker playback. All other destination birds retain the decisions above.
