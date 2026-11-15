# Upload backend register heaps

The recovered upload chain now includes the actual Wine 11 backend callbacks (`f2f70` vertex, `f2f20` pixel) and their register-priority heap helper (`144e40`). This is renderer state recovery needed to trace writes between physics frames. Preview handling is unchanged and full trajectory parity remains unproven.

## Behavior

Each callback computes the unsigned wrapped endpoint `start + count`. It does nothing when `start >= end`; otherwise it updates each register in ascending order. Vertex and pixel heaps live at backend offsets `28` and `38`; both use the current unsigned priority at `4c`.

A heap contains interleaved register/priority nodes, a presence table, reverse indices, and the next insertion index. Nodes are one-based. A missing register appends a node and sets its presence entry; an existing register starts at its recorded index. Parents with strictly smaller unsigned priorities move down until the updated node can be stored. Reverse indices follow every moved node. Equal priorities do not swap. The native helper only moves upward, including when an existing priority decreases; the port deliberately preserves this behavior.

## Native evidence

`oracle-render-register-heap.c` executes the intact command-33 handler, both real backend callbacks and the real heap helper in the pinned DLL. There are no function patches or callback stubs. Controlled device, backend, heap and context storage supplies the environment.

The fixture contains 2,048 sequential commands in 64 reset episodes, with both complete heaps and all three context slots recorded after every command. All 3,950,592 output words match. Cases cover all eight command kinds, full 256-register vertex and 224-register pixel ranges, repeated updates, unsigned priorities including zero and `ffffffff`, decreasing priorities, wrapped ranges, and zero through three contexts. Each input is ten DWORDs: reset, kind, offset, count, flags, priority, context count, and three prior context flags. Each output is 1,929 DWORDs: both next indices; vertex nodes/presence/positions; pixel nodes/presence/positions; and three context flags. The compressed fixture preserves input/output hashes and pinned module hash.

## Live connection

A five-frame original-game capture observed complete heaps immediately before command construction (`1c6f1f`) and after synchronous submission (`1c6f3e`). These are existing guarded non-CALL instruction hooks; no additional hooks were introduced. The analyzer derives the command from observed upload inputs and resource configuration, then computes dispatch, both heap transitions, and context flag writes. Observed command words and post-state are comparisons, not simulation inputs.

All 192 commands match, including 3,552 changed array words. Before-state heap contents and current priority remain explicit boundary inputs; this does not reconstruct backend initialization or continuous whole-world evolution. Context counts and priorities were unchanged across each measured submission.

All 167 captured instruction sites were independently verified restored, and debugger state was zero after capture. The accompanying five-bike/four-rider replay has zero modeled physics differences and 60,264 separately reported visual differences. The watched caller scratch value did not change across any of these 192 command submissions, narrowing the write-order investigation for this capture only.

## Remaining work

The older frame-38 mismatch is unresolved. Connect complete draw scheduling, visibility and all relevant writes to the next bike invocation; do not infer global last-writer behavior from the five-frame capture. The backend state model is validated at its explicit boundaries, not integrated as a full graphics runtime or claimed to remove the physics mismatch.
