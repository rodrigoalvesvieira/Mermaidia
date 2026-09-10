# Decorative menu artwork provenance

The ocean key art is an original AI-generated 2D illustration made for Mermaidia with the built-in `image_gen` tool. It was generated from text in new-image mode: no reference image input, uploaded image, image edit, downloaded photograph or third-party image was supplied. It is a decorative fantasy reef composition, not a gameplay screenshot, documentary image, species-identification reference or record of any of the five destinations. Its fish, turtle, plants and rock formations make no ecological occurrence claim. Consequently, the two asset records carry an empty `evidenceIds` array.

The production JPEG was opened and visually inspected. It has a dark open left area for menu labels and a brighter sunlit fantasy reef arch on the right, with a turtle and small fish. This exception concerns menu decoration only. The playable 3D scene assets and their portraits remain original Blender constructions documented in [art direction](ART_DIRECTION.md).

## Retained files and checksums

| Role | File | Dimensions | Bytes | SHA-256 |
| --- | --- | --- | ---: | --- |
| Original tool output | [ocean-keyart.png](../assets/source/menu/ocean-keyart.png) | 1672 × 941, RGB PNG | 2,467,477 | `8f14400f51cf71e7b9fbc4854cdedad9c7128cd0fb7a17d0dc7bbee224519b01` |
| Production menu background | [ocean-keyart.jpg](../public/assets/menu/ocean-keyart.jpg) | 1672 × 941, RGB JPEG | 487,666 | `24abbae3087a8d8f52a29600a81c24963781d2f8eaf28ae5b646baa9ab5c9de2` |

Generation used the built-in tool rather than the project's OpenAI API key. No seed or separately selectable image model is asserted. The retained PNG is the authoritative output; repeating a generative prompt is not expected to reproduce identical pixels. Asset provenance and distribution terms are recorded in [menu.json](../assets/manifests/menu.json); they are separate from the Blender asset CC0 dedication.

## Production conversion

The PNG was converted to a full-size RGB JPEG with FFmpeg's MJPEG encoder and quality setting 2:

```sh
ffmpeg -hide_banner -loglevel error -y \
  -i assets/source/menu/ocean-keyart.png \
  -frames:v 1 -c:v mjpeg -q:v 2 \
  public/assets/menu/ocean-keyart.jpg
```

This exact command was independently reproduced to a temporary file and yielded the same 487,666 bytes and SHA-256 as the shipped JPEG. No crop, resize, composite, species labeling or painting was added during conversion. The JPEG includes only FFmpeg encoder metadata (`Lavc63.1.101`); the PNG contains no embedded provenance metadata, so this document and the registry retain the provenance explicitly.

## Exact generation prompt

The coordinating agent supplied the following exact final prompt sent to `tools.image_gen__imagegen`, with no reference inputs:

```text
Original cinematic videogame main-menu background, wide 16:9 landscape, no text or UI. A breathtaking underwater tropical reef vista rendered as polished high-end stylized 3D game key art. Rich weathered limestone arches and natural branching corals frame an inviting path into deep aquamarine water. A green sea turtle and a few small reef fish glide in the middle distance. Beautiful tactile mineral and coral textures, organic seagrass, soft drifting marine particles, realistic soft turquoise caustics and broad golden sunlight shafts from the upper right. Deep midnight-teal foreground and luminous turquoise distance create layered atmospheric depth. Peaceful ocean exploration, wonder and sophisticated cinematic composition. Keep the left forty percent calm, dark, uncluttered open water for title lettering that will be added separately. Place most detailed rock and coral formations on the right half and lower edges. Keep the lowest fifth softly shaded for a menu overlay. No people, no mermaids, no humanoid figures, no letters, no branding, no watermark, no interface elements. Final production artwork with fine natural detail, restrained colors and dramatic but gentle lighting.
```

The tool returned `/Users/rav/.codex/generated_images/01a08c5e-209f-73e3-874c-599503b9fdb6/exec-9dd75d38-e841-44ef-b1a0-66f24439956a.png`, which was copied to the retained project source path above. It did not return model or revision metadata. “Green sea turtle” and other natural subjects in the art-direction prompt describe intended decorative imagery; they do not establish taxonomic accuracy or location evidence.

## Registry verification

Both source and production files are approved registry entries with their actual checksums and original-generation attribution. `npm run assets:validate` reports **185 assets, zero errors** and regenerates [ATTRIBUTIONS.md](../ATTRIBUTIONS.md). `npm run content:validate` reports **five destinations, 29 biological entries, zero errors** and refreshes the in-app credits. Logs: [asset validation](../artifacts/menu-assets-validation.log), [content validation](../artifacts/menu-content-validation.log). No GPU rendering or browser journey was performed for this provenance update.
