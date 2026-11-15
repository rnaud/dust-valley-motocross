# Shader binding gates and stack placement

The pinned Wine state application emits null shader bindings through RVA `1c5050`. The recovered subgraph starts at `1c0398` after earlier shader work and ends at `1c03e3` before constant-buffer bindings.

- Dirty byte `state+108` bit 8 emits slot 1/value 0 if the pixel shader is null, the declaration is null, or the declaration's transformed byte is nonzero. Its return RVA is `1c1238`.
- Dirty bit 16 emits slot 0/value 0 if the vertex shader is null. Its return RVA is `1c1674`.
- Each fallback checks adapter byte `+5a` bit `40`. If set, execution enters a generated-shader branch instead. The model returns that explicit boundary; it does not claim those branches emit no commands.
- Pixel processing precedes vertex processing. The live adapter flags are `0b`, with bit `40` clear.

## Native evidence

`oracle-render-binding-gates.c` loads the pinned 32-bit DLL without resolving imports and executes the original gate instructions. It redirects the producer to an argument-recording callback, and exits at the constant-buffer and generated-shader boundaries. It does not model or test the producer's allocation or downstream invalidation effects in isolation.

The 4,096 cases / 32,768 output words match exactly. All 128 combinations of the two dirty bits, adapter bit 40, shader nullness, declaration nullness and transformed status are covered, with arbitrary other flags and nonzero values. Fixtures preserve original binary input/output and module SHA-256.

The five-frame live capture has 871 state applications and 36 producer calls. The predicted commands match every observed slot, value, caller and order, including applications with no command. This sample only observes the two null-binding callers. Other callers and earlier shader stages remain outside this model.

The shared capture adds one guarded, non-CALL/non-REP producer-entry observation and reads gate configuration at the existing prepared-state boundary. Compile `capture-binding-gates.c`; compile `verify-render-heap.c` with `MCM_CAPTURE_HUD_LINE_STORES`, `MCM_CAPTURE_RENDER_BINDING` and `MCM_CAPTURE_BINDING_GATES`. All 174 sites independently verified restored, with debugger absent. Default captures retain their prior hook counts.

## Application-relative writes

For this synchronous command stream, let `A = alignDown16(applyEntryEsp - 16)`:

- Apply body ESP: `A - 860`.
- Producer entry ESP: `A - 864`.
- Handler entry ESP: `A - 890`.
- Main invalidation CALL store: `A - 8a8`.

All numbers above are hexadecimal. The existing handler model computes the return-address word from the module base and return RVA `1b5d98`. All 36 producer entries, handler entries and actual CALL stores match these computed locations; four stores overlap bike scratch `22f038`. Readback after the real callback returns confirms the word persists at that boundary. Negative regressions reject altered producer, handler, store and return observations.

The integration starts from prepared dirty flags, shader configuration, module base and state-application entry ESP. It does not use captured command outputs or observed handler ESP to choose the model's commands/writes. The null new value makes the optional zero-to-nonzero handler call impossible regardless of the previous binding.

## Remaining integration

Prepared state is still a stage input, not a continuously recovered graphics state. Other producer paths, callback side effects, visibility-driven submission ordering, font/layout scheduling and competing writers must be composed before this can determine the next bike's scratch input. No scratch assignment is added to the physics runtime. The old frame-38 mismatch remains open; preview handling is unchanged.
