# Resource staging through the cleanup heap store

The temporary-allocation path now computes pitches, staging fields, unmap
outputs, update commands, free eligibility and the final heap-store address and
value. Allocation success/address and the process heap handle remain explicit
environment inputs. This is a joined renderer boundary, not full renderer
scheduling or a fix for the older frame-38 physics divergence.

## Recovered path

Resource update RVA 0x1c56c0 calls command-stream vtable +0x0c with map flags
0x40000000. The observed callback is 0x1b6840. Since flags &0x3000 is zero, it
selects temporary allocation at 0x1b6a48. Native 0x7f4e0 computes row/slice
pitches and allocation size using helpers 0x1d8ce0 and 0x1d8db0.

`mcmRenderStagingSize` follows their uint32 arithmetic, including intermediate
wraparound, block dimensions, scaled slice pitch and planar format branches.
Format data is captured through offset +0x80. Zero divisors are outside the
fixture domain and are rejected rather than silently producing JavaScript
infinities; the native integer divide would fault.

After a nonnull allocator result, native staging stores buffer=0, pointer=result,
flags=5 and the six input box words at resource +0x68..+0x88. Failed allocation
sets the mapped pointer to zero and returns failure without replacing those
resource fields. The allocator itself is not emulated.

The observed unmap callback, vtable +0x10 / RVA 0x1b7ab0, copies the heap-backed
staging fields and box to its outputs, then clears all nine resource words.
These computed outputs feed the recovered command producer and free predicate.
The buffer-backed reference-counting path is explicitly unsupported by this
model; it is not silently approximated.

## Isolated native evidence

`oracle-render-staging-size.c` executes intact 0x7f4e0 and its native callees.
All 4,096 cases / 12,288 words match the recovered sizing math. The broader
`oracle-render-staging.c` executes intact map/unmap routines while replacing
only the malloc import with a controlled result. It records requested size,
mapped output, resource state, return values and unmap outputs/state.

All 4,096 map cases / 135,168 output words match, including 2,048 successful
allocations and 2,048 allocation failures. Inputs span ordinary, block, scaled
and planar format branches, signed-looking uint32 dimensions and wraparound.
Failure cases preserve arbitrary prior staging state. Unmap is called only
after successful map, matching the supported caller path.

The DLL SHA-256 is
`25feee6100619bd123fc00568d4e5107a3a20d60f62d160e12c368731fa32f1c`.
Diagnostic logging is disabled in the isolated process; arithmetic and branch
instructions are intact. The oracle does not attach to the original game.

## Live resource-to-memory validation

The first capture matched 212 resource updates. A second capture adds actual
after-store memory reads at the existing heap hook. All 222 uploads match:

- Computed pitches and temporary staging state (22,492 requested bytes total).
- Unmap fields and clearing of resource staging state.
- Producer arguments, all command words and free decisions.
- Derived heap-store addresses and actual after-store memory values.

The allocation pointer is taken from the mapped result as an explicit allocator
boundary. The heap handle was independently read from the live ucrtbase global
at 0x7bbc2dd0 (module base 0x7bb00000 plus RVA 0xc2dd0), yielding 0x00110000.
Observed command bytes, free events and store values are comparison targets;
they are not fed back into staging calculations. Application entry ESP remains
an observed call boundary for the stack-address derivation.

Live captures cover successful heap allocations with format ID 91. Other format
and allocation-failure coverage is isolated native execution. Both captures
completed ten records; all 167 hooks were independently verified restored with
no debugger attached. The second retained replay matches five bike/four rider
updates with zero modeled physics differences and 63,854 visual differences.
This short run does not reach the older frame-38 failure.

## Reproduction and remaining work

Run `node --test tests/mcm-render-staging.test.js`. Native fixtures preserve raw
input/output and trace hashes. Decode the isolated fixture's base64 input,
compile `oracle-render-staging.c` with `i686-w64-mingw32-gcc -O0 -Wall -Wextra
-Werror`, and run under pinned Wine with DLL/input/output arguments. Records
contain 49 input uint32 words and 33 output words. Live capture uses
`capture-render-heap.c`; no new breakpoint sites were added.

Still required: state-upload-to-resource argument construction, resource
creation/lifetime, other upload families, fallback submission on failed map,
submission mode, and shared-world draw visibility/order. Those determine which
computed stores happen and survive to the next physics update. Preview handling
is unchanged by this milestone.
