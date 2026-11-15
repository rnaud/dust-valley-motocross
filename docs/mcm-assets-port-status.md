# Original asset port

This is an asset-port tally, separate from physics equivalence. Matching geometry, textures or a short ride does not prove full simulation parity.

## Connected to the playable preview

- 33 original terrain files from the reference installation's `teraform` directory. Original height samples, normals, hierarchy and scales are preserved; sources and SHA-256 values are in `mcm-map-assets.json`.
- Original seven-part bike and fifteen-part rider geometry at highest detail, including original UVs and normals. Twenty-one drawable surfaces are bound to the recovered runtime's articulated transform graph. The empty `NullFrame` remains in the hierarchy.
- Twelve original rider skins and twelve bike liveries decoded from the four `RES` texture/palette archives. Reserved magenta palette entry 255 is transparent.
- Terrain, rider and livery selectors in MCM preview. Asset downloads occur when needed. Classic retains its existing graphics.
- Selected terrains use the recovered bike reset/ground-alignment routine at a central practice location. Dunes retains the previously validated initial checkpoint. Each imported scene's declared shadow light replaces the dunes light target; scenes without a declared shadow light omit that occlusion query.
- Original animation/component transforms are read without changing native transform caches.

## Still required for a complete asset port

- Original terrain texture placement, rotations, skies, fog and scene lighting in the renderer. Current terrain shading remains Dust Valley's.
- Original scene objects and stadium geometry, placement and collision integration.
- Original race/waypoint data, checkpoints, exact starts and mode setup. The current circuit is Dust Valley's course overlay, not an original race reconstruction.
- The editor-only `trakedit/tracks/mass_air.trn` and UI-only `ui/simple.trn` are not course-selector entries.
- Original rider welded-vertex seam processing and rendering behavior; weld flags are preserved by the importer but not yet applied. All animation/event paths still require original-render comparison.
- Per-course native starting checkpoints, sustained riding and whole-world parity. Short startup coverage is not trajectory equivalence.

## Verification for the first playable milestone

All 33 imported terrains completed 30 recovered acceleration frames with finite motion in a local run. Focused tests verify complete mesh-to-node binding, unchanged physics transform/cache state after rendering, malformed resource rejection, and terrain reset/shadow setup on two distinct maps. Browser validation and deployment results are tracked with the milestone report.
