# Later transform and parameter upload gates

Three additional Wine state-application upload families are translated in
`mcmRenderAuxiliaryUploads`. This narrows the conditions leading toward the
known cleanup heap write; it does not predict allocation/free lifetime or
resolve the older frame-38 steering divergence. Preview handling is unchanged.

## Pinned branches

All offsets below are relative to the pinned Wine 11 wined3d module. The inputs
are the incoming state +0x108 DWORD and raw state +0x2540 field. The latter's
semantic name is not established here.

| Gate | Return RVA | Kind | Flags | Offset | Bytes | Data |
| --- | --- | --- | --- | --- | --- | --- |
| +0x108 mask 0x02, +0x2540 zero | 0x1c158e | 6 | 0x4000 | 0 | 128 | local +0xa0 |
| +0x108 mask 0x02, +0x2540 nonzero | 0x1c10ab | 6 | 0xc000 | 0 | 256 | local +0xa0 |
| +0x108 mask 0x01 | 0x1c004f | 6 | 0x20000 | 320 | 512 | local +0x1e0 |
| +0x108 DWORD mask 0x140 nonzero | 0x1c0374 | 7 | 0x400 | 388 | 28 | local +0xa0 |

The first branch begins at 0x1bffd9 / 0x1c101f. It reads matrix zero through
0x7f5a0, then checks state +0x2540. The zero branch calls 0x21960 to build a
second matrix; the other branch reads three additional matrices. The texture
branch calls 0x7fa90 eight times. Their payload calculations remain unmodeled.
The parameter gate is at 0x1c0259. It combines byte +0x109 bit 1 and byte
+0x108 bit 0x40; its payload calculation also remains unmodeled.

`mcmRenderProductAddress(entryEsp)` derives local +0xa0. The texture upload's
source adds 0x140 bytes. These families retain their observed relative order,
but other upload families can execute between them; this is not the complete
state-application schedule.

## Live evidence

The capture adds a read of state +0x2540 at the existing apply-entry hook.
Across 871 applications, all 44 relevant calls match gate, ordering, kind,
flags, offset, byte count and derived source address:

- 20 two-matrix uploads (128 bytes).
- 8 texture-matrix uploads (512 bytes).
- 16 parameter uploads (28 bytes).

No 256-byte branch occurred: that branch is translated from disassembly but
is not native-validated by this fixture. No payload or scratch output is used
as a model input. The preparation boundary's dirty words match incoming words
throughout this trace; the analyzer checks this explicitly.

`tests/fixtures/mcm/render-auxiliary-uploads-wine11.json.br` stores all 871
applications, including skipped calls, trace hash and independent restoration
report. All 167 instructions were restored and `debugger=0 clean=1`. The
capture completed five player frames / ten records from a same-process local
checkpoint; that checkpoint does not restore the full world.

Run `node --test tests/mcm-render-auxiliary-uploads.test.js`. Negative checks
reject an incorrect size-branch input and incorrect texture source address.
Capture reproduction uses the existing commands in
`mcm-render-heap-recovery.md` and `capture-render-heap.c`.

## Capture reliability limits

A subsequent command-free capture failed before any frame and the original
exited with 0x80000004. Its data is excluded. The capture error path now avoids
setting the trap flag when an observation has already failed. A forced abort
at the first existing hook left the restarted original alive, all 170 checked
capture/startup instructions restored, and no debugger attached.

This change does not explain or fix every single-step exit: another attempted
free-condition capture still exited before its first frame. Native exception
logging and the remaining command-free observation path need investigation.
The successful upload-gate capture above predates these failed follow-ups and
has its own verified cleanup evidence.
