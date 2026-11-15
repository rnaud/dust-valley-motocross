# Host upload copy and retained stack writes

The newer combined scene/world trace rejects its first next-bike carry: the existing model predicts heap handle `00110000`, but the original retains `0022f0b8` at `0022f038`. This negative result is preserved in `scene-world-negative-wine11.json.br`; its regression must continue rejecting the mismatch until the missing writer is actually connected. The strict carry check has not been relaxed.

## Exact mechanism

The change occurs between wined3d RVAs `199094` and `1990dc`, with caller ESP `0022f088`. The indirect call at `1990d9` resolves to `6b30`, a tail jump to `1a2480`. A separate live trace confirms that target for all 188 observed callbacks.

When both upload descriptors have a zero buffer pointer, `1a2820` selects the host-memory copy loop. Each range calls the original memcpy import at `1a2856`. The pinned import resolves to ucrtbase `610c0`, which jumps to `61280`. The prologue's `push EDI` at `61283` saves the destination-descriptor address.

For caller ESP S, the upload callback body is S−44. The memcpy CALL and saves put EDI at S−50. The resource handler prepares its destination descriptor at S+30. For S=`0022f088`, these compute address `0022f038` and value `0022f0b8`, exactly the earlier mismatch. Offsets are hexadecimal. The old trace did not capture descriptor-buffer inputs, so this arithmetic is evidence of the mechanism, not a completed replay of that failing interval.

## Validation

The isolated oracle executes intact wined3d `1a2480` with the real pinned CRT memcpy. Across 612 cases (0–8 ranges, lengths 0–16, four flag patterns), all saved-pointer checks and 156,672 copied/untouched bytes match. A repeated isolated run is byte-identical. Zero ranges preserve the prior stack word; positive range counts still save EDI when the copy length is zero.

A subsequent live trace records both descriptor-buffer pointers at the resource-handler boundary and before/after observations around the host copy. All 194 callbacks use host-memory descriptors; all 194 predicted save addresses and values match. The caller's count is one at `1990c3`. These live saves do not overlap the bike slot in this sample. All 176 guarded sites were restored, and independent verification found no attached debugger.

`mcmHostUploadCopyStores` computes the stores from callback inputs. Buffer-backed paths remain explicit boundaries. It is not yet wired into `analyzeWorldWriters` or the preview; callback scheduling, descriptor lifetimes, buffer-backed branches and ordered competition with other writers remain work to do.

## Reproduction

Compile `upload-copy-oracle.c` using 32-bit MinGW; run with the pinned wined3d DLL, input path and output path. Each input is three DWORDs: range count, range length, flags. Each output is a DWORD indicating a correct saved pointer (or untouched sentinel for zero ranges), followed by all 256 destination bytes. The fixture retains input/output bytes and hashes.

Compile `capture-upload-copy.c` for the established scripted ten-record capture. Its two extra hooks are ordinary MOV/CMP instructions at wined3d `1a2838` and `1a285b`, not CALL or REP instructions. Compile the independent verifier with `MCM_CAPTURE_HUD_LINE_STORES`, `MCM_CAPTURE_RENDER_BINDING`, `MCM_CAPTURE_BINDING_GATES`, and `MCM_CAPTURE_UPLOAD_COPY` to verify all 176 sites afterward. Use one live debugger at a time.
