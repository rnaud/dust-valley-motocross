# Retained wrapper sources

The previous wrapper notes mislabeled the matrix source as cached world state. Original `0x4b7a00` copies node **+0x84**, which the existing transform loader represents as `local`. Cached world is +0xc4. The copy does not call `0x4b6930`, resolve a parent transform, or change cache flags. Root local and world matrices can coincide, so substituting a world resolver would pass some idle comparisons while changing semantics.

`createCapturedFrameRuntime.renderSources()` now exposes copies of the player bike and rendered rider local matrices and their animated center/half-extents. Actor +0x218/+0x224 correspond to the existing bike/rider animation `boundsMin`/`boundsMax` names. The rendered rider is bike +0xc8c, distinct from the physics rider at +0x874. These outputs reference the already retained transform/animation producers, not per-frame observed source values.

## Evidence and limits

`compareRenderSources` checks these outputs against original update-return telemetry during retained replay. The positive-quarter-steering history matches **400 bike samples and one rendered-rider sample / 8,822 words**, including acceleration, steering release and crash transitions. Rendered-rider allocation observations are sparse: only the first frame is available, explicitly counted as one sample. This does not establish 400-frame rider-source coverage.

The negative-quarter-steering history reaches 39 bike samples and one rider sample / 880 words, then reports **12 local-matrix differences at frame 38**, alongside the existing 41 physics differences. No observed caller scratch is injected. Mutation tests change native matrix observations and require a discrepancy. A separate cache test makes local/world storage differ and confirms the copy uses local without resolving or mutating the cache, while updated animation bounds remain visible.

These are physics-update-return sources. The camera/render pipeline is not yet joined to this moving replay, and intervening world updates can change state before drawing. Next capture complete render-source observations with controlled steering and camera initialization/timing, connect the retained draw-time sources, and resolve the frame-38 scratch writer schedule. Full parity and preview handling remain unchanged by this milestone.
