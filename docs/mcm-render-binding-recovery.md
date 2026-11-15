# Return-address writes from render binding

The long native trace exposed a caller-scratch value `7a925d98` before bike frames 25–28. This is not a recovered force or a pointer to modeled bike data. It is the return address pushed by `CALL wined3d+612e0` at `wined3d+1b5d93`.

## Recovered handler

The command-20 handler at RVA `1b5d50` reads slot and new binding from command words 1 and 2, and the prior binding at `cs+1c0+slot*4`. Slots 0–5 are covered. When a zero binding becomes nonzero, it first invalidates state `167+slot` (or `17e` for slot 5). It then stores the new binding and invalidates `162+slot` (or `17d` for slot 5). Finally it tail-jumps to invalidate state `16c` (or `17f` for slot 5).

The ordinary CALLs push return RVAs `1b5dfc` and `1b5d98` to `handlerEntryEsp-24`. The tail jump does not push a new return address. The second CALL overwrites the first return-address word when both execute. Module base and initial stack position are explicit environment inputs.

## Native validation

The isolated oracle executes the intact handler and records callback arguments, actual return addresses, stack offsets and resulting binding state. The invalidation callback itself is a recording boundary stub; its downstream state effects are not claimed as recovered here. Tail return addresses belong to the harness and are recorded as RVA zero, with zero relative stack displacement.

All 4,096 cases / 45,056 output words match. Coverage includes every slot with all four zero/nonzero previous/new binding combinations, and arbitrary nonzero values.

The live capture observes the handler entry, the callback entry and the return boundary, without placing a breakpoint on CALL. All 38 observed handlers match the predicted direct-call sequence and stack stores. Four main-call stores overlap `22f038`, the physics caller scratch slot. Reading memory again after the real callback returns confirms the predicted word remains there at that boundary. This validates the real callback's preservation for these calls, not every possible callback path.

All 173 observation sites were independently verified restored and the debugger was absent after capture. The dedicated `capture-render-binding.c` enables the three binding hooks plus the existing HUD hooks. Compile the verifier with both `MCM_CAPTURE_HUD_LINE_STORES` and `MCM_CAPTURE_RENDER_BINDING`; the default heap capture retains 167 hooks.

## Longer-trace implications

The separate 42-frame trace provides 41 next-bike-entry comparisons: frame 0 has a matching final heap-handle store; frames 1–23 have matching last observed SSE stores; frames 24–27 carry the binding CALL return address; frames 28–40 carry zero after HUD drawing. The census records observations and candidate provenance, not a completed prediction of draw eligibility or last-writer ordering. The exact binding hooks were validated in the separate five-frame capture.

The null-shader producer gates and application-relative stack placement are now connected in `mcm-render-binding-gates-recovery.md`. Continuous dirty-state evolution and full ordered world execution remain to be connected. This finding must not become a frame-number rule or unconditional scratch assignment. The older frame-38 physics mismatch remains open; preview handling is unchanged.
