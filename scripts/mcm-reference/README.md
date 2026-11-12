# Original-instruction reference harness

This harness executes the user's original MCM x86 instructions under Wine. It
validates individual recovered helpers without needing a working graphics stack.
It does not start the game's normal entry point or produce whole-bike telemetry.

Prerequisites: Wine with 32-bit Windows support, `i686-w64-mingw32-gcc`, Node,
and the executable whose SHA-256 is pinned in `compare.mjs`. On Apple Silicon,
the tested Wine 11 build uses Rosetta. No game binary or wrapper is distributed
in this repository.

```sh
WINEPREFIX=/absolute/path/to/reference-prefix \
  node scripts/mcm-reference/compare.mjs /absolute/path/to/mcm.exe /tmp/mcm-oracle
```

`MCM_WINE` overrides the Wine path; `MCM_CC` overrides the cross-compiler. The
output directory receives the compiled harness, generated cases, raw JSONL,
Wine log and summary report. Use a dedicated prefix, not a personal game prefix.
The runner rejects an unknown executable before compilation/execution. It fails
on a subprocess error, missing/misaligned rows, or any differing compared field.
Wine's output goes to a file because its background services can hold pipe file
descriptors open after the helper exits.

The C harness maps the PE's sections and applies its own HIGHLOW relocation
table to load it at 0x20000000. This avoids low-address Wine mappings. It invokes
only the table initializer, sqrt helper, scheduler slice and the scheduler's
integer conversion helper. A private in-memory exit jump after the scheduler's
inverse-dt calculation returns to the harness. Original files are never patched.
The fake bike object and stack contain only the fields those instructions read.

Each case starts with `fninit` and the selected x87 control word: 0x027f (53-bit
precision) or 0x037f (64-bit extended precision), round-to-nearest. These are
controlled test conditions; they are not yet measurements of the in-game FPU
state. Returned inverse dt is captured as binary64; dt and carry use raw
binary32 bits. Tests cover all normal float32 exponents and both ends of every
lookup bin, signed zero, scheduler boundaries, carry edge cases and seeded
random timing inputs. Unsupported numeric domains are not covered.

`docs/mcm-helper-validation.json` records the successful run's hashes and counts.
`tests/fixtures/mcm/helpers-wine11.json` preserves 122 representative original
outputs for `npm test`, without requiring Wine in CI. Regenerate the full report
with the command above; do not treat these fixtures as native Windows gameplay
traces. Wine/Rosetta numerical behavior still needs a Windows cross-check.

## Preparing a complete installation

```sh
python3 scripts/mcm-reference/prepare.py /path/to/original /path/to/new-reference
```

This refuses an existing destination, an unknown executable, symlinks, or a
destination inside the source. It hashes all source files and verifies the copied
bytes. The originals remain untouched. Then initialize a dedicated Wine prefix
at `new-reference/prefix` and import the supplied `motocmad.reg` with
`wine reg import ... /reg:32`; a 64-bit registry import alone is insufficient.

Import `graphics.reg` into that dedicated prefix before starting the game:

```sh
WINEPREFIX=/absolute/new-reference/prefix wine reg import \
  "Z:\\absolute\\repository\\scripts\\mcm-reference\\graphics.reg"
WINEPREFIX=/absolute/new-reference/prefix wineserver -k
bash scripts/mcm-reference/launch.sh /absolute/new-reference
```

`launch.sh` uses Wine builtin DirectDraw and the OpenGL renderer. `graphics.reg`
limits reported video memory to 256 MB and enables the MCM virtual desktop.
The cap avoids the original's signed video-memory overflow. No dgVoodoo or
DXVK wrapper is needed for the working configuration. Always use the full
Windows executable path and game working directory, as the launcher does.
See `docs/mcm-runtime-status.md` for evidence and the local installation path.

## Experimental live capture

Compile the debugger with `i686-w64-mingw32-gcc -O2 -Wall -Wextra
scripts/mcm-reference/capture-live.c -o /tmp/capture-live.exe`. Start a practice
event, find its **Windows PID**, and verify the running installation's `mcm.exe`
SHA-256 matches the pinned hash in `compare.mjs`. Do not use a native macOS PID.
The helper additionally checks both complete breakpoint instruction encodings.

```sh
WINEPREFIX=/absolute/new-reference/prefix WINEDEBUG=-all \
  wine /tmp/capture-live.exe WINDOWS_PID 'Z:\tmp\capture.jsonl' 240 > /tmp/capture.log 2>&1
node scripts/mcm-reference/compare-live.mjs /tmp/capture.jsonl
```

The output path must be new. The debugger restores its in-memory breakpoints
and detaches after the requested even record count (maximum 10,000), or times
out after 30 seconds without a debug event. If it cannot safely restore execution
state, it terminates only the attached game. Use the dedicated reference process.
Do not interrupt the debugger during capture. The executable on disk is unchanged.

Each pair records state immediately before and after the **scheduler**, not a
complete force/integration step. Records include ESI (bike object address), thread,
x87 control word, raw float32 scheduler inputs/outputs, and the proven 0xcc8-byte bike allocation. Older archived captures read
4096 bytes; their trailing 824 bytes are not bike state. Pointer targets, contacts, full input events, and other objects are
not captured. This is a foundation for whole-bike telemetry, not a replayable
whole-world checkpoint. AI and player bikes both appear; their identities are not
yet labeled. The debugger changes elapsed time; observed timing must be used in
comparisons. Capture filenames do not by themselves establish stationary motion
or a verified throttle sequence.

`tests/fixtures/mcm/live-scheduler-wine11.json` retains scalar observations from
three live captures. Large raw state dumps stay in the local reference directory.
`docs/mcm-live-validation.json` records their hashes and comparison results.

## Controlled player replay and throttle validation

The current local rider is PDM. Bike `+0x614 == 0` selects the local-input branch;
GLENN has `+0x614 == 1` and takes AI input. Addresses are session-specific, so
`capture-bike.c` selects by the branch flag rather than a hardcoded heap address.
The existing capture is a local-player/AI session; network/ghost modes have not
been validated.

Compile `capture-bike.c` with the same MinGW command as `capture-live.c`. Without
`MCM_SCRIPTED`, it records the local bike at `0x4a54b6` and `0x4ad0e1`, plus the
known engine-state prefix. With `MCM_SCRIPTED=1`, it supplies float32 0.02 frame dt,
overrides the original digital throttle query on frames 50 through 199, and
supplies CRT RNG seed 12345 inside the player update. The original throttle,
shift, forces and integration code still executes.

The first controlled frame saves a **partial local checkpoint**: the 0xcc8-byte
bike, 0x1f0-byte engine, known component allocations, transform-tree prefixes and
scalar filters. At frame 400 it restores that checkpoint and repeats. Use 1600
records for two 400-frame before/after runs. This has been tested only within one
unchanged live event. Do not reuse it across loading, object destruction, network
play or another executable version. Opponent, camera and world state are not
restored. The initial checkpoint is the current bike state, not an automatic
race restart.

```sh
WINEPREFIX=/absolute/new-reference/prefix MCM_SCRIPTED=1 WINEDEBUG=-all \
  wine /tmp/capture-bike.exe WINDOWS_PID 'Z:\tmp\replay.jsonl' 1600 > /tmp/replay.log 2>&1
node scripts/mcm-reference/compare-bike.mjs /tmp/replay.jsonl
```

The comparator reports all differing words, including four currently unexplained
inherited fields. Thus it currently exits nonzero even though all compared motion
fields and captured engine bytes repeat exactly. This is original-versus-original
repeatability, not proof of port parity. See `docs/mcm-player-replay-validation.json`.

`capture-throttle.c` observes the digital engine-input helper independently.
Exercise Up Arrow and release while capturing; `compare-throttle.mjs` compares
its outputs against `src/physics/mcm/throttle.js`. A 10,000-event capture produced
2,495 complete local-player pairs: 2,301 pressed, 194 released, 31 with a nonzero
shift timer. All compared output bits match. `docs/mcm-throttle-validation.json`
records provenance; regression fixtures retain 321 cases. Analog input filtering
is outside this helper's validated scope.

Automatic gearbox and drive-force validation (same pinned executable and Wine prefix):

```sh
node scripts/mcm-reference/compare-gears.mjs live-shift.jsonl
node scripts/mcm-reference/compare-gears-oracle.mjs /path/to/mcm.exe live-shift.jsonl /tmp/new-gear-results
node scripts/mcm-reference/compare-force-oracle.mjs /path/to/mcm.exe live-shift.jsonl /tmp/new-force-results
```

The output directory must not already exist. Both mapped oracles use the captured
engine parameter table and original instructions with x87 control word 0x027f.
The shift oracle supplies the CRT random draw; the force oracle changes no helper
instructions. Reports include executable, source, input and result hashes.
`capture-force.c` is an experimental probe: its first live run failed without
records and it is not yet a validated capture path. See the player telemetry
notes for precisely which helper and whole-bike comparisons have passed.

Final linear integration can be validated without a live parameter capture:

```sh
node scripts/mcm-reference/compare-integrate-oracle.mjs /path/to/mcm.exe /tmp/new-linear-results
```

This executes `0x4ab38e–0x4ab49e` from the pinned image with supplied position,
velocity, accumulated delta velocity, dt and bike `+0x61c` flag. The only private
patch is an exit jump after the selected slice. It does not validate upstream
forces, contacts or angular integration. Thirty thousand cases matched every
position/velocity/speed output word under the observed game control word 0x027f.

Opposing-acceleration helper validation:

```sh
node scripts/mcm-reference/compare-opposing-oracle.mjs /path/to/mcm.exe /tmp/new-opposing-results
```

This calls the original `0x4b0a70` helper without changing its instructions.
Inputs are independent velocity, acceleration and opposing-acceleration vectors,
dt and a three-bit axis mask. Checked fixtures preserve raw input/output words.

Orientation preparation prerequisites:

```sh
node scripts/mcm-reference/compare-inverse-sqrt-oracle.mjs /path/to/mcm.exe /tmp/new-inverse-results
node scripts/mcm-reference/compare-rotation-step-oracle.mjs /path/to/mcm.exe /tmp/new-rotation-results
```

The first executes the original table initializer and reciprocal-square-root
helper and compares binary64 return bytes. The second executes the original
angular axis/angle preparation with private exit jumps before transform mutation
and at the skip destination. It compares angle, axis and apply/skip decision;
it does not claim matrix or complete orientation parity.

Local matrix rotation:

```sh
node scripts/mcm-reference/compare-transform-oracle.mjs /path/to/mcm.exe /tmp/new-transform-results
```

The harness calls the unchanged original matrix multiply and axis-angle rotation
helpers on an isolated transform node. It checks general matrices as well as
identity inputs and compares all matrix words. Child transform trees and the
pivot wrapper are excluded from this comparison.

Pivot rotation:

```sh
node scripts/mcm-reference/compare-pivot-oracle.mjs /path/to/mcm.exe /tmp/new-pivot-results
```

This calls the unchanged original `0x4b8070` wrapper, including its translation,
rotation and reverse translation. The isolated node has no children. Matrix
words and its cache flag are compared; scene-tree propagation is excluded.

Suspension force helper:

```sh
node scripts/mcm-reference/compare-suspension-oracle.mjs /path/to/mcm.exe /tmp/new-suspension-results
```

The harness initializes the original coarse square-root table and calls the
unchanged `0x4b11e0` helper. It compares combined force and damping vectors from
supplied original-unit inputs. Contact geometry, activation and application
points are not included in this helper comparison.

Validate the contact torque helper and its angular-velocity side effect:

```sh
node scripts/mcm-reference/compare-contact-torque-oracle.mjs /path/to/mcm.exe /tmp/mcm-contact-torque-new
```

The output directory must not already exist. The finite float32 cases include
orientation and angular-velocity branch boundaries, AI and flag combinations,
and input/component scaling boundaries. Whole-bike caller sequencing is excluded.

Validate hierarchical world transforms and inverse vector rotation:

```sh
node scripts/mcm-reference/compare-world-transform-oracle.mjs /path/to/mcm.exe /tmp/mcm-world-transform-new
```

The 24,000 cases execute the original root/child/grandchild and cached paths,
comparing matrix, vector, and cache-flag outputs word-for-word.

Validate the connected angular inertia/damping/integration block:

```sh
node scripts/mcm-reference/compare-angular-step-oracle.mjs /path/to/mcm.exe /tmp/mcm-angular-step-new
```

The oracle enters `0x4aaa55`, leaves at `0x4aaf02`, and supplies the original
stack operands. Contact correction flag `stack+0x24` is clear; both `bike+0x844`
inertia branches execute. An exit jump returns control to the harness after
the original instructions finish. It compares 12 float32 output words per case.

Validate contact-driven orientation corrections:

```sh
node scripts/mcm-reference/compare-contact-correction-oracle.mjs /path/to/mcm.exe /tmp/mcm-contact-correction-new
```

This executes `0x4aaa55–0x4aaded`, including both state branches and supplied
contact flags, and compares matrix, acceleration, correction and mask outputs.
Original X/Z axis initializers run before the cases. Contact detection and the
subsequent damping/integration block are outside this oracle's scope.

Validate contact corrections and angular integration together:

```sh
node scripts/mcm-reference/compare-angular-contact-oracle.mjs /path/to/mcm.exe /tmp/mcm-angular-contact-new
```

This executes the full `0x4aaa55–0x4aaf02` block with supplied contact operands
and compares 30 output words, including corrected orientation and angular state.
The node is a root transform. Contact detection and force generation are excluded.

Validate the contact force limiter:

```sh
node scripts/mcm-reference/compare-contact-force-limit-oracle.mjs /path/to/mcm.exe /tmp/mcm-contact-force-limit-new
```

This calls the unmodified original `0x4ad310` helper and compares the returned
vector plus both mutable scalars (force magnitude and remaining velocity budget).

Validate front and rear tire force generation:

```sh
node scripts/mcm-reference/compare-tire-force-oracle.mjs /path/to/mcm.exe /tmp/mcm-tire-force-new
```

Each case calls both original helpers (`0x4b1870` and `0x4b1960`), comparing
alignment, perpendicular component, magnitude and force vector. Inputs include
aligned and perpendicular directions and zero load. Contact generation is excluded.

Validate contact force and torque accumulation:

```sh
node scripts/mcm-reference/compare-contact-accumulation-oracle.mjs /path/to/mcm.exe /tmp/mcm-contact-accumulation-new
```

This calls original `0x4b1570` for every contact-flag combination and compares
force, remaining velocity budget, total force, and total moment-arm torque.

Validate steering-induced velocity correction:

```sh
node scripts/mcm-reference/compare-steering-velocity-oracle.mjs /path/to/mcm.exe /tmp/mcm-steering-velocity-new
```

The harness binds KERNEL32 imports and calls the original CRT heap/thread
initializers before testing. All generated inverse-cosine domain errors are
included and counted. Cases compare world velocity, temporary velocity, stored
radius and returned turn angle; every domain-error case is retained as a fixture.

Validate suspension component travel and velocity:

```sh
node scripts/mcm-reference/compare-suspension-travel-oracle.mjs /path/to/mcm.exe /tmp/mcm-suspension-travel-new
```

The original `0x49e900` helper updates travel, displacement, derived suspension
velocity, component history and transform translation. Cases use finite,
nondegenerate inputs and an isolated transform node.

Validate contact geometry connected to suspension component travel:

```sh
node scripts/mcm-reference/compare-suspension-contact-oracle.mjs /path/to/mcm.exe /tmp/mcm-suspension-contact-new
```

This executes original `0x4b0db0`, including its `0x49e900` component call and
transform update. The global Y axis is initialized by original `0x49d650`.
Terrain sampling is excluded; contact direction and normal are supplied.

Validate the rotating suspension component:

```sh
node scripts/mcm-reference/compare-rotating-suspension-oracle.mjs /path/to/mcm.exe /tmp/mcm-rotating-suspension-new
```

Original `0x49ebf0` runs its transform rotation and returns displacement-derived
velocity and state flags. The 24,000 cases use finite, nondegenerate inputs and
isolated transform nodes, including exact travel-limit equality.

Validate rotating suspension contact geometry and component update:

```sh
node scripts/mcm-reference/compare-rotating-contact-oracle.mjs /path/to/mcm.exe /tmp/mcm-rotating-contact-new
```

This executes original `0x4b0f60` and `0x49ebf0` together, comparing displacement,
velocity, travel/compression, transform, component history and flags. It includes
the zero-cross-product branch; terrain sampling remains outside the harness.

Validate terrain sample hierarchy lookup:

```sh
node scripts/mcm-reference/compare-terrain-sample-oracle.mjs /path/to/mcm.exe /tmp/mcm-terrain-sample-new
```

Each synthetic case executes both original height and height/normal helpers,
including leaf and nested tile lookup, missing children, and positive edge
clamping. Height is compared as binary64 and normals as binary32. Continuous
position interpolation and loading actual terrain assets are not covered.

### Actual course terrain validation

`terrain-data.mjs` reads the physics-relevant TRN v2 sample banks and tile
hierarchy. It skips rendering payloads and does not redistribute game assets.
The decoder retains the original stream's extra output byte; bank readers consume
only the nominal prefix.

```sh
node scripts/mcm-reference/compare-terrain-data-oracle.mjs /path/to/mcm.exe /tmp/new-block-run /path/to/game
node scripts/mcm-reference/compare-terrain-course-oracle.mjs /path/to/mcm.exe /tmp/new-course-run /path/to/game/teraform/quarries/dunes.trn
```

Each output directory must be new. The course oracle compares original node
parsing and child traversal, then 4,000 height/normal queries against the recovered
code. It uses host stdio/allocation and omits rendering initialization. The
recovered parser supplies the root offset, scale and decoded sample banks; this is
not a full game-loader or complete bike-step comparison. Raw original course data
and oracle binaries stay in the local output directory; commit reports and
synthetic fixtures only.

### Connected contact probes

```sh
node scripts/mcm-reference/compare-contact-probes-oracle.mjs /path/to/mcm.exe /tmp/new-probe-run /path/to/course.trn
node scripts/mcm-reference/create-synthetic-probe-course.mjs /tmp/new-flat-course.trn
node scripts/mcm-reference/compare-contact-probes-oracle.mjs /path/to/mcm.exe /tmp/new-flat-probe-run /tmp/new-flat-course.trn
```

This executes original `0x4a6a25..0x4a6c01`, including original point transforms
and terrain queries, using varied affine transforms and local probe points.
It compares all resulting geometry and selector bits. The synthetic course's
recognized hash enables fixture output without copying original assets. The
instruction block's upstream conditions and downstream response are outside
this comparison; it is not a complete bike update.

### Paired force and torque assembly

```sh
node scripts/mcm-reference/compare-paired-force-torque-oracle.mjs /path/to/mcm.exe /tmp/new-paired-torque-run
```

Executes original `0x4aa77d..0x4aa959` and its cross-product/inverse-rotation
helpers with supplied forces, arms, and a valid cached world matrix. Compares
force and torque sums, both bike scratch vectors, and the shared clip counter.
This is a bounded caller-block comparison, not a complete bike update.

### Connected force assembly and angular integration

```sh
node scripts/mcm-reference/compare-force-angular-oracle.mjs /path/to/mcm.exe /tmp/new-force-angular-run
```

Executes original `0x4aa77d..0x4aaf02`, including contact correction, with a root
transform and supplied assembled forces and geometry. The 40 output words cover
force/torque sums, angular velocity/acceleration, opposing torque, clip counter,
pivot history, transform, correction angle and mask. It exercises both inertia
states and contact gates. Upstream forces and full bike integration are excluded.

### Force-to-linear-motion and steering state

```sh
node scripts/mcm-reference/compare-force-linear-oracle.mjs /path/to/mcm.exe /tmp/new-force-linear-run
```

Executes original `0x4aaf02..0x4ab49e`, including steering fallback and decay
between force conversion and linear integration. Compares 20 words covering
position, velocity, speed, acceleration, delta velocity, scratch cross product,
steering state/counter and selected rotation. Supplies upstream forces and finite
geometry, including positive `bike+0x8cc`; downstream rotation is excluded.

### Connected force-to-motion sequence

```sh
node scripts/mcm-reference/compare-force-motion-oracle.mjs /path/to/mcm.exe /tmp/new-force-motion-run
```

Runs original `0x4aa77d..0x4ab49e` continuously, comparing 60 output words with
`updateMcmForceMotion`. Shared flags, inertia and scratch state connect force
assembly, contact correction, angular integration, steering decay and linear
integration. Uses supplied forces/geometry and a root transform; earlier force
construction and later rotation application are excluded.
