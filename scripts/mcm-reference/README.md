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

`launch.sh` defaults to Wine builtin DirectDraw, OpenGL with threaded rendering
disabled (`renderer=gl,csmt=0`), and CoreAudio disabled. These are the settings
recorded by the healthy replay and November 14 session recovery; the original
runs without audio in this diagnostic configuration. Explicit
`WINE_D3D_CONFIG` and `WINEDLLOVERRIDES` values override those defaults for
compatibility experiments. Startup can still fail intermittently; reaching a
menu is not proof of healthy gameplay or physics parity. `graphics.reg`
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

Set `MCM_CHECKPOINT` to a new Windows-path JSON file to export the initial
partial checkpoint alongside a scripted capture. The export contains the bike
address and each saved block's address, byte length and hexadecimal bytes; it
does not follow additional pointers or expand the restore set. Existing files
are never overwritten. These are session-specific memory blocks, not a portable
save or a complete input to the recovered simulation.

The capture stops after 30 seconds without a player-bike record, including while
menu RNG calls keep producing debugger events. It restores breakpoint bytes and
clears any pending single-step flag before detaching. A timeout is a failed
capture, not evidence of parity; enter a riding event before capturing.

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

### Force-to-transform sequence

```sh
node scripts/mcm-reference/compare-motion-transform-oracle.mjs /path/to/mcm.exe /tmp/new-motion-transform-run
```

Runs continuous original `0x4aa77d..0x4ab7fd`, including wheel component helpers,
translation assignment and body rotation around the saved pivot. Compares 98
final words, including both wheel matrices and their cache flags. The matrix and
scratch-axis slots report final post-rotation values; the separately returned
linear position fields retain their integration results. Uses isolated root
transforms and supplied upstream forces/geometry. Later rider/crash logic and
parent/child transform hierarchies are not part of this oracle.

### Motion-to-controller handoff

```sh
node scripts/mcm-reference/compare-motion-controller-oracle.mjs /path/to/mcm.exe /tmp/new-motion-controller-run
```

Extends continuous original force-to-transform execution through controller
velocity handoff at `0x4ab99f`. State-zero exits at `0x4abb30` before its separate
orientation branch. Compares 104 final words, including controller linear/angular
vectors. Optional other-bike velocity is supplied; collision detection and the
subsequent orientation/rider/crash branches remain excluded.

### Nonzero-state orientation after motion

```sh
node scripts/mcm-reference/compare-state-orientation-oracle.mjs /path/to/mcm.exe /tmp/new-state-orientation-run
```

Extends the connected force/motion/controller oracle through the nonzero-state
orientation branch to `0x4ac6cd`; state-zero exits at `0x4abb30` before its separate
logic. Compares 107 final words, including the corrected matrix, normalized world
scratch and local axis at bike `+0x624`. Positive-Y normals avoid degenerate sums;
threshold gates and preservation branches are covered. Root transforms and
supplied upstream geometry/forces remain limitations.

### State-zero control and velocity deflection

```sh
node scripts/mcm-reference/compare-state-zero-control-oracle.mjs /path/to/mcm.exe /tmp/new-zero-control-run
```

Runs original `0x4abb30..0x4abef9`, intercepting the limited/activation gate exits
at `0x4ac64a` and `0x4ac1f7`. Compares 16 output words: control vector, both scratch
vectors, linear velocity/speed and angular velocity. Uses positive speed with
axial/oblique directions. Later timer/orientation code and whole-bike sequencing
are excluded.

### State-zero timer and control rotation

```sh
node scripts/mcm-reference/compare-state-zero-rotation-oracle.mjs /path/to/mcm.exe /tmp/new-zero-rotation-run
```

Runs original `0x4abb30..0x4ac17b` with limited/activation gate exits intercepted.
Compares control/velocity state, root matrix, timer/sign/phase/accumulator, angle
and cache flag (38 words). Uses the full `0xcc8` bike allocation. The following
contact/event helper and alternate state-zero path remain excluded.

### Alternate state-zero alignment

```sh
node scripts/mcm-reference/compare-state-zero-alignment-oracle.mjs /path/to/mcm.exe /tmp/new-zero-alignment-run
```

Executes original `0x4ac1f7..0x4ac5c5`, stopping before common contact/event
handling. Compares 32 words including root matrix/cache, angular velocity, axis
scratch and correction state. Covers mask gates, target floor/clamp order, rate
limits and both pivot rotations. Geometry/state are supplied; whole-bike
sequencing and the following helper remain excluded.

## HUD clock dependency

`generate-hud-refresh-clock.mjs` creates isolated clock inputs. Compile
`hud-refresh-clock-oracle.c` with `i686-w64-mingw32-gcc -O0 -Wall -Wextra
-Werror -Wl,--image-base,0x10000000 -Wl,--disable-dynamicbase`, then
run `oracle.exe mcm.exe input.bin output.bin` under the reference prefix. The
oracle executes original `0x423b63..0x423bc9`; a counting stub replaces the HUD
refresh, so this validates its scheduler rather than graphics or stack effects.
`compare-hud-refresh-clock.mjs input.bin output.bin` compares every retained step.

For live observation, compile `capture-hud-refresh-clock.c` with
`i686-w64-mingw32-gcc -O0 -Wall -Wextra -Werror`. With the verified original
running, invoke `capture.exe WINDOWS_PID new-output.jsonl frame-count`. It
observes clock entry/exit and the player stack address, without changing input
or timing. Restore a minimized game window before capturing. It uses three
temporary breakpoints and detaches after the bounded capture; unrecoverable
context/cleanup errors stop the reference rather than leaving armed hooks.
`compare-live-hud-refresh-clock.mjs new-output.jsonl` retains the clock from one
initialization and reports scratch changes separately. It never feeds those
observed scratch words into the model. `build-hud-refresh-clock-fixtures.mjs`
accepts the pinned executable, isolated input/output and live JSONL to regenerate
the regression fixtures and validation report.

### HUD DrawTextA stack-reuse probe

`capture-hud-stack.c` observes eight guarded boundaries in the pinned original, including the player stack location and HUD text call arguments. It does not change inputs or physics state. Use one debugger at a time, verify the executable hash, and select the existing game process. It restores breakpoints and trap state on completion; unrecoverable cleanup stops the reference rather than leaving armed instructions.

```sh
i686-w64-mingw32-gcc -O0 -Wall -Wextra -Werror scripts/mcm-reference/capture-hud-stack.c -o /tmp/capture-hud-stack.exe
wine /tmp/capture-hud-stack.exe PID Z:/tmp/new-hud-stack.jsonl 20
node scripts/mcm-reference/analyze-hud-stack.mjs /tmp/new-hud-stack.jsonl
i686-w64-mingw32-gcc -O0 -Wall -Wextra -Werror scripts/mcm-reference/draw-text-stack-probe.c -o /tmp/draw-text-stack-probe.exe -lgdi32 -luser32
wine /tmp/draw-text-stack-probe.exe Z:/tmp/new-draw-stack.bin
```

Use the configured reference Wine prefix. Output paths must be new. The second program is an isolated API stack-footprint experiment with its own font/DC, not a replay of the original game or a proof that every DrawTextA call has this footprint. The compressed `hud-draw-text-stack-wine11.json.br` fixture stores raw observations and a 65,536-byte isolated stack snapshot. See the validation report for hashes, call offsets, observed transitions and remaining scheduling/implementation limits.

### Ordered world scratch lifetime

`capture-world-stack-order.c` combines guarded bike function-entry/pre-scheduler/exit, HUD clock and DrawText boundaries without changing controls or physics state. Compile with `i686-w64-mingw32-gcc -O0 -Wall -Wextra -Werror`, then run under the reference Wine prefix with arguments `PID output.jsonl HUD_UPDATE_COUNT`. Verify the pinned executable and no existing debugger first. The hook overhead changes observed timing. `node scripts/mcm-reference/analyze-world-stack-order.mjs output.jsonl` retains the HUD clock once, checks observed drawing against predicted refreshes, and reports unmodeled scratch transitions. It does not substitute captured scratch into physics. The committed native fixture and `tests/mcm-world-stack-order.test.js` preserve the unresolved caller interval explicitly.

### Rendering writes to the bike caller stack

`capture-frame-stack.c` records outer-frame call boundaries; `capture-render-stack.c` records recursive child rendering before/after `0x4206f6`. Compile each with `i686-w64-mingw32-gcc -O0 -Wall -Wextra -Werror` and run one at a time under the pinned reference prefix with `PID output.jsonl FRAME_COUNT`. Hooks are guarded and restored. Timing is perturbed, so retain each capture independently. `node scripts/mcm-reference/analyze-render-stack.mjs output.jsonl` explicitly skips a leading partial frame, requires complete subsequent recursive call pairs, and identifies changed call boundaries. Changed leaf calls identify containment, not the exact writing instruction. Do not inject these observed scratch values into physics.

### Wine direct-CALL single-step limitation

On the current Wine 11 host, an `E8` direct-call instruction single-stepped after restoring an INT3 pushes two return-address words, corrupting the callee argument layout. This was isolated outside the game with `debugger-call-step-probe.c`: compile with `-O0 -Wall -Wextra -Werror -Wl,--disable-dynamicbase`. The default preceding-MOV hook passes 100 copies. `-DHOOK_CALL=1` reproduces the failure; adding `-DINDIRECT_CALL=1` passes 100 copies. The helper launches its own child and never attaches to the game. Its failing variant is an expected diagnostic failure, not valid telemetry. Do not generalize this host-specific result to other runtimes without testing.

`capture-render-matrix.c` uses non-CALL predecessors and returns, rejects direct-call hooks before attachment, and records the same CLI arguments as the rendering probe. Analyze with `analyze-render-matrix.mjs`. The older experimental `capture-force.c` is explicitly disabled by its direct-call guard until relocated to a validated adjacent instruction. Never fix the debugger artifact by modifying the game's stack or physics state.

### Draw inputs and stateblock application

`capture-draw-inputs.c` records the original `DrawIndexedPrimitive` arguments, D3DLVERTEX bytes and 16-bit indices alongside caller scratch. `capture-draw-stateblock.c` additionally traces pinned Wine DDRAW boundaries. Both accept `PID output.jsonl FRAME_COUNT` after compilation with `i686-w64-mingw32-gcc -O0 -Wall -Wextra -Werror`. Verify the executable and Wine DLL hashes in `docs/mcm-draw-stateblock-validation.json` first. The latter probe locates and relocates the loaded DDRAW module, checks its image size/timestamp and hook bytes, and rejects a different device-entry RVA. Hooks that single-step direct CALL are rejected.

`analyze-draw-inputs.mjs output.jsonl` checks geometry lengths/index bounds, finite coordinate fields, caller identity and 32-byte stdcall cleanup. A leading prefix before player scratch is identified is reported and excluded explicitly. Stateblock pairs are observed dependencies only, not simulated graphics. Separate captures can have different timing and render paths because of debugger overhead.

### Stateblock matrix product and exact overlapping store

`capture-stateblock-product.c` extends the draw probe with input/output matrix and immediate store observations. Compile with `i686-w64-mingw32-gcc -O0 -Wall -Wextra -Werror`, then run one debugger at a time with `PID new-output.jsonl FRAME_COUNT`. Verify the pinned executable and both DLL hashes in `docs/mcm-stateblock-product-validation.json`. Its new Wine hooks require `wined3d.dll` at `0x7a770000`; instruction bytes are checked before attachment. DDRAW is relocated as in the preceding probe. Never move a hook onto the adjacent direct CALL. The output includes the two source matrices, complete product, and before/after observation of the overlapping `movhps` store. Context writes remain limited to control/trap state, and cleanup restores the hooks.

Run `node scripts/mcm-reference/analyze-stateblock-product.mjs new-output.jsonl` to derive products using the recovered SSE operation order and check the actual scratch store and draw-return retention. The first render frame can precede identification of the player stack slot; its products are validated but it cannot establish an overlapping store. The captured DLL state is input evidence for the expression, not a retained world model or permission to feed recorded output into physics.

### Original view-matrix expression

`generate-view-matrix.mjs new-input.bin` emits deterministic ten-float camera cases. Compile `view-matrix-oracle.c` with `i686-w64-mingw32-gcc -O0 -Wall -Wextra -Werror -Wl,--image-base,0x10000000 -Wl,--disable-dynamicbase`. After verifying the executable SHA in `docs/mcm-view-matrix-validation.json`, run `oracle.exe mcm.exe input.bin output.bin` under the reference Wine prefix. This isolated process maps the original function and helpers, initializes the original inverse-square-root table, uses x87 CW `0x027f`, and runs the entire `0x475760` function including its optional roll path. `compare-view-matrix.mjs input.bin output.bin` compares every output bit. Nonfinite and squared-length-overflow inputs are outside the case set.

`capture-view-matrix.c` extends the pinned stateblock probe with original camera input/output boundaries and transform setters. Compile with `-O0 -Wall -Wextra -Werror`, then run `capture.exe PID new-output.jsonl FRAME_COUNT`. It has the same pinned executable/DLL/base requirements and direct-CALL avoidance as the stateblock-product probe. `analyze-live-view-matrix.mjs output.jsonl` derives view matrices from original inputs, retains them through the view setter, and computes downstream Wine products with the observed world setter. Leading products without an observed reconstructed view are counted separately. Camera controller evolution and render scheduling are not validated by this expression-level chain.

### Camera target-point update

`generate-camera-target.mjs new-input.bin` emits 1,000 deterministic cases. Compile `camera-target-oracle.c` with the view oracle's compiler flags and run `oracle.exe pinned-mcm.exe input.bin output.bin` after verifying the executable hash. It executes the entire original `0x47a3d0` function with a private camera/owner, `camera+0x140=0`, and x87 CW `0x027f`. Compare using `compare-camera-target.mjs input.bin output.bin`. Camera fields, flags, counter and return value are compared; the original setter's audio-listener globals are not modeled outputs.

`capture-camera-target.c` adds guarded indirect-call/return observations to the live view capture. It uses the same pinned module/base requirements and `PID new-output.jsonl FRAME_COUNT` interface. `analyze-live-camera-target.mjs output.jsonl` verifies the resolved function, immediate-mode camera, twelve-byte target argument cleanup, camera results, and downstream views from those computed results. Pair it with `analyze-live-view-matrix.mjs` to validate the remaining setter/product chain. No trace values are silently injected into the retained bike runtime. This still requires observed eye/roll/target inputs from the chase controller.

### Retained chase smoothing

`generate-chase-smoothing.mjs new-input.bin` produces six filter records, six targets, a delta, and a step count per case. Compile `chase-smoothing-oracle.c` with `-O0 -Wall -Wextra -Werror -Wl,--image-base,0x10000000 -Wl,--disable-dynamicbase`; verify the pinned executable hash, then run `oracle.exe mcm.exe input.bin output.bin`. It executes original `0x47d477..0x47d606` in a private mapped image and retains filter records across steps. A private exit jump stops before subsequent controller logic. Compare all record/output words with `compare-chase-smoothing.mjs input.bin output.bin`.

`capture-chase-smoothing.c` uses only two guarded, non-CALL breakpoints and accepts `PID new-output.jsonl UPDATE_COUNT`. Compile with `-O0 -Wall -Wextra -Werror` and use the configured original reference process, one debugger at a time. `analyze-live-chase-smoothing.mjs output.jsonl` initializes filter state once, then checks each native entry against the retained model before advancing it. Changed pointer identities, external record changes, missing pairs, and mismatched output are rejected. The report distinguishes short-timestep updates from actual gradual component changes. An OS throttle pulse was used in one capture, with release verified, but targets/timesteps are still observed inputs and it is not frame-aligned whole-bike telemetry.


### Chase target preparation and initialization

`generate-chase-preparation.mjs new-prefix` writes `-input.bin` (56-byte cases) and `-joined-input.bin` (64-byte cases, adding delta and step count). Compile `chase-preparation-oracle.c` and `chase-prepared-smoothing-oracle.c` with `-O0 -Wall -Wextra -Werror -Wl,--image-base,0x10000000 -Wl,--disable-dynamicbase`. After verifying the pinned executable hash, run each as `oracle.exe mcm.exe input.bin output.bin`. The private mapped image stops at `0x47d477` or `0x47d606`; a private allocator shim supplies six 16-byte records. Heap failure/address equivalence is excluded. Compare with `compare-chase-preparation.mjs input.bin output.bin`, adding `--joined` for the combined oracle. The joined oracle retains filters between steps while restoring supplied upstream locals.

`capture-chase-preparation.c PID new-output.jsonl UPDATE_COUNT` observes original `0x47d211` and `0x47d606` using guarded non-CALL breakpoints. Compile with `-O0 -Wall -Wextra -Werror`; only one debugger may attach at a time. Verify all original instruction bytes and debugger detachment afterward. This live probe requires already initialized filters. `analyze-live-chase-preparation.mjs output.jsonl` computes targets from earlier locals and feeds them into the retained smoothing audit; no output-state reseeding is allowed. Live initialization and full controller evolution are not covered.


### Pinned runtime vector rotation

`generate-runtime-vector-rotation.mjs new-input.bin` produces 28-byte vector/axis/angle cases. Compile `runtime-vector-rotation-oracle.c` with `-O0 -Wall -Wextra -Werror`, verify the DLL hash recorded in `mcm-runtime-vector-rotation-validation.json`, then run `oracle.exe C:/windows/syswow64/d3drm.dll input.bin output.bin` in the reference prefix. The oracle invokes the DLL's exported `D3DRMVectorRotate` and writes nine words per case: result, mutated axis, source vector. Compare using `compare-runtime-vector-rotation.mjs input.bin output.bin`. This is isolated dependency evidence, not a retained camera-controller comparison. General exceptional/trigonometric coverage remains open.


### Combined camera offset, target and smoothing chain

`generate-chase-offset-chain.mjs new-input.bin` writes 104-byte cases. Compile `chase-offset-chain-oracle.c` with `-O0 -Wall -Wextra -Werror -Wl,--image-base,0x10000000 -Wl,--disable-dynamicbase`, verify both pinned EXE and runtime DLL hashes, and invoke `oracle.exe mcm.exe input.bin output.bin` in the reference Wine prefix. The private mapped image starts at `0x47d166`, stops at `0x47d606`, resolves the one `D3DRMVectorRotate` import and uses the existing private allocator shim. Filters and shared axis persist across steps; earlier locals remain supplied. Outputs are 40 words per update: six targets, 24 filter words, six smoothed values, allocation count and shared axis. Compare with `compare-chase-offset-chain.mjs input.bin output.bin`.

`capture-chase-offset.c PID new-output.jsonl UPDATE_COUNT` observes those same two boundaries without modifying inputs or game state. Compile with `-O0 -Wall -Wextra -Werror`; only one debugger may attach. Verify both instructions and debugger detachment after capture. `analyze-live-chase-offset.mjs output.jsonl` retains filters and shared axis and rejects identity changes, reseeding, incomplete pairs or differing output. Live initialization requires a different capture; this probe expects allocated records. Existing live evidence covers mode 0 only.


### Active eye construction and reset gates

`generate-chase-active-chain.mjs new-input.bin` writes 156-byte cases for initialized camera filters. Compile `chase-active-chain-oracle.c` with `-O0 -Wall -Wextra -Werror -Wl,--image-base,0x10000000 -Wl,--disable-dynamicbase`; verify the pinned EXE and DLL hashes, then run `oracle.exe mcm.exe input.bin output.bin` in the reference prefix. Entry is `0x47c7d2`, exit `0x47d606`; EBX/EDI control gates are supplied explicitly, and filters, shared axis, reset flag and camera output fields persist between updates. Output has 45 words per update. Compare with `compare-chase-active-chain.mjs input.bin output.bin`. Earlier source/base/heading and mode reachability are outside this block.

`capture-chase-active.c PID new-output.jsonl UPDATE_COUNT` observes the same boundaries with guarded non-CALL breakpoints. Compile with `-O0 -Wall -Wextra -Werror` and verify restored instructions/debugger detachment afterward. `analyze-live-chase-active.mjs output.jsonl` seeds camera/axis/filter state once and checks subsequent native entries before advancing. It rejects external state changes rather than reseeding. Existing live evidence is mode 0 without resets; isolated native cases exercise reset conditions.


### Velocity-derived chase factor

`generate-chase-factor-isolated.mjs new-input.bin` writes 180-byte direct-factor cases. Compile `chase-factor-oracle.c` with `-O0 -Wall -Wextra -Werror -Wl,--image-base,0x10000000 -Wl,--disable-dynamicbase`; run `oracle.exe mcm.exe input.bin output.bin` against the pinned reference. Entry `0x47c685` stops at `0x47c7d2`; outputs are three words from EBP-0x68, EBP-0x10 and EBP-0x1c. Compare with `compare-chase-factor.mjs input.bin output.bin`. This direct boundary matters because the factor stack slot is reused later and some target branches bypass its consumption.

For retained-chain evidence, run `generate-chase-active-chain.mjs active-input.bin`, then `generate-chase-factor-chain.mjs active-input.bin factor-input.bin`; compile `chase-factor-chain-oracle.c` with the same flags and compare its 45-word/update output using `compare-chase-factor-chain.mjs`. The chain exits at `0x47d606`. `capture-chase-factor.c PID new-output.jsonl UPDATE_COUNT` observes those boundaries with restored non-CALL breakpoints; verify cleanup and use `analyze-live-chase-factor.mjs`. It derives the factor from captured velocity/denominator/multiplier inputs and retains downstream state. Captured factor values are ignored. This does not establish whole-controller or whole-world parity.


### Heading and active camera dispatch

`generate-chase-heading.mjs new-input.bin` writes 208-byte direct-heading cases. Compile `chase-heading-oracle.c` with `-O0 -Wall -Wextra -Werror -Wl,--image-base,0x10000000 -Wl,--disable-dynamicbase`, verify pinned EXE/runtime hashes, then invoke `oracle.exe mcm.exe input.bin output.bin`. Entry `0x47c30c` stops at `0x47c3e6`; outputs are angle, heading and enable. Compare with `compare-chase-heading.mjs`. Reported path counts classify dispatch from the validated outputs; they do not prove execution of alternate paths.

`generate-chase-heading-chain.mjs factor-input.bin new-input.bin` extends the prior factor cases, restricts modes to 0/1/2/4/6/7 and establishes enable-true conditions. Compile `chase-heading-chain-oracle.c` with the same flags and compare using `compare-chase-heading-chain.mjs`. It follows real native branches through `0x47d606`, preserving filters/camera/settings across steps; 212-byte inputs yield 49-word updates. Mode 4's global manager settings are compared. Alternate paths require separate recovery.

`capture-chase-heading-chain.c PID new-output.jsonl UPDATE_COUNT` observes these boundaries with guarded non-CALL breakpoints; verify restoration and debugger detachment afterward. `analyze-live-chase-heading-chain.mjs` derives heading/angle/enable while retaining camera/axis/filter/settings state. Captured values of those locals are ignored. Existing live evidence covers mode 0 only.


### Chase source and base spatial inputs

`generate-chase-spatial.mjs source|base new-input.bin` produces 32-byte source or 44-byte base cases. Compile `chase-source-oracle.c` and `chase-base-oracle.c` with `-O0 -Wall -Wextra -Werror -Wl,--image-base,0x10000000 -Wl,--disable-dynamicbase`. Verify the pinned executable hash, then run `oracle.exe mcm.exe input.bin output.bin`. These private-image oracles stop at the source/base exits and emit four words per case. Compare with `compare-chase-spatial.mjs source|base input.bin output.bin`. The base previous-target branch leaves its temporary untouched; the oracle initializes that temporary to zero.

`capture-chase-spatial-chain.c PID new-output.jsonl UPDATE_COUNT` observes six guarded non-CALL boundaries: source entry/exit, base entry/exit and heading/smoothing entry/exit. Compile with `-O0 -Wall -Wextra -Werror`; allow only one debugger and verify all six instructions plus debugger detachment afterward. `analyze-live-chase-spatial-chain.mjs output.jsonl` derives source/base, checks their flow into heading and retains the computed target between frames. It rejects missing stages, changed identity, changed retained state and differing outputs. This is a bridge between separated blocks, not a claim that intervening camera controls have been recovered. Raw bike/node observations remain inputs; accepted live coverage is mode 0 only.


### Normal chase input controls

`generate-chase-controls.mjs new-input.bin` writes 68-byte cases. Compile `chase-controls-oracle.c` with `-O0 -Wall -Wextra -Werror -Wl,--image-base,0x10000000 -Wl,--disable-dynamicbase`. Verify the pinned executable hash and run `oracle.exe mcm.exe input.bin output.bin`. Entry `0x47b52a` exits at `0x47c30c`; keyboard, joystick POV and button queries execute original code against supplied raw device records. No input-query return shim is installed. Each case retains camera state across four control-only updates and writes six words per update: radius, pitch, yaw, reset flag, motion gate, multiplier. Compare with `compare-chase-controls.mjs input.bin output.bin`.

`capture-chase-controls.c PID new-output.jsonl UPDATE_COUNT` observes those two guarded non-CALL boundaries. Compile with `-O0 -Wall -Wextra -Werror`, use one debugger, and verify instruction restoration plus debugger detachment afterward. `analyze-live-chase-controls.mjs output.jsonl` decodes raw keyboard/joystick fields and checks control output. Live state is supplied at each entry because the downstream controller can change it between calls. Accepted evidence includes idle frames and an OS camera-key pulse with release verified; this is not frame-synchronized whole-bike telemetry. Fixed-target and free-camera paths, input polling and general exceptional inputs remain outside coverage.

### Original preview assets

Run `node scripts/mcm-reference/build-render-assets.mjs ORIGINAL_GAME` to decode the original SLT meshes and the four `sbike/*bkrid.tex/.cmp` resource archives into the lazy model bundle. Run `node scripts/mcm-reference/build-map-assets.mjs ORIGINAL_GAME` to serialize the original `teraform` terrain banks, preserving original height/normal values, hierarchy and scale. The generated catalog supplies lazy asset URLs and the source-hash inventory.

`docs/mcm-assets-port-status.md` distinguishes connected terrain/models from remaining renderer, scene, race and native-checkpoint work. Rider weld flags are preserved but not applied yet. Selected courses use a central practice spawn aligned by the recovered reset routine; these are not captured native race starts. Rendering reads the shared recovered component graph without marking its native caches valid.
