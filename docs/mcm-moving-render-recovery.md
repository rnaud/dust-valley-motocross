# Moving physics and render-source capture

A single native run now joins controlled bike updates, the separate rider/pool updates, compact bike/rider sources at update return, wrapper entry during drawing, and the exact Wine SSE write overlapping physics caller scratch. The recovered runtime supplies its retained local transforms and animation bounds at both update-return and post-world-update boundaries. Expected telemetry is used only for comparison.

## Recorded results

The original ran 400 player frames with dt 0.02, throttle on frames 0–39, steering −0.25 on frames 20–69, then released controls. The separate rider timestep was fixed to 0.02; shared-world timing was observed. The run starts from a newly captured Dunes state after a short throttle warmup, not the older negative-steering checkpoint. These controls/timesteps and RNG overrides are deliberate experimental inputs; camera/world state is not reset.

- 400 modeled bike updates and 399 rider updates: zero physics differences under the existing comparator's modeled-field coverage. This is not a comparison of every byte of the complete world.
- 800 update-return actor samples / 17,600 local-matrix and bounds words match.
- 798 actual wrapper entries / 17,556 local-matrix and bounds words match after retained rider/pool updates. This closes the earlier one-sample rendered-rider source gap for this run.
- All 383 observed SSE store values match the value written by the original instruction. Ten frames contain multiple writes to the same scratch address.
- Across 373 frames with stores, **59 final observed values differ from the following physics-entry scratch**. These remain reported differences, not filtered comparisons or replacement inputs. Other code writes the location after the tracked renderer instruction.
- Shared-world visual differences remain: 11,224,606 reported words, including 11,221,535 particle-pool words. Duplicate checks can count the same field repeatedly.
- All 15 hooks independently verified restored; debugger absent after capture.

The old negative-steering fixture still diverges at frame 38. A different passing initial state does not fix or supersede that failure. Preview handling is unchanged.

## Inactive animation history

Two initial attempts exited before collecting frames because the original rendered rider contained unreadable previous-frame bits `0x3e31d0c8` at +0x1c, with blending disabled. A short throttle warmup did not replace them. Original normal pose updates can leave that field untouched; the recovered non-blending interpolated update overwrites it before dereference.

The exporter now records unreadable previous-frame tokens explicitly, only in the two previous-frame slots and only while the owner has blending disabled. The loader preserves the exact token using an opaque reference. Dereferencing it fails, and loading it into active blending or another required frame slot fails. It is never converted to null or an invented animation frame. Other missing assets remain errors. The completed native replay preserves these initial bits and verifies subsequent original execution.

## Scope and next capture

Wrapper camera matrices in this run are observed inputs. This is not yet the recovered-camera-to-moving-physics join. Only player and rendered-rider wrapper entries were recorded; other actors can reuse the same renderer stack depth, so repeated writes are not assigned an actor without evidence. Projected rejection and hidden-node gates cannot alone explain all stores in this trace.

Next include all actor wrapper entries, the HUD/intervening scratch writers, and camera initialization/timing in the same controlled history. Resolve the 59 intervening changes and the older frame-38 failure without observed scratch injection. Preserve the actual full-world differences throughout.

## Reproduction

`capture-moving-render.c` extends the controlled replay helper with compact `renderSources`, wrapper entry at 0x44faf0, and the pinned Wine store at 0x7a83308b. It uses 15 guarded non-CALL breakpoints. Thread-context writes retain the deliberate integer input overrides while avoiding writes to floating-point register state. Compile with 32-bit MinGW, `-O0 -Wall -Wextra -Werror` and the reference scripts include directory. Verify the pinned EXE and Wine hashes plus debugger absence before attaching, then independently verify all original instructions and detachment afterward.

Invoke `PID OUTPUT.jsonl 800`. Set output paths via MCM_CHECKPOINT, MCM_FRAME_ENVIRONMENT, MCM_ANIMATIONS, MCM_COLLISION_WORLD, MCM_RETAINED_RIDER_TRACE and MCM_RENDER_TRACE. Enable MCM_SCRIPTED, MCM_STACK, MCM_COLLISION, MCM_COLLISION_CALLBACKS, MCM_COLLISION_PAIRS, MCM_RIDER_TIMING, MCM_FIXED_RIDER, MCM_CAPTURE_RETURN, MCM_FRAME_INPUT, MCM_FRAME_ACTIONS, MCM_FRAME_EVENTS, MCM_FRAME_RESET_SUPPORT, MCM_COLLISION_ACTORS, MCM_COLLISION_TRANSFORMS, MCM_COLLISION_NOTIFICATION_GATES, MCM_COLLISION_RIDER_RESPONSE, MCM_COLLISION_BIKE_GATES, MCM_CAPTURE_FREE_RIDER, MCM_CAPTURE_RIDER_ANIMATIONS and MCM_CAPTURE_ALL_RIDER_ANIMATIONS. Paths must be accessible to Wine. Do not reuse output filenames.

The compressed fixture retains initialization, raw player/rider/pool/render records, capture-source hash and cleanup evidence. `analyzeMovingRender` replays it against the original Dunes terrain asset; the regression test checks source values, experimental inputs, unchanged known differences, complete draw observations and cleanup. See `mcm-moving-render-validation.json` for counts.
