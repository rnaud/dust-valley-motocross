# Retained physics to render visibility

The 42-frame original run is now a committed regression connecting retained bike/rider simulation to the native culling decisions and observed SSE store values. This replaces the temporary visibility probe with a reproducible check; it does not yet simulate the full ordered renderer or fix the older negative-steering failure.

## Computed chain

The comparator initializes physics once and advances the captured throttle/steering inputs and explicit external rider/pool timing. At each world-frame boundary, its recovered runtime supplies each actor's local transform and animated bounds. These computed values are compared against original draw-time geometry, then passed to the recovered wrapper product and projected-bounds functions. Captured actor geometry and visibility results never feed those calculations.

Camera combined/view matrices and viewport remain captured stage inputs. The renderer world transform is an explicit identity-matrix input for this validation, rather than a recovered retained graphics-state result. Hidden-node paths are rejected; the capture's tracked bike/rider nodes are not hidden.

For an observed SSE store, the analyzer requires that the computed actor visibility accepted drawing. It computes the matrix product from view and world inputs and checks output word 2 against the actual native store. It does not infer that every visible actor must emit a store: dirty-state eligibility remains a separate missing stage.

## Native results

- 42 retained bike updates and 41 rider updates, including negative steering starting at frame 20 and throttle release at frame 40: zero modeled physics differences, without observed caller-scratch injection.
- 82 bike/rider geometry samples / 1,804 source words match original draw-time transforms and bounds.
- All 82 visibility decisions match: 52 accepted and 30 rejected. Rider visibility first rejects at frame 24; bike visibility first rejects at frame 28. These are calculated transitions, not frame-number conditions.
- 24 observed SSE values match the computed matrix product. Of 24 following bike-entry comparisons, one differs from the SSE value because a later writer replaces it. That interval remains explicitly reported.
- 82 wrappers belonging to other actors are reported as unmodeled, rather than presented as reconstructed AI behavior. Stores from an unmodeled actor are rejected by the analyzer.
- 903,525 visual differences remain reported. This milestone does not remove or reclassify them.

The fixture includes the original initialization assets, bike/rider/pool telemetry, wrapper/cull/SSE observations, trace hash and independent cleanup record. All 167 hooks were restored and the debugger detached. This run uses the existing partial checkpoint; it is not a reset of the complete native world. Terrain comes from the source-hashed original Dunes asset already in the repository.

Negative tests alter captured geometry, culling output and paired SSE outputs. Each alteration is detected, demonstrating that these outputs cannot silently steer the reconstruction.

## Remaining integration

The writer census identifies why visibility matters: once the rider is culled, its SSE write cannot replace an earlier binding CALL return address; once the bike is culled too, the HUD zero can survive in this captured world. However, the analyzer does not turn that observation into an unconditional last-writer rule. It still needs retained camera evolution, graphics dirty-state transitions, binding/upload producer eligibility, HUD scheduling/layout inputs, particles/AI and complete world ordering before applying computed writes to the next physics update.

The older frame-38 failing fixture remains unchanged. Preview handling is unchanged. See `mcm-render-writer-census.json` and `mcm-render-binding-recovery.md` for the independently tracked write observations.
