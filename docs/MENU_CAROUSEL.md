# Picture carousel home screen

The home screen now places the original animated Elise model on the left and a five-scene picture carousel on the right. Large previous/next arrows, dragging/swiping, keyboard arrows and choice dots select the ocean. Only short scene names, three icon-led starting choices and a large Play button are visible; long descriptions, slogans and the second selection page have been removed. Existing reviewed destination/start audio still plays on selection. Journal, continue and grown-up settings use small icon buttons.

Elise uses the same original `elise.glb` and idle clip as gameplay, with the existing transparent portrait as a fallback. The preview renderer releases its animation, geometry, materials and WebGL renderer when play begins. Reduced-motion settings stop character animation and CSS transitions.

The five JPEGs in `public/assets/menu/scenes/` are original captures of the existing game renderer at 1000×760, default starts, with overlays hidden, saved directly at JPEG quality 88. No external image or new AI generation was used. Their checksums, source evidence and CC0 attribution are registered in [menu.json](../assets/manifests/menu.json). The existing decorative background retains its [original provenance](MENU_ART.md).

Quick check only, in keeping with the user's hackathon preference: build and TypeScript compilation completed, actual desktop/mobile screenshots were inspected, all five scene choices were cycled, drag selection worked without starting accidentally, and Play opened the selected shipwreck wildlife start. No browser page exceptions or horizontal phone overflow were observed. No unit or full regression suite was run.

Evidence: [desktop](../artifacts/carousel/desktop.png), [phone](../artifacts/carousel/mobile.png), [quick browser check](../artifacts/carousel/quick-check.json), [capture provenance](../artifacts/carousel/scene-captures.json). The image/check report precedes a final small increase to phone arrow/dot hit areas and name spacing.
