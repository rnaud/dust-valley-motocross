# MCM core recovery: scheduler and square root

November 12, 2026. Analysis of the executable pinned in
`mcm-binary-evidence.json`. These are isolated translations in `src/physics/mcm/`,
not replacements for the live Cannon simulation. Follow-up execution under Wine
11/Rosetta now validates the original helper instructions against the port:
130,052 sqrt cases and 4,190 scheduler cases, zero differences. See
`mcm-helper-validation.json` and `scripts/mcm-reference/README.md` for the exact
scope and reproduction. The original now runs a practice event; 300 live scheduler pairs also match
bit-for-bit (see `mcm-live-validation.json`). Raw bike-object snapshots exist,
but complete force/integration telemetry and replay are still outstanding.

## Scheduler

Range `0x4a54b6–0x4a5552`; object base is ESI.

| Location | Interpretation | Evidence |
|---|---|---|
| object + `0x8c8` | float32 carried time | read at `0x4a54b6`, written at `0x4a54f6` / `0x4a5510` |
| object + `0x8cc` | float32 nominal step | initializer `0x4a2104`: 0.019999999552965164 |
| object + `0x8d4` | integer iteration cap | initializer `0x4a2114`: 10 |
| stack + `0xbfc` | supplied float32 frame delta | added at `0x4a54bc`; zero test at `0x4a5521` |
| stack + `0x64` | float32 total time | non-popping store at `0x4a54c3` |
| stack + `0x10` | selected float32 substep dt | assigned by both paths |
| stack + `0x20` | selected integer iteration count | assigned by both paths |

The sum stays on the x87 stack after its float32 store. Division uses that
unrounded sum. Helper `0x4be978` temporarily sets rounding toward zero, converts
to a 64-bit integer, restores the control word, and returns the low word in EAX.
The translated API rejects counts beyond signed int32 instead of simulating
overflow outside the supported timing domain.

For nonzero whole-step counts, the remainder is the **stored** total minus the
**uncapped** count times the nominal step, stored back as float32. Only then is
the execution count capped at ten. Whole steps beyond the cap are lost.

For zero whole steps, carry is cleared and one step runs. A nonzero frame delta
selects the stored total, including carry; either signed zero selects the nominal
step. Thus 60 Hz frames normally run 60 short steps per second. A zero delta does
not itself mean pause; upstream pause handling remains unknown.

The distinct sum representations can produce a tiny **negative remainder**:
delta 0.09999999403953552 plus carry 2^-28 selects five steps but stores -2^-28.
The port preserves this value. Clamping it to zero changes subsequent timing.
Rounding upward can likewise leave a remainder equal to the nominal step; the
next call accepts it instead of enforcing a mathematical fractional-time range.

JavaScript double arithmetic with explicit float32 stores is not an x87 emulator.
The recovered control flow is implemented and tested against original instructions
under controlled 53-bit and 64-bit x87 precision; extreme
inputs, inverse-dt intermediate precision, upstream elapsed-time production and
downstream loop execution still require reference execution. `inverseDt` reports
the division result without inventing a float32 store.

## Square-root lookup

Initializer `0x401640–0x4016b2` builds 256 words at `0x4ed848`. For each index
0–127 it constructs float32 values with bits `(0x3f80 | index) << 16` and
`(0x4000 | index) << 16`, takes hardware square root, stores float32, and masks
with `0x7f0000`. The two results populate the lower and upper halves of the table.
The port generates this table from the recovered formula; no binary data dump
is shipped.

Lookup `0x4016c0–0x40171e` returns positive zero for either signed zero. Otherwise
it extracts the exponent, uses its parity and the seven highest mantissa bits to
index the table, and combines the table word with the halved exponent. The low
16 mantissa bits of the input do not affect the result. For example, sqrt(2)
returns float bits `0x3fb50000` (1.4140625).

The public helper supports positive normal float32 inputs and signed zero.
Subnormals, negative values, infinity and NaN are explicitly rejected: the original
bit manipulation is not a general IEEE square-root implementation, and those
domains have not been validated for physics use. Table construction assumes the
usual round-to-nearest float32 store; live scheduler captures observe control word `0x027f`; table initialization
has not been independently traced in that run. Tests sweep all 254 normal exponents and 128 mantissa bins, including
both ends of each bin, and check known outputs and powers of four.

Suspension calls this lookup on the float32 squared velocity length at
`0x4b1208`. Its damping coefficient uses a separate hardware `fsqrt` at
`0x4b1245`. Replacing every square root with the lookup would therefore be wrong.
The suspension caller geometry and arguments remain prerequisites for porting
the complete force path.

## Reproduction and next gate

Run `node --test tests/mcm-core.test.js`. Run the existing `inspect-mcm.py` command
to verify the four instruction-range hashes against the supplied executable.
Hashes identify reviewed bytes. Captured execution fixtures now live in
`tests/fixtures/mcm/helpers-wine11.json`; the ordinary test suite checks those
original outputs without requiring Wine.

Wine 11.0 and Rosetta are installed. The original game was launched from a
separate, hashed copy. Installation/path checks were resolved, but graphics
initialization still crashes or stalls with the tested wrappers; no playable menu
or repeatable gameplay is claimed. See [runtime status](mcm-runtime-status.md).
The next gate remains stable gameplay and a capture of the actual player update,
input/dt sequence and FPU state. The successful synthetic helper comparison does
not establish native-Windows equivalence or whole-bike parity.
