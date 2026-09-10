# Installed toolchain

Installed and verified 2026-09-10 on macOS arm64, Apple M3. Exact package versions are pinned in [package.json](../package.json) and [package-lock.json](../package-lock.json). Actual doctor output: [JSON](../artifacts/doctor.json).

| Tool | Verified version / evidence |
|---|---|
| Node | 26.8.2, retained existing runtime |
| npm | 11.19.1, retained existing runtime |
| React / React DOM | 19.3.0 |
| TypeScript | 6.0.3 |
| Vite | 8.3.0; installed runtime meets 20.19+ /22.12+ requirement |
| Three.js | 0.186.0, direct scene graph; no Fiber compatibility layer required |
| Express / OpenAI SDK / Zod | 5.2.1 /7.13.0 /4.6.1 |
| Blender | 5.2.1 LTS, installed with Homebrew cask, bundled glTF exporter |
| FFmpeg / eSpeak NG | 9.0.1 /1.52.0, installed with Homebrew |
| Playwright | 1.63.0, Chromium/Firefox/WebKit binaries installed |
| Vitest / axe Playwright | 5.0.0 /4.13.0 |
| Khronos glTF validator / glTF Transform | 2.0.0-dev.3.10 /4.5.0 |
| Pillow | 12.3.0 preinstalled; optional contact-sheet tool |

Installation logs: [Blender](../artifacts/blender-install.log), [audio tools](../artifacts/audio-install.log), [browsers](../artifacts/browser-install.log). `npm ci` is the clean package installation command; `scripts/bootstrap` idempotently checks authoring tools and installs missing browsers.

Primary installation/API references inspected: [Vite](https://vite.dev/guide/), [Blender cask](https://formulae.brew.sh/cask/blender), [Playwright browsers](https://playwright.dev/docs/browsers), [Three GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html). The Blender build uses standard Y-up glTF conversion, meters, -Z forward; no remotely loaded runtime decoders or libraries. glTF Transform dedup/weld/prune needs no decoder. See [art direction](ART_DIRECTION.md).

The live rendering adapter is measured per browser tour, not inferred from CPU or software CI. Browser WebKit is not proof of actual Safari microphone behavior. No OpenAI API credential was configured during this build.
