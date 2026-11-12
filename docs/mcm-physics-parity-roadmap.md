# Motocross Madness physics parity roadmap

Written November 12, 2026, against the current Dust Valley implementation.

## Objective and honest starting point

Reproduce the supplied Motocross Madness build's simulation: the same initial state, terrain, settings, input sequence and elapsed-time sequence should produce matching motion and gameplay events.

**We currently have an adaptation, not a recovered physics engine.** We recovered several constants and parts of a few routines, then implemented them inside our existing Cannon-based simulation. The 74 passing tests establish that our game behaves acceptably under those tests. They do not establish agreement with Motocross Madness. The original now runs under Wine; 300 live scheduler comparisons pass, and raw bike-object snapshots are captured. Complete input/contact/integration traces and repeatability remain outstanding, so there is no defensible percentage-complete estimate.

Our target executable is SHA-256 `e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b`. Both local copies have that hash. Select one complete installation as the reference and record its data files and settings too: matching executable hashes alone do not establish matching runtime conditions.

Supporting material:

- [Recovered binary evidence and implementation notes](motocross-madness-reverse-engineering.md)
- [Machine-readable initializer evidence](mcm-binary-evidence.json)
- [Current adaptation measurements](mcm-handling-measurements.json)
- [Isolated scheduler and square-root recovery](mcm-core-recovery.md) — 134,242 synthetic original-instruction comparisons pass under Wine/Rosetta; 300 live scheduler comparisons also pass; full physics parity outstanding
- [Reference runtime status](mcm-runtime-status.md) — playable practice event; signed video-memory overflow resolved
- Inspection tool: `scripts/inspect-mcm.py`
- Current benchmark: `scripts/handling-benchmark.mjs`

Current milestone: [player identification and controlled replay](mcm-player-telemetry.md)
now supplies repeatable acceleration/release observations. Two 400-frame runs match
in motion and captured engine state, with four unexplained inherited words still
reported. The digital throttle translation matches 2,495 live helper calls. The
original-versus-port whole-bike comparator remains outstanding.

## What “100%” must mean

| Target | What it establishes | How we can claim it |
|---|---|---|
| Similar feel | Riding is subjectively convincing | Side-by-side playtesting; useful but not physics parity |
| Behavioral equivalence within stated tolerances | Recorded trajectories and events agree across a defined test matrix | Published errors, conditions, coverage and known exceptions |
| Exact simulation equivalence | All relevant state transitions and numerical results match the target build under the same conditions | Recover the full simulation path, match numerical semantics, and validate it against the executable; a finite set of tests alone cannot prove equivalence for every possible input |

Target exact simulation equivalence, and report intermediate progress as measured behavioral equivalence. Do not relabel a small error threshold as “100%.” If bit-for-bit state equality is required, explicitly include floating-point precision, operation order, helper approximations and scheduling in scope. Equivalent rendered poses alone are insufficient.

First cover the local player's bike in single-player, all available bike/power and suspension settings, and indoor/outdoor behavior. Then cover interactions with other riders, obstacles, crashes, resets and boundary behavior. If we exclude multiplayer-specific physics branches or another mode, say so in the final parity claim. Network transport, graphics, sound assets and UI reproduction are separate from physics unless they feed simulation state or timing.

## Current approximation inventory

Every item below needs either original-code evidence and validation or removal from the parity implementation.

| Area | What we currently do | Unresolved parity work |
|---|---|---|
| Solver | Cannon rigid body, contact impulses and solver iterations | Original integration, contact resolution and update order |
| Timing | Fixed 120 Hz | Original nominal 20 ms scheduling, short-frame fallback, iteration cap and elapsed-time handling |
| Units | SI conversion and gravity 9.81 | Original units, actual gravity path and rounding; 32.2 ft/s² converts to 9.81456 m/s², not exactly 9.81 |
| Body | 183.7 kg total, scaled hand-authored inertia and box collider | Center of mass, actual inertia, shape hierarchy and rider/body coupling |
| Wheels | 2.15 m wheelbase, 0.61 m radii | Original axle positions, separate radii, steering axis and suspension geometry |
| Suspension | Recovered coefficients applied to scalar ray compression/velocity | Original vector inputs, extra force term, geometry, load share and limits |
| Suspension safeguards | 30 kN clamp, nonnegative support, bank-independent ray direction, seam retries | Determine whether any corresponding behavior exists in the original |
| Steering | Bike Lab balance-steer law, our yaw feedback, speed blending and slope compensation | Original input-to-handlebar and input-to-orientation calculations |
| Lean | 40° target, rate-limited target filter, torque-based tracking | Original correction acts on orientation with conditional gating; matching a target rate is not the same algorithm |
| Traction | Pacejka-style lateral curve and combined grip ellipse | Original longitudinal/lateral forces, slip and load calculation |
| Wheel speed | Road speed plus artificial throttle spin | Determine original wheel rotational dynamics and engine feedback; ours is not an independently integrated wheel inertia model |
| Drivetrain | First recovered torque curve with chosen overall ratios | Original reduction composition, all curves, RPM coupling, shift predicates and launch behavior |
| Engine adaptations | 5750 RPM clutch floor, 4200 RPM downshift, 250 ms anti-hunting delay, 0.92 efficiency, RPM smoothing | Recover or eliminate each of these assumptions |
| Braking | 1200 N front / 700 N rear, lean-based reduction, rear engine brake up to 100 N | Original brake distribution, wheel locking, coast-down and engine braking |
| Drag | Quadratic horizontal drag plus Cannon linear/angular damping | Original force law, affected axes, thresholds and dissipative terms |
| Rider assists | Anti-flip torque, roll PD controller, synthetic gyroscopic damping and foot support | Original equivalents, including whether some are absent |
| Air control | Custom pitch, roll and yaw torques | Original airborne input, wheel reaction and momentum behavior |
| Crashes | Custom contact/up-vector/impact conditions | Original complete decision tree, timers, rider separation and recovery |
| Extras | Regenerating boost and 1.35× engine force | Disable in parity mode unless an equivalent is established in the target build |
| Terrain | Procedural heightfield and selected sphere obstacles | Original terrain sampling, normals, collision shapes and material properties |

## Phase 0 — Establish a runnable reference and preserve the baseline

- [ ] Get the target build running in an environment that supports both execution and inspection. Confirm launch, controls, loading, clock behavior and stable gameplay before choosing the debugger/instrumentation workflow.
- [ ] Record executable and physics-relevant asset hashes, settings, selected bike, mode, track, input device, compatibility wrappers and runtime environment. Do not assume the two folders' extra wrappers have no timing effects.
- [ ] Keep a pristine reference installation. Make experiments in a separate copy with a change log.
- [ ] Record several identical-start runs. Measure whether the original repeats exactly, and identify randomness, timers or external state if it does not.
- [ ] Preserve today's adaptation as a separate behavior/profile. Do not keep changing the current game while losing the only reproducible baseline.
- [ ] Resolve development access for Git writes, local servers and original-game execution/debugging. These were blocked or unavailable in this session; they are execution prerequisites, not physics problems.

**Exit condition:** the original is runnable, its configuration is pinned, and a repeated input sequence can be captured reproducibly enough to investigate discrepancies.

## Phase 1 — Build the original-game measurement harness

This is the highest-priority missing capability. Another set of guessed constants will not substitute for it.

- [ ] Locate the live player-bike object and distinguish it from AI/network bike objects.
- [ ] Find the actual simulation-step entry/exit and determine which state is authoritative versus used only for rendering or HUD display.
- [ ] Recover the complete mutable state needed to restart a simulation: transforms, velocities, wheel/contact history, engine state, accumulators, filters, crash state, random state and relevant globals. Position and velocity alone are not a full checkpoint.
- [ ] Capture pre-step inputs and state plus post-step outputs, indexed by simulation step, frame and time. Capture raw numeric representations where practical as well as readable values.
- [ ] Inject repeatable controls at the same point the original consumes them. Record input device processing separately from normalized simulation controls.
- [ ] Record each substep's actual dt, not just video timestamps or display FPS.
- [ ] Add controlled initial states and test geometry. Prefer loading an authored test track through the original's supported content path, if feasible; otherwise instrument state at a known location and record the exact geometry used.
- [ ] Measure instrumentation overhead and check that logging does not change the dt sequence or behavior. Keep an uninstrumented comparison run.

Required trace fields, as they become understood: chassis position/orientation and linear/angular velocity; front/rear contacts, normals, contact points and penetration; suspension displacement/velocity/force; tire force and wheel angular speed; handlebar angle; rider/lean state; throttle/brake; gear/RPM/shift state; total force/torque; airborne/crash/reset events; settings and seed.

**Exit condition:** replayable original-game fixtures with known initial state, inputs, geometry and time sequence. Videos supplement these traces; they cannot replace internal-state comparison for exact parity.

## Phase 2 — Recover the simulation call graph and numeric foundations

- [ ] Import the executable into a decompiler/disassembler, create a named analysis project, and retain the existing address-based evidence.
- [ ] Trace outward from the bike update and each known constructor. Identify all simulation callees and globals, including generic vector/matrix math, terrain queries, input processing and crash handling.
- [ ] Recover object layouts and field types. Track every relevant field's readers, writers, initialization, units and lifetime. Treat previous analyst-assigned names as hypotheses until confirmed.
- [ ] Recover coordinate axes, handedness, orientation representation, angle units and matrix/quaternion multiplication order.
- [ ] Recover update order: input, controller, engine, contact queries, forces, integration, collision correction, crashes and render state. Establish whether a force uses this step's contacts or cached contacts from the previous step.
- [ ] Resolve nominal 20 ms scheduling, short-frame fallback, 10-iteration cap, remainder handling, pauses, stalls and long-frame behavior. Test boundaries on either side of each scheduling branch.
- [ ] Resolve scalar storage precision, x87 intermediates/control settings, rounding, integer conversions, clamp comparisons and custom math helpers. Compare their results directly on representative and threshold inputs.
- [ ] Choose the implementation strategy from evidence: a dedicated translated physics core is the likely route if Cannon cannot reproduce original transitions. Keep rendering separate. A WebAssembly core is an option to evaluate, not a guarantee of x87-equivalent arithmetic.

Useful starting addresses from the current investigation:

| Address | Investigation lead |
|---|---|
| `0x4a1ff0` | Bike setup and initialized fields |
| `0x4a54b6–0x4a5548` | Step scheduling and fallback |
| `0x49ef90` | Drivetrain initialization |
| `0x4b11e0–0x4b1315` | Suspension force helper |
| `0x4ac335–0x4ac50e` | Lean candidate, clamp and rate logic |
| `0x4a832c–0x4a83f0` | Partly understood traction scaling |
| `0x4016c0` | Custom magnitude/math helper |

**Exit condition:** a documented simulation dependency graph, state layout, unit map, scheduler and tested math primitives. No claim that changing our update rate to 50 Hz alone achieves this.

## Phase 3 — Recover geometry, terrain and contact mechanics

- [ ] Determine which bike/model data contributes to physics and which is visual-only. Extract physical measurements and transforms without confusing animation geometry with collision geometry.
- [ ] Recover wheelbase, wheel radii, steering-axis geometry, fork direction, swingarm pivot, suspension rest pose, limits and motion ratios.
- [ ] Recover separate bike/rider masses, center of mass, inertia tensor and any change caused by rider movement or stunts.
- [ ] Recover terrain coordinate scale, height decoding, sample spacing, triangle selection, interpolation, normals, seams and out-of-bounds behavior.
- [ ] Recover contact generation: rays, spheres or other primitives; number of samples; query direction; contact persistence; contact offsets; static versus moving surfaces.
- [ ] Recover collision response: restitution, friction, penetration correction, impulse ordering, iterations and any separate handling for chassis versus wheels/rider.
- [ ] Recreate matching diagnostic surfaces in both engines: flat, constant incline, cross-slope, sharp crest, step, tabletop, repeated whoops and obstacle contact. Confirm sampled heights/normals before comparing vehicle forces.

**Exit condition:** identical geometric queries produce matching contacts and normals; body parameters are recovered rather than visually estimated. The same controls on different terrain cannot establish physics parity.

## Phase 4 — Complete suspension recovery

- [ ] Trace both callers of the recovered spring/damper helper and establish every argument, including the extra scalar term.
- [ ] Resolve displacement vector versus scalar compression, velocity-vector magnitude versus axial velocity, force direction and attachment point.
- [ ] Resolve front/rear load sharing, preload, travel stops, extension behavior, bottoming, rebound, force limits and one-wheel support.
- [ ] Recover how suspension settings modify runtime coefficients and whether player, AI or mode branches differ.
- [ ] Port the original helper and its calling geometry together. Do not retain our 30 kN ceiling, bank-independent rays or scalar simplification in exact mode without evidence.
- [ ] Compare force outputs before whole-bike trajectories: static sag, slow compression/rebound, just below/above damping thresholds, maximum travel, one-wheel landing and hard impact.

**Exit condition:** matching force vectors and moments for matching states, followed by matching sag and landing trajectories. Correct coefficient values alone are insufficient.

## Phase 5 — Complete drivetrain, wheel, traction and braking recovery

- [ ] Decode and independently verify all three power curves, boundary handling and interpolation; recover settings/mode selection.
- [ ] Trace every use of the outdoor/indoor ratio entries and the 0.8333 factor. Resolve overall reduction, wheel circumference, speed units and the meaning of the sixth-gear sentinel.
- [ ] Recover engine RPM evolution, wheel/engine coupling, inertia if present, launch behavior, throttle filtering, limiter and any artificial minimum RPM.
- [ ] Recover the exact upshift/downshift predicates, shift-band randomness if applicable, minimum-speed gates and how the 50 ms shift affects engine output and state.
- [ ] Determine whether wheel angular speed is a simulated state, derived value or hybrid in the original. Reproduce its feedback to forces; do not invent a more realistic wheel model if the original uses a shortcut.
- [ ] Trace the 45 ft/s traction-floor path, including why a state is zeroed in the inspected branch. Identify when it runs and whether it scales thrust, lateral forces or both.
- [ ] Recover surface friction, slip angle/ratio treatment, static/kinetic transitions, combined braking/cornering demand and load transfer.
- [ ] Recover braking distribution, low-speed clamping, reverse/backward behavior, wheel lock, engine braking and coast-down.
- [ ] Recover aerodynamic/rolling drag, angular damping, top-speed constraints and their interaction with slope and airborne state.
- [ ] Remove our chosen gear reductions, clutch floor, anti-hunting delay, efficiency, RPM response rates and boost from exact mode unless validated.

**Exit condition:** engine, gear, wheel, force and velocity traces agree during launches, shifts, partial throttle, coast-down, braking, hills, wheel lift and relanding. Matching 0–60 alone can conceal compensating errors across multiple systems.

## Phase 6 — Recover steering, balance and rider input

- [ ] Recover keyboard and analog input mappings, deadzones, scaling, saturation, smoothing and input sampling times.
- [ ] Resolve the complete lean candidate expression, including the unidentified lateral state and multiplier, the approximately 0.087 rad branch, 40° clamp and 96/120°/s branch conditions.
- [ ] Identify exactly what the lean correction changes: orientation, angular velocity, torque or a combination, and how contact conditions gate it.
- [ ] Recover handlebar steering limits and dynamics, speed dependence, lean-to-yaw coupling, slopes and banked terrain behavior.
- [ ] Recover neutral/release behavior, left/right reversals, stationary balancing and any rider-foot or low-speed assistance.
- [ ] Recover rider weight-shift effects on center of mass, suspension loading, pitch and takeoff. Separate visible rider motion from physical input.
- [ ] Replace the Bike Lab controller, our yaw correction, bank target filter, anti-flip torque and synthetic gyroscopic/foot support with recovered behavior where they differ.

**Exit condition:** matching response to input steps, ramps, releases and reversals at several speeds and slopes. A matching steady turn radius does not prove matching transient behavior.

## Phase 7 — Recover airborne motion, landings, crashes and recovery

- [ ] Recover airborne detection and transitions for zero, one and two contacts. Distinguish contact loss from a gameplay airtime event.
- [ ] Recover airborne throttle/brake, steering and forward/back rider effects, damping, spin limits and wheel reaction behavior, including any nonphysical assistance.
- [ ] Verify whether lateral air input changes only orientation or also velocity. Our existing ballistic-flight test is an assumption about our model, not original-game evidence.
- [ ] Recover touchdown ordering, impact-speed calculation, force/impulse distribution and any landing-specific correction or grace period.
- [ ] Trace the complete crash decision tree: angle frames, acceleration/deceleration calculation, contact conditions, thresholds, rider collision and timers. Initialized 70°/85° values do not establish the whole rule.
- [ ] Recover crashes and rider separation through their physical end state, then remount/reset location, orientation, velocities and cleared/preserved histories.
- [ ] Inspect wheelies, stoppies, stunts, terrain boundaries and exceptional launch/respawn behavior. Include any simulation-affecting branches in scope, even when they look like arcade exceptions.

**Exit condition:** matching trajectories and event sequences for a landing-angle/speed matrix, one-wheel touches, slips, deliberate crashes and recovery. Do not preserve our generous “never wipe out in this test” rules if the reference actually crashes.

## Phase 8 — Modes, tuning and other-body interactions

- [ ] Test indoor/outdoor differences, every power curve and suspension/traction settings at defaults, extremes and intermediate values.
- [ ] Exercise player-versus-AI/object contacts and moving surfaces where the target supports them. Identify special collision or force branches.
- [ ] Determine whether game mode, difficulty, assists or network role affect the player's physical update. Verify rather than infer from UI names.
- [ ] Include relevant state initialization, race start, pause/resume and reset paths. Scope purely AI decision-making separately from bike physics.

**Exit condition:** a coverage matrix that names tested variants and explicit exclusions. One bike on one flat track is not whole-game physics parity.

## Phase 9 — Differential validation and integration

Build a harness that runs the original and our parity core from equivalent fixtures and finds the **first divergent step and field**. Compare inputs, dt and contacts before blaming force equations. Compare each recovered helper independently before long runs amplify a tiny discrepancy.

| Fixture family | Required comparisons |
|---|---|
| Idle / slopes | Equilibrium pose, sag, contact loads, creep, rollback |
| Launch / shifts | RPM, gear changes, wheel speed, torque, acceleration, shift duration |
| Coast / brakes | Force histories, stopping distance, speed decay, lockup and backward motion |
| Steering | Handlebar, roll/yaw, turn radius, reversal delay, slip and release |
| Ramps / whoops | Contact sequence, suspension forces, takeoff pose/velocity, flight and touchdown |
| Air inputs | Orientation and angular velocity together with linear trajectory |
| Crash / recovery | Exact discrete transitions, timing and full reset state |
| Obstacles / boundaries | Contact ordering, impulses, resulting motion and exception paths |
| Timing variations | Same frame-time sequence at 30/50/60/120 FPS equivalents, jitter, stalls and dt boundary cases |
| Settings / modes | All supported engine/suspension/traction variants and applicable gameplay branches |

- [ ] Check raw numerical equality where representations are comparable. Otherwise define semantic mappings and report absolute/relative errors for each field. Do not hide rounding or time shifts in the comparator.
- [ ] For approximate parity, set tolerances from measured reference repeatability and an explicit product decision. Record max error, accumulated drift and event timing; do not rely on averages alone.
- [ ] Preserve contact/no-contact, gear, crash and reset event agreement separately from continuous errors.
- [ ] Add held-out courses and input sequences not used for implementation, plus generated boundary cases and valid randomized scenarios. Keep failures reproducible with seeds/checkpoints.
- [ ] Run long-duration tests to detect drift, energy injection, state leakage and divergence after repeated recoveries.
- [ ] Integrate the parity core behind a small input/state interface. Rendering interpolation must not feed back into physics. Audit existing `sync`/wheel transform calls, which can mutate Cannon contact flags, before treating them as presentation-only.
- [ ] Align camera, rider pose, suspension animation, wheel spin and audio afterward so correct physics is not perceived through misleading presentation. These are separate acceptance checks.
- [ ] Validate the chosen browser/platform targets and performance without silently skipping simulation steps. In exact mode, preserve the original scheduler's semantics even when another behavior would be smoother.

**Exit condition:** reproducible original-versus-port reports, known coverage, no unexplained divergence in accepted fixtures, and an honest equivalence claim. A universal exact-equivalence claim additionally requires sufficient analysis of all relevant branches and numeric semantics; passing a large replay suite alone is not a proof.

## Concrete implementation backlog and ordering

These are proposed deliverables, not files or capabilities already implemented.

| Order | Work package | Deliverable / acceptance gate |
|---|---|---|
| 1 | Reference runtime and manifest | A pinned original installation that runs and repeats |
| 2 | Trace and input replay | Original pre/post-step fixtures with dt and full initial state |
| 3 | State layout and call graph | Typed fields, units, dependencies and function evidence map |
| 4 | Scheduler, math and integration | Helper-level comparisons and matching free-motion steps |
| 5 | Geometry, terrain and contacts | Matching queries and collision inputs |
| 6 | Suspension | Matching force vectors, sag and drop fixtures |
| 7 | Engine, wheels, grip and brakes | Matching force/state traces through launch, shifts and stops |
| 8 | Steering and rider | Matching steady and transient cornering |
| 9 | Air, landing, crash and reset | Matching trajectories and discrete event paths |
| 10 | Variants and interactions | Mode/settings/collision coverage matrix |
| 11 | Browser integration and acceptance | Differential regression suite, performance and presentation checks |

Investigations can overlap after the harness exists, but validation must respect these dependencies. Geometry errors must not be compensated for with grip changes; scheduler errors must not be compensated for with damping changes.

Suggested project structure: an independent `src/physics/mcm/` core; a reference-fixture schema with version, initial state, inputs, frame/substep timing, geometry/settings hashes and expected outputs; a differential runner under `scripts/`; and regression fixtures/tests grouped by subsystem. Keep original executables and raw asset dumps out of the shipped game. Maintain an evidence entry for every recovered function linking its address, interpretation, callers, numeric behavior and validating fixture.

## First work session

1. Make the original runnable and record the environment/settings manifest.
2. Find the player update boundary and enough state fields to capture a stationary bike, straight acceleration and throttle release.
3. Record an input/time trace, repeat it, and establish reference repeatability.
4. Capture the equivalent Dust Valley run and identify the first divergence rather than comparing only endpoint speed.
5. Use that result to prioritize the first translated subsystem. Expand state capture before guessing at hidden state.

Do not start by further tuning our arbitrary gear ratios or steering gains. The most valuable next deliverable is **the original-game trace/replay harness**. Until that exists, we can improve the adaptation, but we cannot measure how close it is to exact parity. Estimate implementation time after the reference runtime, instrumentation and first function-level comparisons are working; those are the largest current uncertainties.

### Milestone delivery

Publish each validated milestone to `origin/main` (user instruction, 2026-11-12).
Before publishing, run the repository tests and production build, inspect the
staged changes, and preserve the original-execution reports and regression
fixtures relevant to that milestone. Use normal fast-forward pushes and reconcile
new upstream commits if necessary. A shipped milestone does not imply full parity.

The first recovery milestone includes player identification and repeatable
original acceleration/release telemetry, isolated recovered physics modules,
original-execution comparison harnesses, and terrain sample hierarchy recovery.
Validation: 114 tests pass and the production build succeeds. The recovered core
is not yet integrated into the playable simulation; continuous terrain queries,
full update sequencing, and whole-bike original-versus-port trajectories remain
required before claiming complete physics parity.

The continuous terrain **height-only** query (`0x411340`, null normal output)
now has an independent translation and original-execution harness. All 40,000
synthetic cases match point output bits under x87 control word `0x027f`; see
`mcm-terrain-height-validation.json`. This covers alternating triangles,
round-to-nearest-even cell selection, negative coordinate clamping, hierarchical
samples, missing tiles and null roots. Retained original fixtures provide a
regression check. Continuous normal interpolation, actual course data and the
connection to whole-bike contact updates remain outstanding. This result is
scoped helper evidence, not a complete physics equivalence claim.

Smooth continuous terrain normals (`0x411340`, normalMode 0) now match all output
bits in 40,000 synthetic original-executable comparisons, repeated with identical
input/output hashes. See `mcm-terrain-normal-validation.json` and the retained
regression fixtures. The implementation preserves the differing intermediate
stores across branches and the even-cell branch that weights corner n01 while
the corresponding height plane uses h11. Synthetic corner normals have positive
Y components; degenerate/cancelling normals are not covered by this claim.
Face-normal mode, course-data recovery, and whole-bike integration remain open.

Geometric face normals (`0x411340`, normalMode 1) now match all six point/normal
output words in 40,000 original-executable cases. The oracle invokes the original
up-vector initializer `0x412910`; omitting it leaves a zero vector in the isolated
loader and incorrectly suppresses normal orientation. The translation preserves
`0x401820`'s rounded length followed by reciprocal normalization, triangle order,
and signed zero after orientation. See `mcm-terrain-face-normal-validation.json`.
These remain synthetic tile tests; actual course data and complete bike-step
comparisons are still required.

Actual TRN v2 sample-bank data is now accessible through the recovered prefix
reader and LZW decoder (`scripts/mcm-reference/terrain-data.mjs`). Across all 35
installed `.trn` files, 28,415 compressed blocks (including five synthetic cases)
match original `0x427a90` output bytes and 32 trailing guard bytes with zero
differences. Original course streams emit one extra byte beyond the nominal
output size; the decoder retains it for validation, and data consumers must use
the nominal prefix. The report records each source file's hash and bank count;
no course assets are committed. Synthetic original-execution fixtures cover
literal, dictionary, width-change and reset behavior.

The loader evidence is `0x410260` (TRN header/prefix), `0x404230` (optional palette)
and `0x44ea00` (sample banks: 512, 580 and 4,624 nominal bytes). Each final bank
block holds 289 16-byte height/normal records. Dunes has 882 banks, height scale
0.01171875 and the following resource section starts at byte 4,042,586. Parsing
those resources and the tile hierarchy remains necessary to map world coordinates
to the correct banks. This is not yet a full course loader or whole-bike parity.

Runtime recheck: the existing original process was alive but a read-only scan
found zero objects with the previously validated bike vtable. macOS remained
locked. No live course-state or new whole-bike capture is claimed from this check.

Actual course hierarchies and world-coordinate terrain queries are now recovered.
Across all 35 installed courses, the original `0x48a2f0` deserializer agrees on
169,376 node records (bias, scale, level, shift, bank reference and all 256 child
links), followed by 140,000 matching point/normal queries through original
`0x411340`. Queries alternate smooth and face modes and include outside-course
coordinates. See `mcm-terrain-course-validation.json` for individual source hashes,
node/query counts and raw input/output hashes. All comparisons have zero differences.

The hierarchy oracle replaces stdio, allocation, child construction and renderer
initialization with host services. It supplies the root offset, decoded banks and
scales from the recovered prefix parser; those prefix calculations are not an
independent full-game-loader comparison. The original node deserialization,
absolute child-offset seeks, recursive traversal and terrain-query machine code
execute intact. A synthetic hierarchy regression checks offset resolution,
world-coordinate scaling and cycle rejection without committing original assets.

Every supplied course uses world-to-grid `float32(1/3)` and height scale
0.01171875. Dunes has 12,594 nodes starting at file byte 5,353,326. Course sample
banks can now feed the isolated recovered terrain query, but the connected bike
update and original-versus-port whole-bike trajectories remain outstanding.

A connected contact-probe sequence is now recovered: original block
`0x4a6a25..0x4a6c01`, point transform `0x4b8660`, and continuous terrain queries.
Across all 35 courses, 420,000 executions match all 23 output words (transformed
points, sampled points, normals, depths and three contact selectors), with zero
differences. Another 12,000 synthetic flat-course cases match; retained original
outputs provide asset-free regression fixtures. See
`mcm-contact-probes-validation.json` and `contact-probes-wine11.json`.

The block first tests bike-local `+0x630` through the transform referenced by
component `+0x8ec`, then tests `+0x63c` only if the first is above the surface.
It always tests `+0x648` through bike transform `+0x434`. The first pair uses a
zero depth threshold, the third uses float32(-0.3) feet. A no-hit pair preserves
the incoming selector; the upstream caller must supply its actual initial state.
The oracle executes this entire instruction range intact and captures its stack
outputs. Inputs use varied affine transforms and synthetic local points over
actual terrain; these are not captured whole-bike configurations. Upstream gates,
subsequent response, suspension sequencing and complete bike-step parity remain
unimplemented/unvalidated by this milestone.

The suspension response caller block `0x4a72b5..0x4a73e2` now matches 36,000
original executions across both signs of supplied contact height: 20,572 active
updates, 15,428 skipped updates, and 3,722 active travel-limit cases. All 23 output
words match exactly. This connects the previously recovered contact geometry and
component travel update to the caller's gates, height reduction, contact-point
translation, response flag and skipped-path history resets. Unassigned scratch
outputs are preserved on the skipped path, as in the original. See
`mcm-suspension-response-validation.json` and retained original fixtures.

The comparison enters after the caller has selected this suspension branch.
Direction, surface normal and contact height are supplied inputs, and the
component transform has no parent. Upstream geometry construction, other response
branches, subsequent force application and full bike integration remain outside
this result. It does not establish end-to-end suspension or whole-bike parity.

The rotating suspension response caller `0x4a7b33..0x4a7c46` now matches all 33
output words in 36,000 original executions: 21,818 active, 14,182 skipped,
5,146 active travel-limit and 3,116 active zero-cross-product cases. This preserves
the original contact geometry, component matrix updates, caller gates, remaining
height and point corrections, and skipped-path travel-history reset. See
`mcm-rotating-response-validation.json` and retained original fixtures.

As with the preceding response branch, geometry and initial scratch outputs are
supplied, upstream branch selection is assumed, and the transform is isolated.
The engine drive-force call immediately following this block (`0x4a7c46`) and the
subsequent force/moment sequence are not included. These response comparisons do
not yet establish connected wheel-contact or whole-bike trajectory parity.

The paired suspension-force caller `0x4a9bbf..0x4a9d5c` now matches 36,000
original executions, including both original `0x4b11e0` calls. All four response
activation combinations have 9,000 cases each; all 12 force/damping output words
match. See `mcm-suspension-forces-validation.json` and retained fixtures.
The caller passes response **travel** (`stack+0x23c` / `+0x238`) as the helper's
compression argument, supplies distinct coefficients and mass shares, and adds
extra stiffness only to the second response. Inactive responses clear force but
preserve the damping scratch vector. These details now have an explicit adapter
in `suspension-forces.js` rather than relying on matching property names.
The oracle supplies response outputs; intervening upstream sequencing and the
subsequent force/torque accumulation remain outside this validation.

The force/torque assembly block `0x4aa77d..0x4aa959` now matches 36,000
original executions across all 13 output words. See
`mcm-paired-force-torque-validation.json`. It adds the two supplied forces in
original float-store order, crosses each with its arm, inverse-rotates the
moments, clips opposite local pitch signs, and preserves the resulting bike
scratch vectors at `+0x540` and `+0x54c`. Both clips mutate the same `+0x8bc`
counter sequentially: the second can reset an increment from the first.
Control comparisons preserve the original signed/unsigned bit tests at ±0.9.
Fixtures include zero forces, boundary controls, and counter overflow.
This oracle supplies assembled forces and valid cached world matrices; earlier
force construction, cache resolution, the following third force contribution,
and complete bike integration remain outside this milestone.

The connected force assembly through angular integration sequence
`0x4aa77d..0x4aaf02` now matches 36,000 original executions across 40 output
words (`mcm-force-angular-validation.json`). This extends the paired-force
milestone through the third force/torque contribution, pivot-history copy,
contact transform correction, inertia selection, opposing acceleration, and
angular velocity integration. The third contact-torque helper can reset angular
velocity X before damping. Its flag is the same front-contact flag subsequently
read by contact correction, rather than an independent input. Opposing torque
uses the corrected transform, while force moments use the preceding transform.
All four state/contact combinations and changed-transform cases are retained in
fixtures. This uses supplied assembled forces, geometry and flags with a root
transform. Upstream force construction, parented correction, linear integration,
and complete bike trajectories are not established by this milestone.

The following force-to-linear-motion block `0x4aaf02..0x4ab49e` now matches
40,000 original executions across 20 output words
(`mcm-force-linear-validation.json`). It stores acceleration from force and
inverse mass, then stores delta velocity before integration. Between those
operations it computes a cross-product/asin steering fallback, updates or decays
`+0x6d8/+0x6dc/+0x6e0`, and chooses the rotation used downstream. The port preserves
signed bit comparisons, float stores, nearest-even counter conversion, sign
crossing resets, and the freeze gate. Fixtures exercise generated correction,
decay, nonzero fallback, and frozen motion. The field meanings remain partly
unresolved; tests supply finite geometry and positive `+0x8cc` values. This block
is not yet joined to the force/angular adapter, and downstream rotation, earlier
force construction, and complete original-versus-port trajectories remain open.

A selectable **MCM preview** handling profile now exposes the recovered digital
throttle, automatic gear helper, captured player engine tables, drive-force helper,
and suspension-force helper in the browser. Select it under Handling, then start
Free ride or Desert circuit. It runs at 20 ms and disables boost; its circuit
results do not update classic leaderboards or ghosts. Reset restores the engine
and deterministic random seed. Free ride starts immediately without race lights.

This is explicitly a hybrid preview, not whole-bike parity: the engine timer/call
sequencing and chassis-speed coupling are browser adapters, and Cannon still
supplies chassis integration, contacts, grip, rider balance, brakes and crashes.
The independently recovered angular/linear caller blocks are not substituted
into Cannon's integration. They still need a complete original-state adapter.
The preview lets the recovered parts be played without misrepresenting that gap.

The force/angular and force/linear blocks are now joined in
`updateMcmForceMotion`, validated against continuous original execution from
`0x4aa77d` through `0x4ab49e`. All 60 output words match in 36,000 cases
(`mcm-force-motion-validation.json`). Shared timestep, contact flags and inertia
have one input source, accumulated forces feed linear acceleration, and the third
local torque scratch vector is preserved into the steering-fallback branch.
Fixtures cover all eight state/contact/both combinations, nonzero fallback and
frozen motion. This closes the adapter gap between those two previously isolated
blocks. Inputs still supply the assembled forces and geometry, and the root
transform limitation remains. Downstream rotation application and complete bike
trajectories remain unverified; the playable preview still uses Cannon chassis
integration until the complete original-state adapter is recovered.

The connected sequence now extends through wheel updates, translation assignment
and pivoted body rotation, ending at `0x4ab7fd`. All 98 final output words match
in 36,000 original executions (`mcm-motion-transform-validation.json`): 31,926
applied body rotations, 4,074 skipped rotations, 1,402 free-engine-spin cases,
6,000 state-2 wheel-damping cases, 7,713 field-driven damping cases and 6,601
preserved wheel transforms. Wheel increments, local matrices and cache flags are
included. Original `0x49e7b0/0x49e7f0` wheel calls remain in the oracle.
The two wheel components retain their original array order (`+0x8dc`, `+0x8e0`).
The body translation is replaced with the integrated position before rotating
around its saved pivot. Final matrix translation can therefore differ from the
bike position fields; both are compared independently. Tests use isolated root
transforms and supplied upstream forces/geometry. Later rider/crash branches,
parent/child cache propagation and whole-bike trajectories remain outstanding.

The following controller velocity handoff `0x4ab7fd..0x4ab99f` now has a
connected 36,000-case comparison (`mcm-motion-controller-validation.json`), with
zero differences across 104 final words. The state-zero path exits at `0x4abb30`
before its separate orientation logic. Active controller flags trigger copies to
controller `+0x70/+0x7c`. Transition kind 2 optionally copies another bike's linear
velocity; kinds 4 and 7 add `min(abs(bikeVelocityY),35)` to copied vertical velocity
and retain full angular velocity. Other kinds scale angular velocity by 0.75.
Inactive gates preserve both controller vectors. Coverage includes 18,005 skipped,
3,602 other-bike, 7,198 vertical-increment and 7,195 damped handoffs. The broader
meaning of transition kinds and controller flags remains unresolved. This is not
validation of collisions with another rider: that velocity is supplied. Following
orientation correction and rider/crash behavior remain outside the comparison.

The nonzero-state orientation branch following controller handoff is now joined
through `0x4ac6cd`. Its connected 36,000-case oracle matches all 107 final words
(`mcm-state-orientation-validation.json`), including 3,599 both-contact corrections,
3,002 front-only corrections and 29,399 skipped corrections. The both-contact path
adds normals with float stores, uses the original inverse-square-root helper,
stores its reciprocal estimate to float, and inverse-rotates the normalized sum
before rotating around the saved pivot. The front-only path rotates around the
initialized Y axis using a negated angle. Cases straddle the original `0.001f`
threshold and verify preserved scratch/axis fields when skipped.
State-zero still exits before its distinct branch at `0x4abb30`. Normals in this
oracle have positive Y so their sum is nonzero, transforms are isolated roots,
and upstream forces/geometry are supplied. Degenerate normal sums, state-zero
orientation, subsequent rider/crash handling and whole-bike trajectories remain
outside this evidence. The playable preview has not adopted this partial core.

The initial state-zero control path `0x4abb30..0x4abef9` now matches 40,000
original executions across 16 output words
(`mcm-state-zero-control-validation.json`). This preserves limited/activation
gates, control-vector construction, scalar modifiers, conditional velocity
normalization and lateral deflection, speed recomputation, and 0.9 angular
velocity damping. Both axial and oblique velocities are tested around the
alignment thresholds, with both signs of the deflection multiplier. Inputs use
positive speed and a supplied component forward axis. This block is currently
isolated; its later timer/orientation code and its connection to the preceding
motion sequence still need recovery. Field labels retain unresolved semantics;
this result does not establish whole-bike trajectories or update the playable
preview's chassis behavior.

The active state-zero path now extends through `0x4ac17b`, including its
`+0xc6c/+0xc70/+0xc74/+0xc78` timer, sign, accumulator and phase state, normalized
control-vector rotation and pivot at `+0x66c`. All 38 output words match across
40,000 original executions (`mcm-state-zero-rotation-validation.json`). Fixtures
include inactive gates, phase/sign transitions, zero vectors and applied rotations.
Later `0x4a4b60` contact/event handling and the alternate state-zero path are not
included; this remains a supplied-state comparison rather than a whole-bike replay.

The shared oracle's bike buffer was expanded from `0x900` to the original `0xcc8`
allocation after compiler bounds diagnostics exposed access to the late fields.
The preceding state-zero-control oracle was rerun with the corrected buffer: all
40,000 cases still match, with the exact same result-file hash as before. Its
report and fixtures now record the corrected loader hash. New timer evidence uses
only the corrected allocation. A stack-relative operand error in the first
rotation translation was caught by the differential run and corrected before
retaining these passing fixtures.

The alternate state-zero alignment path `0x4ac1f7..0x4ac5c5` now matches 40,000
original executions across 32 output words
(`mcm-state-zero-alignment-validation.json`). It includes mask gates, optional
normal-axis pivot rotation and angular damping, construction of the correction
target, its minimum/maximum adjustments, directional rate limiting and the second
contact-axis pivot rotation. The maximum limit compares the magnitude saved
**before** the minimum correction is applied; the port preserves this ordering.
Fixtures span all four mask values, threshold-adjacent angles, both signs, cache
preservation and zero secondary axes. These are supplied-state root-transform
cases. This branch and the preceding active path still need the common
`0x4a4b60` contact/event helper, then full sequencing and trajectory comparison.

The common event **decision** function `0x4a4d70..0x4a52b9` now matches
48,000 original executions across 14 return/state/call-count words
(`mcm-event-decision-validation.json`). The recovered function preserves branch
priority, launch velocities, input-triggered events, suppression and other-bike
pointer clearing, animation-dependent flag changes, counter/angle/contact gates,
collision direction classification, and speed-change checks. All ten emitted
reason codes appear in the original results. Threshold-adjacent values and negative
zero are included; fixture input bit patterns preserve negative zero through JSON.
The input query and two random draws are supplied at their call boundaries, with
call counts and query arguments checked. This validates finite supplied state and
positive collision speeds; it does not validate the input subsystem or RNG here.
The caller `0x4a4b60` still needs its event setup, transform reparenting and rider
controller calls recovered before this decision joins the complete update. This
is not a whole-bike trajectory or playable-mode parity claim.

The rider-controller event entry `0x40fa10..0x40fbac`, called by the common
bike event setup, now matches 32,000 original executions across ten output words
(`mcm-rider-event-validation.json`). It selects an explicit/default event, chooses
three table entries, sets the two activation flags and copies linear velocity to
the previous-velocity field. Selection uses a binary32 store followed by x87
nearest-even integer conversion. An empty first group skips its random draw and
selects zero; the second and third groups always draw. Tests cover every event
kind 0–7 with both draw counts, group sizes up to five, zero/max random values,
and rounding boundaries. Event records and random draws are supplied inputs;
this does not yet recover live controller data or subsequent rider motion. The
remaining event wrapper includes transform extraction/reparenting and bike-field
setup, which must be connected before whole-update validation.

The event orientation call pair `0x4b7640` then `0x4b7270` now matches 32,000
original executions across 56 output words
(`mcm-event-orientation-validation.json`). This corrects the earlier provisional
“reparenting” description: these calls extract world forward/up axes and set
orientation; they do not change parent pointers. The port preserves the original
cross-product ordering, binary32 inverse-square-root stores, local translation,
and cache invalidation. Cases exercise root sources and sources parented to the
root target, all eight parent/cache combinations, and nonorthogonal finite axes.
Local matrices, both world caches, scratch axes and final valid flags are checked.
Parented targets and degenerate axes remain outside this recovered entry's scope;
it explicitly rejects a parented target. The subsequent `0x4309d0` operation
copies object bounds and dispatches virtual child callbacks. That dispatch and
the full event wrapper still need connected validation before whole-bike parity
can be claimed.

The connected event wrapper `0x4a4b60` now matches 48,000 original executions
across 104 output words (`mcm-event-transition-validation.json`). The harness
executes its real decision, orientation, bounds-copy and rider-selection callees;
only input-query results and CRT draws are supplied at external boundaries.
Validation includes no-event preservation, all emitted reasons, launch velocity,
orientation/cache changes, envelope setup, copied bounds, pitch-rate minimum,
rider velocity/selection/flags, resource selection and random-call consumption.
The first connected run exposed an integration error: the wrapper exchanges
arguments 10 and 11 before calling `0x4a4d70`. The corrected port and passing
fixtures preserve that exchange, with independently varied argument values.

This connected milestone is limited to root bike targets and bounds records
without child callbacks. The captured player's vtable is `0x4d9a94`; its slot
`+0x1c` resolves to `0x44fa70`. That callback selects a component transform via
`bike+0x234`, applies orientation and changes position through `0x4b7000` /
`0x4b7270` and `0x4b7860` / `0x4b77a0`. Those child-transform paths remain to
be recovered and connected. The port rejects nonempty bounds-child records when
the orientation branch runs. No whole-bike trajectory or full playable parity
claim follows from these supplied-state event tests.

The child callback's position operations `0x4b7860` (pointer arguments) and
`0x4b77a0` (scalar arguments) now match 40,000 original executions across 99
matrix/cache words (`mcm-position-transform-validation.json`). Both original
entry points execute their real world-transform and point-conversion callees.
The port preserves null-reference assignment, self-reference addition, conversion
from another reference through world space into the target parent's space, and
cache invalidation. The inverse helper stores inverse translation as binary32
before adding it to the transformed point; replacing this with a single inverse
matrix operation would lose the original rounding. Cases cover all four reference
kinds, both entry points, every cache combination, shared parents and finite
nonorthogonal matrices. The original uses a transposed rotation even for those
matrices; no general inverse is substituted. Non-self relative conversions require
a parent, matching the original dereference. Child orientation and complete
callback integration remain outstanding.

The nonzero `record+4` branch of the real child callback `0x44fa70` now matches
40,000 original executions across 105 output words
(`mcm-local-child-transform-validation.json`). The harness executes the component
index lookup, local orientation `0x4b7000` and relative position `0x4b7860` together.
It checks three nodes' local/world matrices and cache flags plus the callback's
in-place forward/up mutations. Unlike `0x4b7270`, this local orientation entry
retains the binary64 inverse-square-root intermediate while multiplying each axis
component, and sums squared components in a different order. The port preserves
both differences. Coverage includes all 32 parent/cache combinations, component
indices 0–7 and nonorthogonal, nondegenerate axes. The zero `record+4` callback
branch and dispatch over the complete bounds-child list still need recovery and
connection to the event wrapper; this milestone does not remove that wrapper's
child-list guard.

The zero `record+4` branch of `0x44fa70` now also matches 40,000 original
executions across 105 output words
(`mcm-relative-child-transform-validation.json`). This executes relative
orientation `0x4b7270` and scalar relative position `0x4b77a0` together, including
component lookup and mutations of the record's axes. The port includes the
separate pointer-argument matrix product `0x4b9bb0` and preserves its x87 sum
orders, rotation-only transposes, binary32 normalization and restoration of the
local translation. Coverage uses the same 32 parent/cache combinations and eight
component indices as the first branch. Both callback branches now have isolated
original-execution evidence; ordered child-list dispatch and their connection
inside the event wrapper remain outstanding. Null/self orientation-reference
paths are implemented but are not covered by this callback-specific report.
