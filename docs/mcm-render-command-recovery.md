# Update command construction and cleanup

The pinned Wine update command is now constructed from producer arguments,
then used to decide whether cleanup tail-calls free. This closes the command
serialization/cleanup boundary, not resource staging, allocation, submission
thread selection, full renderer scheduling or the frame-38 physics mismatch.
Preview handling is unchanged.

## Native instruction coverage

`mcmRenderUpdateCommand` translates wined3d RVA 0x1ca1d8..0x1ca228. After
allocation, the 14 command words contain opcode 43, resource, subresource,
six box words, three upload words, row pitch and slice pitch. Inputs come from
the producer entry registers and stack; none are copied from command output.

`mcmRenderCommandFree` translates 0x1b63d9..0x1b6463. It returns a free request
only when command +0x2c mask 4 is set and +0x24 is zero. The pointer comes from
+0x28. A null pointer still requests free; it is distinct from skipping the
call and does not itself prove an allocator scratch write. Nonzero +0x24 can
take a diagnostic logging path, but does not free this pointer.

The standalone oracle loads the pinned DLL without imports, executes the
construction instructions, then executes the cleanup predicate and pointer
load. It redirects exits before submission, logging and actual free calls.
The original game is neither attached nor patched by this oracle.

- 4,096 native cases / 65,536 output words match.
- 1,024 request free, including 512 null pointers; 3,072 skip.
- Input flags cover every value 0..1023, with zero/nonzero buffer and pointer
  combinations. Other command fields contain deterministic randomized words.

`oracle-render-command.c` guards block entry and exit bytes. Module SHA-256:
`25feee6100619bd123fc00568d4e5107a3a20d60f62d160e12c368731fa32f1c`.
For reproduction, decode the base64 input in
`tests/fixtures/mcm/render-command-wine11.json.br`, compile the oracle with
`i686-w64-mingw32-gcc -O0 -Wall -Wextra -Werror`, and invoke it under pinned
Wine with DLL, input and output paths. Input records are 13 uint32 words;
output records contain the 14 command words, free-request flag and pointer.

## Live producer-to-cleanup validation

The capture adds producer arguments at existing hook 150, command words at
154, and cleanup fields at 154/157. It adds no breakpoint sites. All 191
commands / 2,674 words match computed serialization, and all 191 free calls
match the predicate. Cleanup fields remain unchanged between handler entry
and the cleanup test. Live skip branches did not occur; skip coverage comes
from the isolated native oracle.

The fixture retains producer inputs, observed command bytes, entry/pre-cleanup
fields and free-boundary observations. The analyzer builds its command only
from producer inputs, then compares outputs. Negative tests reject modified
producer flags and omitted native free observations.

The five-frame retained replay has five bike/four rider updates with zero
modeled physics differences and 70,553 visual differences. It is too short to
resolve the older frame-38 divergence. All 167 hooks independently verified
restored with `debugger=0 clean=1`.

## Debugger concurrency failure and fix

Full exception logging identified the intermittent 0x80000004 exits: one
global pending-step record was shared by all threads. A helper thread stepped
the heap hook while the main thread stepped an original-game hook. Its record
overwrote the main thread's pending step, causing the debugger to reject the
main thread's valid single-step exception as unhandled.

Pending steps are now tracked per thread (up to 64). A breakpoint is rearmed
only after all pending steps at that site finish. A queued breakpoint at an
already-disarmed site is still recognized. Cleanup clears trap flags for all
pending threads. Unrelated exceptions remain unhandled rather than silently
suppressed. `MCM_DEBUG_EVENTS=1` enables diagnostic exception records.

The successful native trace includes three overlapping breakpoint sequences,
each followed by correctly handled steps for both threads. Failure and success
excerpts, trace hash and independent cleanup evidence are retained in
`mcm-render-command-validation.json`. This fixes the demonstrated concurrency
failure; it does not explain the separate intermittent startup access violation.

A second capture in the same process, with exception logging disabled and a
same-process local checkpoint restored, completed ten records again. All 192
commands / 2,688 words and 192 free gates matched; independent cleanup again
verified all 167 instructions and no debugger. This checks reattachment without
depending on diagnostic logging delays. It is not a full-world reset.

## Remaining work

Resource-update staging still supplies the upload words to this producer.
Recovering that selection/allocation policy is required to compute free
eligibility from the original state upload, rather than observed producer
arguments. Submission mode, null/free allocator branches, other upload
families and shared-world visibility/order remain open.

Run `node --test tests/mcm-render-command.test.js` for isolated and live checks.
