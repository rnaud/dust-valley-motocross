# Particle draw cleanup overwrites physics caller scratch

This milestone identifies the source of `0x00110000` seen after some original
particle draws. It does not fix the older negative-steering frame-38 divergence,
recover particle visibility/upload eligibility, or establish whole-world parity.
The preview simulation does not yet call this isolated store model.

## Exact observed write

The pinned Wine CRT process heap handle is `0x00110000` (read from ucrtbase
RVA `0xc2dd0`; its alternate heap at `0xc2dcc` is zero). This is a heap address,
not a graphics flag or a physics constant.

In one particle draw, four temporary upload buffers are freed. Each follows:

1. Original particle `DrawIndexedPrimitive` call `0x43b8aa`.
2. ddraw RVAs `0x98d0`, `0xb340`, `0xf530`, `0xea20`.
3. `wined3d_device_apply_stateblock`, RVA `0x1bd500`.
4. State upload `0x1bf98f` → `0x1c6e00` → resource update `0x1c56c0`.
5. Update command `0x1ca180` → synchronous submission `0x1b79f0`.
6. Command 43 handler `0x1b6330`; cleanup branch `0x1b6460` tail-calls CRT `free`.
7. ucrtbase `free`, RVA `0x5a3e0`, calls `HeapFree` with the process heap.
8. ntdll `RtlFreeHeap`, RVA `0x24d20`, calls helper `0x504e0`.
9. **ntdll RVA `0x504f0`: `mov [ebp-0x14],eax`** writes the heap handle.

The instruction was observed at live address `0x7bf904f0`. Immediately before
it, EAX is `0x00110000`, EBP−0x14 is `0x22f038`, and memory there is `0x22f050`.
Immediately afterward, memory is `0x00110000`. All four frees reproduce this.
The same value survives particle-draw return and the next bike-update entry.

The upload also causes earlier writes of a context pointer and stack pointer.
Consequently neither the last matrix store nor a constant particle value models
all intervening memory behavior.

## Derived stack address

`mcmRenderHeapStore(stateApplyEntryEsp, heapHandle)` derives the destination
from the pinned synchronous call chain. With state-application entry ESP
`0x22fa5c`, its aligned prologue base is `0x22fa40`:

| Boundary | Stack address |
| --- | --- |
| State-application local frame, aligned base − 0x860 | 0x22f1e0 |
| State-upload local frame | 0x22f174 |
| Resource-update local frame | 0x22f0d8 |
| Synchronous-submit local frame | 0x22f0ac |
| Command-handler local frame | 0x22f078 |
| CRT free local frame | 0x22f098 |
| RtlFreeHeap local frame | 0x22f054 |
| Helper EBP − 0x14, aligned base − 0xa08 | 0x22f038 |

Tail calls restore prior frames; the table is not a monotonically descending
list. The model takes the heap handle as an environment input and does not
hard-code `0x00110000`. It does not decide whether this path executes.

## Capture and coverage

`capture-render-heap.c` preserves the original moving-render capture and adds
all-actor wrappers, HUD/root/scene/particle boundaries, and the Wine call-path
observations. It uses 167 guarded INT3 sites, never CALL/REP single-stepping.
The diagnostic is pinned to the recorded module load addresses; mismatched
instruction guards abort. It deliberately overrides player controls, timestep
and RNG as documented in `mcm-moving-render-recovery.md`. Exactly ten records
(five player frames) are required. Local checkpoint restoration does not restore
the camera, opponents or shared world.

The retained fixture contains all 182 observations within the one visible
particle draw, the following bike-entry scratch word, source/module/raw-file
hashes, and an independent 167-site cleanup report. It proves four exact stores
at one stack alignment, not exhaustive allocator/render-path coverage.

The full five-frame replay reports five bike updates, four rider updates and
four pool updates with zero modeled physics differences; 58,501 visual word
differences remain, including 58,482 particle words. It does not reach the older
frame-38 failure. Intermediate 20-, 20-, and 10-frame traces also replayed with
zero modeled physics differences while retaining visual mismatches.

## Reproduction

Compile with the pinned i686 MinGW toolchain, including this directory:

```sh
i686-w64-mingw32-gcc -O0 -Wall -Wextra -Werror -I scripts/mcm-reference \
  scripts/mcm-reference/capture-render-heap.c -o /tmp/capture-render-heap.exe
i686-w64-mingw32-gcc -O0 -Wall -Wextra -Werror -I scripts/mcm-reference \
  scripts/mcm-reference/verify-render-heap.c -o /tmp/verify-render-heap.exe
node --test tests/mcm-render-heap.test.js
```

Use the moving-render capture's output/environment flags with this helper and
record limit `10`. Run `verify-render-heap.exe PID` before and independently after
the capture; require every site restored and `debugger=0 clean=1`. A same-process
local checkpoint can be encoded with `encode-replay-checkpoint.mjs`; never use
one from a different allocation layout/process. The fixture is an observation
audit, not a portable native save or a complete model of this render path.

Next: recover the dirty-state/temporary-buffer/particle gates, combine the
computed heap store with matrix and HUD writers in actual order, then rerun the
older negative-steering fixture without observed scratch injection.
