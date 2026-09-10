# Larger populated oceans

Each of the five destinations is now **240 × 240 metres**, up from 48 × 48: five times the width and length, or 25 times the horizontal play area. The added space contains 25 encounter regions with rotated/scattered wildlife, discoverable features, terrain and background vegetation. Animal sizes and annotated depth zones remain approximately the same; this is more exploration space, not giant animals. The existing reviewed species/facts are reused across additional encounters, not presented as hundreds of new species.

| Destination | Discoverable entity instances |
|---|---:|
| Australian coast | 176 |
| Caribbean | 185 |
| Antarctica | 185 |
| Benwood | 191 |
| Deep sea | 184 |

Reefs include additional coral/seagrass gardens, rocky outcrops and swim-through arches. One broken Benwood exterior extends roughly 100 metres through repeated steel-support sections to its bow; the world does not contain 25 cloned ships. Antarctica has nine fictional open-water leads, with both ice geometry and movement using the same opening positions. Surface commands choose the nearest lead. Outside the central area, other destinations surface locally. Wildlife starts enter outer encounter regions; deep sea also has a more distant midnight start. These are artistic spatial arrangements, not mapped surveys or animal population estimates.

Scenery uses reusable model geometry and region-sized instancing. Distant regions are culled; distant fish schools draw fewer companions, and only nearby actors animate. Particles wrap around the explored area. All existing species and narration assets are reused, so the expansion does not require downloading a new wildlife pack.

## Quick implementation checks

In keeping with the requested hackathon pace, no unit or full regression suite was run. TypeScript/build and the small content validator passed. An actual native-GPU browser check loaded all five scenes and used normal movement controls; the Australian swim reached z≈−114, far beyond the old −24 boundary. A second quick check opened all five outer wildlife starts and captured their actual scenery. Both browser checks recorded no page/shader errors. A small movement check reached the far Antarctic lead at (94,90). An additional actual browser journey from the outer wildlife start reached the nearby lead at (94,−70) with normal Space/Surface controls in about eight seconds, with no page errors. These short runs are not a full performance acceptance tour.

The first ice journey revealed a camera clipping through the opening's wall. The camera now moves closer and stays inside the opening during ascent. A repeat native-Chrome journey completed with no page errors; both the transition and settled surface views were inspected. An intermediate bundled-Chromium attempt timed out and is not counted as passing. TypeScript and production build passed again after the camera fix.

Evidence: [movement/play check](../artifacts/expanded-world/quick-check.json), [outer-start check](../artifacts/expanded-world/outer-starts.json), [initial ice journey](../artifacts/expanded-world/outer-ice-surface.json), [corrected ice journey](../artifacts/expanded-world/outer-ice-surface-fixed.json), [corrected surface view](../artifacts/expanded-world/outer-ice-surface-fixed.png), [outer Caribbean](../artifacts/expanded-world/caribbean-outer.png), [distant wreck bow](../artifacts/expanded-world/shipwreck-outer.png). The first run preceded the final distance-detail adjustment and outer-start relocation; the second run uses those changes. Historical small-world performance measurements do not certify the enlarged worlds.
