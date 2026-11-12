# Player telemetry and controlled replay

November 12, 2026. Pinned retail executable:
`e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b`.

## Player identification and state layout

In the captured event, local rider **PDM** occupies `0x054fbd58`; opponent
**GLENN** occupies `0x0552a3b8`. These are session addresses, not persistent IDs.
The identification is supported by rider names, the input-dispatch branch, a
non-null local input-controller pointer, and observed response to Up Arrow.

| Field | Interpretation and evidence |
|---|---|
| bike allocation | `0xcc8` bytes, allocation at `0x4577c0`, constructor `0x4a1d70` |
| `+0xc1c`, 16 bytes | rider name; initialized/copied at `0x4a1f40` and `0x4a209c` |
| `+0x614`, uint32 | AI branch flag: 0 for PDM, 1 for GLENN; `0x4a56b5–0x4a56d4` |
| `+0x6e4`, pointer | local input-controller object; read by `0x4a4ab0`; PDM non-null, GLENN null |
| `+0x4f8`, float32 × 3 | current world position in feet; x/z used for horizontal distances at `0x4a172b`; previous-position copy at `0x4ad0e1` |
| `+0x510`, float32 × 3 | world linear velocity; transformed into body space at `0x4acfd8–0x4ad00b`; live x motion agrees with its sign and magnitude |
| `+0x540`, float32 × 3 | body-space linear velocity; written by that transform |
| `+0x8f0`, pointer | engine allocation, `0x1f0` bytes allocated at `0x4a22fe`, assigned at `0x4a2336` |
| engine `+0x148`, int32 | maximum RPM demand (10250 in this selected setup) |
| engine `+0x150`, int32 | digital release/coast flag; written by `0x4ad5d1` / `0x4ad626` |
| engine `+0x154`, float32 | randomized shift threshold, **not current RPM**; set at `0x4ad83b` / `0x4ad94f` |
| engine `+0x158`, int32 | zero-based gear index; increment/decrement at `0x4ad793` / `0x4ad8a1` |
| engine `+0x15c`, float32 | engine RPM demand/state; normalized state × maximum at `0x4ad700–0x4ad70c`; not yet asserted to be physical crankshaft RPM |
| engine `+0x160`, float32 | normalized engine demand state; throttle integration and shifts both modify it |
| engine `+0x168`, float32 | shift timer; tested at `0x4ad725`, decremented at `0x4a5bf0` |

Network/ghost classification and several other control branches remain untested.
Do not identify every non-AI object as the user outside this validated session.
Older scheduler captures read 4096 bytes from the bike address. The last 824
bytes extend beyond the proven allocation and must not be interpreted as state.
New capture tools use `0xcc8`; historical raw hashes remain unchanged.

## Capture boundaries and controls

`capture-bike.c` captures the local-input bike at:

- `0x4a54b6`: scheduler entry, before input processing and integration.
- `0x4ad0e1`: end of the whole update, before the previous-position copy and
  epilogue adjust ESI. The loop counter has been consumed by this point, so its
  after-update value is not the original scheduled iteration count.

Each record contains the bike allocation and a `0x16c`-byte engine prefix.
Raw float32 bits are retained. The original file is unmodified; the debugger
restores its in-memory breakpoint bytes and detaches.

The controlled replay explicitly changes **inputs**, not force/integration
instructions: float32 dt = `0x3ca3d70a` (0.02), throttle off for frames 0–49,
on for 50–199, off for 200–399. The digital throttle-query return is overridden
at `0x4ad5a2`. CRT random state starts at 12345 and is supplied at `0x4bf195`
only while the player update executes. The original random generator runs;
its next state uses `state * 214013 + 2531011` modulo 2^32.

At the first frame the tool saves a local checkpoint. After 400 frames it restores
that checkpoint, resets the scripted frame and RNG, and runs the sequence again.
The checkpoint covers the bike, complete engine, component allocations with sizes
recovered from their constructors, transform-tree prefixes, and scalar filters.
It does **not** save the complete world, opponents, camera, clocks or all globals.
Only same-event restoration with stable allocations has been exercised.

## Repeatability result

[Report](mcm-player-replay-validation.json): two 400-frame runs, 800 compared
before/after boundary pairs. Position, linear velocity, gear, normalized demand,
RPM demand, shift threshold and timer match exactly. All captured engine bytes
match. Across the entire bike allocation only `0x488`, `0x48c`, `0x490`, `0x494`
differ. Their values resemble screen rectangles (for example 260,93,380,423),
but their writers have not yet been proven; the comparator still reports these
as unexplained differences and exits nonzero.

Selected original observations (not Dust Valley measurements):

| Frame | Phase of input | Speed, m/s | Gear index | Normalized demand |
|---|---|---:|---:|---:|
| 49 | Before acceleration | <0.001 | 0 | 0 |
| 50 | First pressed update | 0.20760 | 0 | 0.02000 |
| 100 | Accelerating | 13.26339 | 2 | 0.85144 |
| 199 | Last pressed update | 22.24814 | 3 | 1 |
| 200 | First released update | 22.21313 | 3 | 0.96000 |
| 224 | Coasting | 21.37868 | 3 | 0 |
| 399 | Coasting | 15.55449 | 2 | 0 |

This establishes repeatability for one checkpoint and sequence. It does not
establish full-world replay, other courses, other input sequences or port parity.
The local raw logs and checkpoint-source provenance are preserved separately from
small regression fixtures. The debugger affects wall-clock performance; controlled
dt prevents that overhead from changing this experiment's supplied physics time.

## Recovered digital throttle branch

`src/physics/mcm/throttle.js` translates `0x4ad5ad–0x4ad712`. With digital demand
and no shift timer, normalized state increases by dt and caps at one. On release
it decreases by 2×dt; during a shift it decreases by float32(0.6)×dt. The decrement
has its own float32 store before subtraction. The release flag is preserved if
the level is already zero. RPM demand is stored as float32(maximum × level).

[Helper report](mcm-throttle-validation.json): 2,495 live original calls,
2,301 pressed, 194 released, 31 with nonzero shift timer; zero differences in
normalized state, RPM-demand bits and release flag. Fixtures preserve 321 cases.
Analog input filtering and whole-bike integration remain separate validation targets. This helper is isolated from the current Cannon
adaptation until the surrounding original simulation is recovered.


## Automatic gearbox and drive force

The automatic gearbox (`0x4ad720–0x4ad970`) is translated in `gears.js`.
[Report](mcm-gears-validation.json): 2,496 live calls match exactly, including
four upshifts, two downshifts and sixteen timer skips. A further 34,560 synthetic
original-instruction cases match, covering RPM/speed boundaries, supplied CRT
random draws, top-gear limiting and shift timers with the captured five-gear table.

The drive-force helper (`0x4ad980–0x4adb0a`) is translated in `drive-force.js`.
Its caller at `0x4a7c67` supplies bike speed `+0x564` and direction `+0x584`.
It selects a piecewise engine curve, multiplies by gear ratio, divides by speed
only when the signed float bits reach float32(1.01), and multiplies by the original
constant float32(341.62). The scalar is rounded before vector multiplication.
A nonzero release flag produces zero drive force. AI scaling affects the vector
but not the returned scalar. This helper does not include coast drag or braking.

[Report](mcm-drive-force-validation.json): 31,680 mapped-original cases match all
four float32 output words, covering each captured RPM knot, five gears, the speed
division boundary and local/AI/released branches. These are synthetic helper
comparisons, not live force captures or complete acceleration parity. The first
live force probe failed without producing records; that attempt is not evidence.

All these translations remain isolated from the Cannon adaptation. Whole-bike
force accumulation, contacts, suspension, orientation and integration must still
be recovered and compared before claiming complete physics parity.

## Final linear integration

`integrate-linear.js` translates `0x4ab38e–0x4ab49e`. It adds the already
accumulated delta velocity from stack `+0x4e0` to bike `+0x510` with float32
stores, computes squared speed in the original `(z*z + x*x) + y*y` order,
stores that sum as float32, then uses x87 square root to update bike `+0x6a4`.
If bike `+0x61c` is zero, it advances position `+0x4f8` using updated velocity
and scheduler dt. Otherwise it preserves position and clears velocity/speed.
The broader gameplay meaning of `+0x61c` remains unproven.

[Report](mcm-linear-validation.json): 30,000 synthetic original-instruction
cases match all seven output float32 words, including cancellation to zero,
zero dt and the position-freeze branch. A repeat run reproduced the same input
and output hashes. This validates the integration slice, not force generation.
Upstream `0x4aaf02–0x4aafaf` multiplies accumulated force by bike `+0x55c`,
stores acceleration at `+0x51c`, then multiplies by dt with another float32 store
to produce delta velocity. The parameter's reciprocal-mass interpretation still
needs constructor/data provenance. Rotational integration calls `0x4b0a70`.

## Opposing acceleration before the angular update

`opposing-acceleration.js` translates the complete helper `0x4b0a70–0x4b0daf`.
The caller at `0x4aaeb8` supplies bike `+0x534` as angular velocity, stack
`+0x3b4` (relative to the pre-push stack) as acceleration, transformed/scaled
opposing acceleration, scheduler dt and an axis mask of zero. Each component
combines acceleration while preventing an opposing term from reversing motion.
At rest, an unmasked axis only lets the opposing term reduce an existing
oppositely signed acceleration; it does not introduce acceleration on its own.
The general branch predicts velocity using the current acceleration and dt,
rounds that prediction and the opposing delta to float32, and may clear both
velocity and acceleration when the opposing term would cross zero. The caller
then integrates the modified acceleration into angular velocity.

[Report](mcm-opposing-validation.json): 31,384 original-instruction cases match
all six output words, including all eight masks, signed zeros, tiny magnitudes,
zero dt and randomized vectors. Input fixtures preserve bits to retain negative
zero. This is not a complete angular integration or orientation validation.

Mass provenance: reset code `0x4a1b36–0x4a1b89` derives `+0x558` from `+0x68c`
and a constant, and sets `+0x55c` to the reciprocal of that same unrounded
product. Another mode copies `+0x680` and `+0x678` into those fields at
`0x4a5d53–0x4a5d59`. Construction uses `+0x558` in inverse-inertia calculations
at `0x4a2b51–0x4a2b9f`. This supports mass/inverse-mass roles, but exact units
and mode-specific parameter sources still require validation.

## Rotation preparation and inverse square root

The orientation path does not reuse the coarse square-root lookup. It invokes
`0x401770`, seeded by the 128-byte table initialized at `0x401720`, followed by
two Newton refinements. `inverse-sqrt.js` preserves the binary64 intermediate
under the observed x87 control word 0x027f; it does not round the return to
float32. [Report](mcm-inverse-sqrt-validation.json): 58,768 positive normal
float32 inputs match all eight returned bytes, including exponent and lookup
bucket boundaries. Zero, subnormal and nonfinite inputs are outside this API's
validated domain and are rejected.

`rotation-step.js` translates `0x4ab688–0x4ab7cc` plus the skip branch to
`0x4ab7fd`. It computes angle as float32(dt / inverseSqrt(squared angular speed)),
checks finiteness and the signed-bit threshold `0x38d1b717`, and normalizes the
angular velocity for the axis. A skipped rotation preserves the prior temporary
axis at bike `+0x540`. [Report](mcm-rotation-validation.json): 20,000 original
executions match angle, axis and apply/skip decision; 10,660 rotations applied.
The fixture domain covers ordinary finite angular velocities and zero, positive
and negative dt, not every possible nonfinite or underflowing input.

The resulting axis/angle is passed to `0x4b8070` with the local pivot from bike
`+0x660`. That helper translates around the pivot and calls `0x4b7d90`, which
builds an axis-angle matrix using x87 sine/cosine and multiplies the transform.
Those transform mutations are not yet ported or included in the rotation report.

## Local transform rotation

`matrix.js` transcribes `0x40e680` with each output's original addition order.
`axis-angle.js` transcribes the arithmetic in `0x4b7d90`, including axis
normalization, trigonometry and asymmetric float32 stores used in off-diagonal
entries. Intermediate variable names correspond to the instruction sequence;
combining these expressions or applying a generic matrix library would change
rounding points. The original multiplies the existing node matrix at `+0x84`
by this rotation and restores translation entries `+0xb4/+0xb8/+0xbc` afterward.
It invalidates the node's cached transform flag at `+0x104`.

[Report](mcm-transform-validation.json): 12,000 original executions match both
general matrix multiplication and local axis-angle rotation, including all matrix
words and the isolated node's cache flag. Inputs include identity/general matrices,
zero angles and random angles within approximately ±π. JavaScript sine/cosine
matched the original x87 results at the final float32 outputs in this suite;
this does not establish universal trig equivalence, large-angle behavior, child
transform invalidation or rotation about an offset pivot. Those remain separate
validation requirements. The original `0x4b8070` pivot wrapper is not yet ported.

## Pivot wrapper

`transform.js` now translates the complete arithmetic of pivot wrapper
`0x4b8070–0x4b81ed`: transform the local pivot into the translation, rotate the
matrix with `0x4b7d90` semantics, then apply the negative pivot in the rotated
frame. The before/after translations have distinct addition orders, preserved
explicitly. Even zero-angle behavior retains the original intermediate stores.

[Report](mcm-pivot-validation.json): 16,000 calls to the original helper match
all 16 matrix words and the isolated node's cache flag. Coverage includes zero
and nonzero pivots, zero angles, identity/general matrices and translations up
to roughly 5,000 original units. This supersedes the earlier note that the pivot
wrapper was unported. Child cache invalidation and full bike-step sequencing
remain unvalidated; this pure arithmetic API returns a matrix without traversing
scene objects.


## Expanded capture format (live validation pending)

`capture-bike.c` now follows bike `+0x434` and records the 64-byte transform
matrix at node `+0x84` as `matrixHex`, plus the node address. The decoder exposes
raw matrix words, angular velocity at bike `+0x534`, and acceleration at `+0x51c`.
The replay comparator includes those fields; raw matrix words preserve signed
zero differences. Historical records without `matrixHex` decode it as null and
must not be presented as orientation coverage. The revised capture compiled
with warnings treated as errors; its serialization/comparison behavior has a
regression test, but the revised binary has not yet captured a live practice run.

## Suspension force helper

`suspension.js` translates `0x4b11e0–0x4b1315`. The velocity magnitude uses the
coarse square-root lookup on a float32 squared length. Effective spring
stiffness is stored as float32 before computing the damping coefficient with
hardware square root. High-speed relief uses the lookup magnitude. Spring and
damping vectors are each rounded to float32 before their sum is rounded again.
Those stores distinguish this port from the earlier approximate Cannon model.
The function accepts original-unit vectors with caller-supplied signs; it does
not infer compression geometry from a unit suspension direction.

[Report](mcm-suspension-validation.json): 20,000 calls to the original helper,
using its original table initializer, match all six force/damping output words.
Inputs cover front/rear default coefficients, randomized vectors/compression,
zero velocity and velocities around the distinct front/rear relief ranges.
This is helper-level validation, not a sag/drop/contact or whole-bike result.

The front call is at `0x4a9c19`; the rear call is at `0x4a9caf`.
Each receives two vectors, compression scalar, spring/damping parameters, mass
share, two output pointers and an extra stiffness term. The rear parameters
are read from bike `+0x5c8/+0x5cc/+0x5d0/+0x5d4`, with mass share at `+0x5a8`.
These call sites also gate contact/no-contact and explicitly clear force outputs
when a wheel is inactive. Reconstructing those gates, the vectors and application
points is still required before integrating this helper into the bike core.

### Contact torque helper

Recovered `0x4b1ad0–0x4b1d26` in `src/physics/mcm/contact-torque.js`.
The helper computes a float32 cross product, then applies branch-dependent
scaling. Its orientation/input/component fields retain offset names because
their gameplay meanings are not yet established. In one branch it zeros the
result and clears negative angular velocity X; AI handling follows that branch.
Unsigned comparisons against the angular-velocity float bits are preserved,
including the behavior at negative zero and the -0.3/-0.5 thresholds.

`docs/mcm-contact-torque-validation.json` records 14,520 cases executed through
the original helper under control word `0x027f`: zero differing output words,
including the angular-velocity side effect. Fixtures retain angular velocity
bits separately so JSON cannot erase negative zero. This verifies the isolated
helper, not caller contact geometry, total torque, or whole-bike parity.
All 101 repository tests pass after adding the original-output fixtures.

### World transforms and local torque conversion

Recovered `0x4b6930` world-matrix resolution and `0x4b8720` inverse vector
rotation in `src/physics/mcm/world-transform.js`. A node resolves its parent
at `+0x108`, composes parent world and local (`+0x84`) matrices into `+0xc4`,
and sets the cache flag at `+0x104`. Any nonzero cache flag skips recomputation.
The matrix composition has its own addition order, distinct from `0x40e680`.
The inverse rotation uses the resolved rotation block without translation;
its use as an inverse assumes the original rotation matrix convention.

`docs/mcm-world-transform-validation.json` records 24,000 original-execution
cases with zero differing words across the 16 matrix entries, three vector
entries, and three node cache flags. Cases cover root, child, grandchild, and
cached leaf paths, with general and affine matrices. These helpers are required
by the contact-torque caller but do not yet validate the entire angular update.

### Connected angular integration

`src/physics/mcm/angular-step.js` connects local torque, inverse inertia,
world-to-local opposing torque, the original opposing-acceleration helper,
and angular velocity integration. The original block `0x4aaa55–0x4aaf02`
was executed with stack `+0x24` clear, excluding contact-driven orientation
corrections but retaining both bike `+0x844` branches. In the zero branch,
initial acceleration is restricted to X, while opposing torque uses all three
inertia entries with X scaled by float32 0.1 and Z by 0.5. The other branch
uses the alternate inertia triplet without those scales.

The oracle redirects execution only at the block exit, preserving all executed
physics instructions. `docs/mcm-angular-step-validation.json` records 30,000
cases with zero differing words for final angular velocity, post-clamp
acceleration, opposing acceleration, and local opposing torque. Cases include
stationary velocities, multiple timesteps, and both inertia branches. These
are supplied-force cases; they do not prove whole-bike or contact parity.

### Contact-driven orientation corrections

`src/physics/mcm/contact-correction.js` recovers `0x4aaa55–0x4aaded`, including
the contact correction paths previously excluded from angular validation.
For nonzero `bike+0x844`, a stored correction at `+0x6ac` can rotate the matrix
around local Z at pivot `bike+0x654`. For the zero state, contact flags select
a pitch correction using the original inverse-sine result, timestep limits,
and geometric divisors; the two paths use different intermediate stores.
The caller flags and unresolved scalar fields remain explicit inputs. The
front/rear labels follow the corresponding `+0x594`/`+0x590` paths; this module
does not establish how contact detection produces those flags or values.

The original global axis initializers `0x49d620` and `0x49d680` are executed in
the oracle, giving X and Z axes. The block exit is redirected before damping.
`docs/mcm-contact-correction-validation.json` records 32,000 cases, including
varied initial orientations, with zero differences across local matrix,
initial angular acceleration, stored correction and selected mask. A prior
32,000-case identity-orientation run also matched. JavaScript inverse sine
matches these tested outputs; this is not a proof for every possible input.

### Contact corrections connected to angular integration

`updateMcmAngularWithContact` now executes the recovered contact correction
before converting opposing torque with the updated orientation, then applies
inertia, zero-crossing clamps and angular integration. A combined oracle runs
all original instructions from `0x4aaa55` through the exit at `0x4aaf02`, rather
than comparing separate helper results. The root node's world matrix is resolved
by the original during this run after any pivot rotation invalidates its cache.

`docs/mcm-angular-contact-validation.json` records 32,000 cases with zero word
differences across the local matrix, angular velocity, post-clamp acceleration,
opposing acceleration, transformed opposing torque, correction value and mask.
The test varies orientation, state/contact flags, torque and opposing torque,
including stationary angular velocities. It still supplies upstream contact
flags and geometric scalars: contact detection, force generation and whole-bike
trajectory parity remain unverified. All 105 repository tests pass.

### Contact force limiting

Recovered `0x4ad310–0x4ad3e7` in `src/physics/mcm/contact-force-limit.js`.
The helper limits force by `mass / dt` times a clamped velocity-change budget,
updates the remaining budget, and may scale the supplied vector and magnitude.
The comparison uses the unrounded limit, whereas vector scaling uses its stored
float32 value. In the uncapped branch, budget consumption divides by a separately
stored float32 `mass / dt`. These stores are intentionally distinct.

`docs/mcm-contact-force-limit-validation.json` records 30,000 original cases
with zero differing words across force, magnitude and remaining budget. Inputs
include rounded-limit equality cases and exhausted/negative budget values,
with positive mass/timestep and nonnegative magnitude. Fixtures preserve force
bits to retain signed zero. This helper appears in the contact-force caller at
`0x4a8aa5`; it does not recover contact detection or the preceding force model.

### Front and rear tire force generation

`src/physics/mcm/tire-force.js` recovers front `0x4b1870` and rear `0x4b1960`.
Both compute absolute alignment between a supplied direction and the wheel
axis (`bike+0x578` or `+0x584`), derive the perpendicular component with a
clamped square root, and combine coefficients from `+0x5b0/+0x5b4` with load.
The front applies an extra float32 0.1 to its perpendicular contribution;
the rear applies a supplied scale to the combined result. The returned force
opposes the supplied direction for positive load/coefficient inputs.

Alignment is stored before its square is formed, but the square multiplies
the unrounded dot by that stored value. Force X likewise uses the unrounded
scalar while Y/Z use its stored float32 value. Negative-zero magnitudes are
preserved by the original unsigned bit comparison.

`docs/mcm-tire-force-validation.json` records 30,000 paired cases (60,000
original helper calls), zero differing words, including aligned/perpendicular
and zero-load inputs. This establishes the force helpers for supplied axes,
directions and load; generation of those contact inputs remains outstanding.

### Contact force and torque accumulation

`src/physics/mcm/contact-accumulation.js` recovers `0x4b1570–0x4b1869`.
The enabled contacts choose a requested velocity change (the maximum when both
are enabled), bounded by the shared remaining budget. For positive force
magnitude and nonzero selected change, the helper limits the force, consumes
budget, and adds force and moment-arm torque to supplied accumulators.
When both contacts contribute torque, the first cross product is stored as
float32 before the second unrounded cross product is added. The resulting
float32 torque is then added to the existing total with another store.

`docs/mcm-contact-accumulation-validation.json` records 32,000 original cases
with zero differences across the modified force, remaining budget, total force
and total torque. All four contact-flag combinations, zero magnitudes/budgets,
and capped/uncapped force paths are exercised. Moment arms and incoming force
are still supplied inputs; this does not prove their geometric derivation.

### Steering-induced velocity correction

Recovered `0x4b1320–0x4b156d` in `src/physics/mcm/steering-velocity.js`.
The helper uses the component angle at `*(bike+0x8ec)+0x44`, geometric field
`+0x5d8`, and two supplied vectors to store a signed radius-like value at
`+0x6b4`. It adds a turn-induced velocity delta to temporary vector `+0x540`,
then rescales that vector to stored speed `+0x564` and writes world velocity
`+0x510`. Its returned signed angle is derived through inverse cosine.
The zero-angle and low-speed branches preserve specific existing fields.

Historical harness limitation, resolved below: an initial 24,000 perpendicular-direction case run matched. The broader run
found a harness limitation: out-of-domain inverse-cosine values enter the
original CRT error handler, whose imports/state are not initialized by the
isolated PE loader. That process faulted; it was stopped without affecting the
reference game. The succeeding driver explicitly excludes and counts these
inputs rather than treating them as passing. Of 32,000 generated cases, 31,938
valid-domain cases matched all eight output words and 62 were excluded.
`docs/mcm-steering-velocity-validation.json` records these counts. General
finite directions and zero/low/positive speed are covered; exceptional CRT
behavior remains unvalidated. The JavaScript nonfinite-return branch follows
the observed caller guard but has not been compared with a fully initialized
original CRT on those excluded cases.

### Steering CRT error-path validation completed

The isolated steering oracle now binds the original KERNEL32 imports and calls
the executable's own heap initializer `0x4c5230` followed by thread-state
initializer `0x4c24e0`, matching their startup order. No game entry point or
physics instructions are replaced. Other game imports remain unresolved.
This supplies the CRT state needed by inverse-cosine domain-error handling.

The updated steering report supersedes the preceding exclusion: **all 32,000
cases match**, including all 62 domain-error cases, with zero excluded inputs.
A repeat run produced identical input/output hashes. Every domain-error case
is retained in the regression fixtures. Those cases preserve original velocity
and the computed temporary vector while returning zero turn angle, matching
the recovered nonfinite-angle guard. The report hashes the optional import
binder and records the CRT initialization entry points. Full bike/contact
parity remains outstanding.

### Suspension component travel and velocity

Recovered component update `0x49e900–0x49eae3` in
`src/physics/mcm/suspension-travel.js`. This helper is called from the bike
contact geometry routine `0x4b0db0`. It limits travel using component `+0x48`,
rescales displacement at the limit, sets component translation from a float32
0.6-scaled displacement, and derives suspension velocity using displacement
change projected onto the component displacement. The timestep can be adjusted
using the previous signed height (`+0x58`). Previous displacement (`+0x4c`)
and travel (`+0x5c`) are then updated, with explicit limited/increasing outputs.

`docs/mcm-suspension-travel-validation.json` records 24,000 nondegenerate finite
cases with zero differences across 20 output words: travel, both displacement
vectors, derived velocity, translation, previous state, flags and cache validity.
The original helper also executes its transform setter; this oracle supplies
an isolated node. The input contact displacement still comes from the caller,
and degenerate denominator cases and transform descendants remain unvalidated.

### Contact geometry connected to suspension travel

`src/physics/mcm/suspension-contact.js` recovers the `0x4b0db0` geometry caller,
including its unmodified call to component update `0x49e900`. A supplied
contact direction and normal determine a signed denominator; the nonnegative
branch reflects the horizontal contributions before recalculating it. The
negative-denominator path derives distance from `bike+0x590`, otherwise using
float32 0.002. The resulting displacement, component-axis displacement and
signed travel feed the component update. Compression and contact-limit outputs
are derived after that update, using the initialized global Y axis.

`docs/mcm-suspension-contact-validation.json` records 24,000 connected original
cases with zero differences across displacement, suspension velocity,
compression, travel, transform translation, component history and flags.
The oracle calls original axis initializer `0x49d650`. Inputs are finite and
nondegenerate with isolated transforms. Terrain sampling and the separate
`0x4b0f60` contact path remain outstanding; this is not whole-bike parity.

### Rotating suspension component

`src/physics/mcm/rotating-suspension.js` recovers `0x49ebf0–0x49ed13`, used by
the component at `bike+0x8e8`. It limits travel at component `+0x54`, rescales
displacement, and rotates its local transform about X using either the limit
angle at `+0x48` or travel divided by `+0x4c`. The original `0x4b7bf0` rotation
helper is executed in the oracle. Velocity derives from previous travel
(`+0x58`) minus current travel, divided by current travel times the adjusted
timestep. Previous signed height (`+0x5c`) can change that timestep.

`docs/mcm-rotating-suspension-validation.json` records 24,000 cases with zero
differences across displacement, velocity, travel/history, all 16 local matrix
entries and component/cache flags. Cases include exact travel-limit equality
and varied starting orientations. Inputs are finite and nondegenerate;
nonfinite-angle handling, zero denominators and descendant cache invalidation
are not yet validated. Contact geometry caller `0x4b0f60` remains to connect.

### Rotating contact geometry connected to component update

`src/physics/mcm/rotating-contact.js` recovers `0x4b0f60` through its call to
`0x49ebf0`. Two supplied vectors form a float32 cross product, which is combined
with the contact normal and `bike+0x594` to calculate displacement and signed
travel. A nonnegative projection reflects the horizontal normal components
before recomputing the denominator. The zero projection branch clears travel,
velocity and component contact state while preserving the transform; its output
contact flag compares world velocity against the normal using threshold -1.

`docs/mcm-rotating-contact-validation.json` records 30,000 original cases with
zero differences across 28 output words, including full local matrix and the
zero-cross-product branch. The original global Y-axis initializer and component
rotation both execute. Both suspension geometry/component paths are now covered
for these supplied inputs. Terrain sampling, contact-vector transforms,
degenerate nonzero-path denominators, and descendant transform behavior remain
outside this comparison; whole-bike parity is still unproven.

### Terrain sample hierarchy

The bike calls terrain query `0x411340` through `bike+0x8f4`. That query converts
world X/Z with terrain `+0xa04`, clamps negative positions, selects a grid cell,
and reads its corners through `0x48a730` (height) or `0x48a840` (height/normal).
Those two lookup helpers are recovered in `src/physics/mcm/terrain-sample.js`.
Terrain nodes use level `+0x20`, child pointers `+0x54`, leaf records `+0x50`,
height bias `+0x0c`, and height scale `+0x10`. Child grids are 16x16; leaf grids
are 17x17 with 16-byte records containing unsigned height at +2 and normal at +4.

Level 1 selects children with a four-bit shift, higher levels with eight bits.
Positive out-of-range coordinates clamp to the final child and sample edge;
missing children return height zero and normal [0,1,0]. Height arithmetic is
returned at x87 double precision. Scaled normals use the recovered inverse
square root, retaining the original mixed unrounded/stored Z multiplication.

`docs/mcm-terrain-sample-validation.json` records 30,000 paired original lookups
with zero differences, comparing double-precision heights and float32 normals.
Synthetic tiles cover leaf/child/grandchild lookup, missing tables/children,
positive bounds and scale changes. The API requires nonnegative integer
coordinates, matching the upstream query's clamp. Continuous interpolation,
real terrain extraction, and whole-bike trajectories remain outstanding.
