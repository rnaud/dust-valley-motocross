# State upload resource selection and follow-up command

The state-upload boundary now computes resource selection, resource-update
arguments and the command submitted after the update. The live analyzer joins
those computed arguments to staging, cleanup and actual heap writes. This does
not yet model the follow-up command handler's effects or full draw ordering.

## Native routine

Pinned wined3d RVA 0x1c6e00 uses an eight-row table at 0x2316e0. Byte units are
16,16,16,16,4,4,1,1; capacities are 256,224,16,16,16,16,1984,416. The resource
cache slot is device +0x12d4 + kind*4, with device read from command stream +4.

A missing resource invokes creation with six descriptor words:
`[unit*capacity,0,adapterFlag20?4:0,adapterFlag20?1:14,0,0]`.
The relevant adapter byte is +0x5a. A negative creation HRESULT skips both
resource update and follow-up command. Otherwise the returned resource fills
the cache slot. Resource creation internals remain an environment boundary.

For a selected resource, uint32 multiplication gives `start=offset*unit` and
`bytes=count*unit`. The update uses subresource zero, the upload data pointer,
row and slice pitches equal to bytes, and box `[start,0,start+bytes,1,0,1]`.
After that update the routine submits five words:
`[33,kind,offset,count,flags]`. This command is separate from update command 43.

## Isolated native validation

`oracle-render-resource-upload.c` executes the intact upload routine in a
separate process. Resource creation/update and command allocation/submission
are boundary stubs that record arguments and provide controlled results.
Arithmetic, resource-cache selection, branching and command writes are native.
The game process is not attached or modified by this oracle.

All 4,096 cases / 106,496 recorded words match the recovered model:

- All eight upload kinds and both adapter flag states.
- 2,048 cached-resource cases.
- 1,368 successful creations, including nonzero success HRESULTs.
- 680 failed creations, with no update or subsequent command.
- UInt32 offset/count wraparound and arbitrary command flags.

These are boundary calculations, not proof that arbitrary overflowing update
boxes are accepted by the real graphics resource implementation. Module hash:
`25feee6100619bd123fc00568d4e5107a3a20d60f62d160e12c368731fa32f1c`.

## Live joined evidence

The capture adds cache-slot and adapter observations at existing hook 131,
records the command allocation at 147, and reads its bytes after submission at
148. No new breakpoint sites are added. All 192 live uploads match computed
resource arguments and post-upload command bytes: 172 kind-6 and 20 kind-7.
They join through 20,336 staging bytes, 192 free decisions and 192 actual
cleanup heap stores with zero differences.

The analyzer feeds computed resource arguments into the previous staging
model. It does not feed observed command bytes or store values into prediction.
Resource cache handles, formats, allocator results, application entry ESP and
heap handle remain explicit environment/call-boundary inputs. Live resource
creation was not observed; creation outcomes are covered by the isolated oracle.

All ten requested records completed. The independent verifier checked all 167
instructions restored and no debugger attached. The retained replay matches
five bike/four rider updates with zero modeled physics differences and 58,722
visual differences. It does not reach the older frame-38 mismatch.

## Reproduction and remaining work

Run `node --test tests/mcm-render-resource-upload.test.js`. Fixtures retain raw
native inputs/outputs, live observations, trace hashes and cleanup evidence.
To repeat the oracle, decode its fixture's base64 input, compile with
`i686-w64-mingw32-gcc -O0 -Wall -Wextra -Werror`, and invoke under pinned Wine
with DLL/input/output paths. Each input record is nine uint32 words and each
output record is 26 words. Capture uses `capture-render-heap.c` and the existing
heap-recovery instructions.

Next: command 33 handler at RVA 0x1b4d60 and its backend callbacks, resource
creation/lifetime, remaining upload predicates, and shared-world draw ordering.
Those determine writes after cleanup and which value survives to the next bike
update. Full parity remains unproven; preview handling is unchanged.
