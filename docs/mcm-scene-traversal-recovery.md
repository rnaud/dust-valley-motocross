# Retained scene hierarchy and actor draw order

The original child traversal at `4206c0` is now recovered. It removes flagged children before drawing, skips disabled children and stops when a draw callback returns zero. It reads the next pointer after unlinking but before destruction. Unlinking, destruction and virtual drawing remain explicit callbacks; this milestone does not claim their internals are all recovered.

## Native traversal oracle

An isolated oracle executes the intact original traversal with recording unlink, destroy and draw callbacks. All 4,681 cases / 84,258 output words match, covering every removed/enabled/return combination for lists of zero through four children. Repeating the oracle produces byte-identical output. The callbacks establish control flow and call order, not the original unlink/destruction side effects.

## Scene initialization and projection

The capture snapshots the scene root and its linked hierarchy at the existing world-entry observation. Each node records its next sibling, first child, enabled/removal flags and virtual draw target. The model initializes the 76-node hierarchy once; subsequent snapshots are comparisons, never reseeds. A live deletion is rejected because unlink/destruction effects have not yet been connected to this retained scene model.

The original outer draw at `467f40` uses `10` bytes of locals/saves, then calls the draw method. That method, verified as `467a90`, reserves `b0` bytes including saved registers and calls the scene root. Thus the scene-root entry is `worldEntryEsp-c8`. All offsets here are hexadecimal.

Generic `4206c0` children and its `481300` tail alias enter `c` bytes below their parent. Actor wrapper `44faf0` children enter `f8` bytes below the wrapper. The wrapper forces a successful return after traversing children, even when child traversal returns zero. Combining these paths with the indexed-draw stack model derives actor application stack positions from the world entry and hierarchy.

Other callback types remain explicit boundary calls with observed return values. Their bodies are not simulated. The projection rejects any such callback whose subtree contains an actor wrapper, rather than silently dropping possible actor invocations. It also rejects cyclic child lists and missing nodes.

## Short live sample

Three complete draw intervals predict all 12 actor-wrapper calls in order and position, and all six observed actor state-application addresses. The projection also checks 198 reconstructed callback entries/returns against native order, stack positions and return values. Ten callback types remain opaque. Four earlier wrapper calls precede the hierarchy initialization and are reported as warmup; the last captured world interval is explicitly incomplete.

All 174 observation sites were restored and the debugger was absent after capture. The retained hierarchy matches 228 later node records, including the final snapshot. Negative tests reject changed snapshots, wrapper order/positions, callback returns and application addresses.

## Reproduction and remaining scope

Compile `child-draw-oracle.c` with 32-bit MinGW. Input records are five DWORDs: list length and four child flag words (bit 0 removed, bit 1 enabled, bit 2 callback success). Output records are 18 DWORDs: return value, event count, and up to eight `(kind, childIndex)` pairs, padded with zeros. Kind 1 is unlink, 2 destruction and 3 draw. Execute against the pinned original EXE in an isolated process.

`capture-scene-world-writers.c` combines hierarchy snapshots with the existing world-writer/HUD metadata and requires 84 records. It adds no breakpoint sites. Use the established scripted capture setup and independently verify all 174 sites afterward with the HUD, binding and binding-gate verifier macros. The world-entry metadata is labeled with the following draw's player-frame counter; the warmup and incomplete tail must remain explicit.

Opaque callback effects, scene mutations, graphics dirty-state evolution, camera inputs, non-actor renderer ordering and the known negative-steering frame-38 failure remain unresolved. This is progress toward full world execution, not full physics parity. Preview handling is unchanged.

## Longer combined capture: negative evidence

The retained scene projection also processes the longer 42-frame capture: 40 complete draw intervals, 3,040 later node comparisons, 2,640 callback checks and 130 derived actor application addresses. However, the combined writer check rejects the first next-bike carry (`00110000` predicted versus `0022f0b8` observed). This is preserved in `scene-world-negative-wine11.json.br` with a regression requiring that exact rejection. It is not counted as a successful combined replay. See `mcm-upload-copy-recovery.md` for the separately validated copy-save mechanism and remaining integration work.
