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

The event wrapper now executes ordered child callbacks instead of rejecting
nonempty bounds-child lists. The connected `0x4a4b60` oracle, using the captured
player vtable and real `0x430970` / `0x44fa70` dispatch, matches 48,000 original
executions across 197 output words (`mcm-event-children-validation.json`). Three
ordered records update two components, including repeated updates to the same
component, both callback branches, and sibling or parent-child layouts. In
addition to all previous bike/rider outputs, validation checks component local
and world matrices, cache flags and mutated callback record axes/positions.
This supersedes the earlier wrapper child-list exclusion for this tested graph
model. The original no-child fixtures remain in the regression suite.

The state adapter currently represents a root bike target, an independent or
bike-parented orientation source, and components whose parents precede them in
the array. Arbitrary aliasing between source and component nodes, parented bike
targets and captured live rider tables still need evidence. Input and random
values remain supplied call-boundary data. Full-update sequencing, live state
adaptation and whole-bike acceleration/release trajectory comparison remain
required before claiming complete physics parity.

The common post-event section `0x4ac6cd..0x4ac7c4` now matches 40,000 original
executions across 50 output words (`mcm-post-event-state-validation.json`). This
copies local transform position back to the bike, suppresses yaw rate below the
original signed-bit speed threshold with both contacts, converts angular velocity
to world space, advances the delayed-award timer, and copies suspension heights
and dt to their output fields. Its real `0x4b1a40` scoring arithmetic is executed:
scaled score minus its remainder modulo 100, followed by binary32 storage. The
settings flag can suppress the returned award. Optional UI observers are absent
in the harness; their callbacks are not part of this evidence. Coverage includes
root/parented transforms, cache states, speed boundaries, timer gates and negative
zero, whose input bits are retained in fixtures.

The sequencing trace also confirms that an event clears `bike+0x8c8` and reduces
the remaining update count to one. A no-event result calls `0x4aecb0` only on the
last scheduled update, before this common section. That rider/animation routine,
the object/collision callbacks starting at `0x4ac7c4`, and the subsequent scheduler
remainder handling are still required for a complete update and trajectory test.

The no-event rider routine's blend tail `0x4af185..0x4af6f6` now matches 48,000
original executions across seven output words (`mcm-rider-blend-validation.json`).
It includes directional peak tracking, conditional preservation, clamped envelope
movement, and inactive envelope reset plus component-angle-to-blend conversion.
The original stores the new envelope as binary32 but retains its extended value
to derive the blend; the port preserves that distinction. Fixtures cover positive
and negative control, signed zero, blend/angle/limit boundaries and dt above/below
the envelope duration. Inputs are finite with positive durations and component
limits. Earlier pose/trick selection, its helper calls and connection to the
complete rider routine remain outstanding; this does not establish whole-bike
trajectory parity.

Connected rider pose selection and blending `0x4aefcd..0x4af6f6` now match
48,000 original executions across 11 output words
(`mcm-rider-pose-validation.json`). The port includes lower/upper height selection,
the speed-14 branch, nearest-even pose-index conversion, the special speed-32
weight path, and the secondary-weight update/preservation rules, then executes
the recovered blend tail. Both the unrounded and binary32-stored pose-coordinate
values are needed at different points. Coverage includes threshold-adjacent
heights and speeds, both mode flags, steering samples and signed-zero blend
control. Earlier input/trick handling and the orientation reset before this
section still need to be connected; full-update and trajectory parity remain
unproven.

The trick-start helper `0x4a1970` now matches 48,000 original executions across
209 checked state words (`mcm-trick-start-validation.json`). It runs the real
orientation/bounds-child callbacks and both animation selectors `0x430a20`, with
all 16 trick indices and both orientation-reset paths. The port resets the
envelope and trick counters/flags, optionally resets orientation and dispatches
child records, and selects the rider and bike animation records. Pointer outputs
are compared as indices into supplied animation tables. Event and trick paths
now share the recovered graph/reset adapter; existing event fixtures continue to
check its behavior. Graph scope remains a root bike with the tested component
hierarchies and nondegenerate axes. Live animation tables, selection of a trick
from rider input, the nearby-bike interaction helper `0x4a16d0`, and full-step
trajectory validation remain outstanding.

Directional trick selection `0x4aee32` connected to the real trick-start helper
now matches 48,000 original executions across 210 checked words
(`mcm-trick-selection-validation.json`). The oracle exits at `0x4aed96` for the
dead zone or `0x4af6f6` after trick startup. The recovered path preserves the
unrounded squared-input dead-zone comparison, original coarse square root,
different stored/unrounded direction thresholds, both button-selected banks,
and all downstream orientation/child/animation mutations. Tests exercise all
16 trick indices and no-selection preservation with inputs around magnitude 0.5
and across direction sectors. The earlier input/button gates and nearby-bike
interaction branch remain outside this evidence, as do full-step trajectories.

The bike button-query path `0x4a4ab0`, real POV lookup `0x453fe0` and real input
aggregator `0x454f70` now match 48,000 original executions, including result,
number of polls and ordered device identities (`mcm-bike-input-validation.json`).
The port preserves AI/secondary-control gates, suppression of action 4/5 queries
when an active POV is present and engine/brake state is signed zero, both inactive
POV sentinels, and short-circuit polling across all six device slots. Device-level
responses at `0x452670`, `0x453cd0` and `0x454760` are supplied, with action/option
arguments checked by the oracle. Fixtures include every observed result/poll-count
combination. Device mapping and acquisition remain external; connection into the
complete rider update and full-step trajectory evidence are still required.

### Nearby-bike selection (2026-11-12)

Recovered the original bike iterator (`0x459e90`) and the connected nearby-bike
selection prefix (`0x4a16d0..0x4a17ba`). Selection excludes self and disabled
candidates, terminates on null list entries, and preserves the original mixed
float32/double distance calculation and comparison against the rounded best.
The iterator preserves its cursor when globally disabled and resets it at the
original end boundary, including the single-player special case.

Validation: 32,000 deterministic cases executed against the pinned PE under Wine,
with zero differences in iterator result/cursor and selected-bike identity.
The harness exits immediately after the original stores the selected bike;
angle, orientation, animation and full rider-update parity remain outstanding.
Report: `mcm-nearby-bike-validation.json`; reproduce with
`node scripts/mcm-reference/compare-nearby-bike-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
This is another dependency for the remaining interaction branch, not whole-bike
trajectory parity. The playable preview still uses the hybrid Cannon chassis.

### Nearby interaction angle gate (2026-11-12)

Extended the connected original execution through `0x4a1847`: candidate selection,
`fpatan` relative heading, float32 store, single +/-2pi correction, and the strict
absolute-angle gate at float32 0.698. No candidate preserves the previous angle.
The port matches all five output words in 32,162 cases, including 162 directed
float32 neighbors around +/-0.698, +/-pi and +/-2pi. Fixtures retain every directed
case and each selection/acceptance outcome. Report:
`mcm-nearby-interaction-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-nearby-interaction-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The harness marks the accepted branch and returns before any orientation, state
or animation mutation; those remain outstanding, as does full rider-update parity.
JS atan2 agreement here is empirical for these finite cases, not an exhaustive
proof of agreement with x87 transcendental rounding.

Next dependency traced directly from disassembly: `0x430ab0` seeks the linked
animation frame whose index is nearest-even(float32((frameCount-1)*fraction-.5)),
copies its bounds, and dispatches each frame child through vtable slot +0x14.
For the bike that callback is `0x44f8b0`, not the bounds-reset `0x44fa70` callback.
It normalizes orientation using the existing local/relative helpers, but only
sets relative position when component table entry +0x38 is nonzero. The interaction
seeks rider record bike+0x778 and bike record +0x790 at fraction .5. Validate these
callbacks and the rider proxy's actual vtable before claiming the complete helper.

### Connected animation seek and bike child callbacks (2026-11-12)

Recovered `0x430ab0` frame selection, bounds copying and linked child dispatch,
connected to the real bike vtable callback `0x44f8b0`. The callback mutates record
axes, selects local versus relative orientation and applies position only when
component +0x38 is nonzero. The port keeps the original nearest-even conversion
and float32 intermediate when choosing the frame. Other animation state is
preserved; this is not the animation reset behavior of `0x430a20`.

40,000 original-execution cases produced zero differences across 119 output words:
three local/world matrices and cache flags, both child records' mutated axes,
selected frame/record identity and bounds. Cases cover 1–8 frames, five fractions
including the interaction's .5, empty/one/two-child lists, both orientation branches,
both position flags, component indices, and body/external parents. Ordered child
cases target the same component so prior mutation and cache invalidation matter.
Report: `mcm-animation-seek-validation.json`; reproduce with
`node scripts/mcm-reference/compare-animation-seek-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The initial harness mismatch was an input adapter error (parent flag offset), fixed
before the successful runs; no original routines were replaced or patched here.

Still required: identify the rider proxy's actual callback table, integrate both
animation seeks with nearby interaction orientation/state updates, then connect
the full rider update. Whole-bike parity remains unproven and the playable preview
continues to use its hybrid chassis.

### Complete nearby interaction with both animation seeks (2026-11-12)

Recovered and validated the whole `0x4a16d0` helper: iterator/selection, angle gate,
orientation and bounds reset, interaction flags, +/-2.7 angle clamp and +/-0.7 lean,
progress reset, then rider and bike animation seeks in original order. The accepted
path resets orientation regardless of the incoming +0x820 flag. No candidate and
rejected-angle paths preserve the other transition state.

Rider proxy identity evidence: bike construction at `0x4a2519..0x4a2556` calls
`0x45bbc0`, which installs primary vtable `0x4d7b14`; slot +0x30 is `0x44ede0`
and the returned +0x404 interface is adjusted back before storage at bike+0xc8c.
Both that table and bike vtable `0x4d9a94` have `0x44f8b0` at slot +0x14.
The oracle uses those original tables and runs both real animation seeks.

48,000 cases, 220 compared words per case, zero differences. All frame counts
1–8 include no-candidate, rejected-angle and accepted-angle cases. Compared state
includes matrices/caches, mutated child records, bounds, animation record/frame
identity, flags, envelope, angle/lean/progress, and preserved unrelated fields.
The initial comparison exposed only signed versus unsigned representation of an
unchanged -1 state word; the comparison now consistently uses unsigned words.
Report: `mcm-nearby-transition-validation.json`; reproduction:
`node scripts/mcm-reference/compare-nearby-transition-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.

Scope: supplied finite state, root target, source root/child, nested/sibling
components, with bike and rider deliberately sharing the component graph and
child records to exercise mutation order. Independent rider graphs, live asset
records, full rider-input integration, and whole-bike trajectories remain open.
No full-physics parity claim follows from this helper validation.

### Rider-update control flow, pose and blend (2026-11-12)

Recovered the complete control flow of `0x4aecb0`, joining early state gates,
local-input gates, ordered actions 9/6/7, nearby/trick dispatch, the +0xc68 flag
branch, high-stance pose selection, orientation reset dispatch and ordinary
pose/blend. A nearby call returns immediately even if its callee rejects the
interaction. Queries 6 and 7 both occur before testing their combined result.
The high-stance branch sets +0x820 and updates pose/weight without rewriting the
next-pose or secondary-weight fields, then enters the common blend tail.

48,000 original-execution cases, zero differences in 20 words including query
order, all 16 trick indices, nearby/reset dispatch and pose/blend state. Fixtures
retain every one of the 19 observed dispatch outcomes and signed-zero controls.
Report: `mcm-rider-update-validation.json`; reproduce with
`node scripts/mcm-reference/compare-rider-update-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.

This oracle runs the original full rider function with recording adapters at
input query, nearby and trick calls. The orientation reset block is recorded,
then the original +0x820 clear runs. It therefore validates routing and pose/blend,
not the complete graph/animation integration. The recovered JS function likewise
accepts adapter callbacks that mutate its result state. Next, wire the already
recovered transitions and real graph resets into those adapters and validate the
connected original function without these transition substitutions. Full
whole-bike trajectories and the hybrid-preview replacement remain unfinished.

### Connected full rider update (2026-11-12)

Connected the recovered `0x4aecb0` control flow to real input gating/aggregation,
nearby interaction, trick startup, orientation reset, ordered bounds callbacks,
bike/rider animation selectors, pose selection and blend. The new original oracle
calls the full function normally and does not substitute its transition/reset
routines. Its only executed substitution is the device response at `0x452670`;
query arguments and order are recorded. Both original animation vtables remain
in use. The port's `updateMcmRiderStep` composes those same recovered paths and
returns their graph mutations together with rider state.

48,000 cases, 234 compared words per case, zero differences. Coverage includes all
16 trick indices, accepted nearby interactions, rejected/no-candidate nearby calls,
early exits, orientation resets, pose/blend branches and input-query order.
Fixtures preserve every observed animation/active/query outcome, signed-zero
controls, and signed-zero angular state. Report: `mcm-rider-step-validation.json`.
Reproduce with
`node scripts/mcm-reference/compare-rider-step-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.

Scope remains supplied finite state, a root target with source root/child,
nested/sibling components shared by bike and rider, and synthetic animation
records. Independent rider graphs, live animation assets and live state adapters
are not proved by this run. Whole-bike contact/force completion, deterministic
world checkpoints, original-versus-port trajectories and replacing the hybrid
preview chassis remain unfinished. This closes the transition-substitution gap
from the preceding rider-control validation, not the full physics objective.

### Connected substep remainder and orientation refresh (2026-11-12)

Recovered `0x43f870` angle extraction and connected it to the main update tail
`0x4ac89e..0x4ac94b`. The tail decrements the remaining substep count, consumes
+0x8c8 carry only when that count reaches zero and the signed float-bit comparison
exceeds float32 .0001, stores the reciprocal new timestep, then copies local
forward/up axes and refreshes the angle fields. Angle extraction uses hardware
square root and CRT acos, not the coarse physics sqrt table. Near +/-pi/2 pitch
it folds roll into yaw with the original one-step wrap; cached trigonometric
terms remain those calculated before that angle correction.

The helper and connected tail each match 40,000 original-execution cases with
zero differences (6 and 16 output words respectively). Cases include zero axes,
near-vertical pitch, random finite axes, all tested remainder outcomes, signed
zero carry and float32 neighbors of the carry threshold. Reports:
`mcm-orientation-angles-validation.json`, `mcm-substep-finish-validation.json`.
Reproduce with the corresponding `compare-orientation-angles-oracle.mjs` or
`compare-substep-finish-oracle.mjs` script, pinned executable, and fresh directory.

Still open immediately before this tail: proxy matrix synchronization
(`0x4b7a20`/`0x4b6d70`), collision object refresh `0x42a550`, collision dispatch
`0x42ccc0`, and their state-transition effects. The next iteration returns to
`0x4a5bd7` when remaining >0. This validation does not execute the full iteration,
complete contact/force generation, or establish whole-bike trajectory parity.

### Proxy transform synchronization (2026-11-12)

Recovered the null-reference matrix setter `0x4b6d70` and connected it to the
original world-matrix getter `0x4b7a20(null)`, as used at `0x4ac7ee..0x4ac80b`
and `0x4ac87e..0x4ac899`. Source world resolution and destination-parent resolution
retain their original cache effects. A parented destination uses the original
pointer-matrix product/rotation transpose and rounded translation difference,
with the original scalar summation order. The copied source matrix remains
separate from graph mutations while resolving the destination parent.

40,000 original-execution cases match all 115 output words: three local/world
matrices and cache flags plus the copied world matrix. Covers source root/child,
destination root/source-child/shared-parent and cache combinations. Report:
`mcm-proxy-transform-validation.json`; reproduce with
`node scripts/mcm-reference/compare-proxy-transform-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Non-null reference matrix variants are not included in this implementation.

Next collision dependency: `0x42a550` transforms object +0x70 local center into
+0x7c world center for types 0/1, then enters `0x42a6e0`. That routine checks the
global enable at `0x4e3754`, unlinks active spatial-list entries (object +0x8c,
count +0x90, entry stride 0x18), and dispatches types 0..4 through `0x42b67c`.
The subsequent work includes grid insertion/allocation and cannot be represented
by matrix copying alone. Collision dispatch `0x42ccc0`, complete main-step
sequencing and whole-bike trajectory comparisons remain outstanding.

### Collision world center and type 0/1 spatial-grid updates (2026-11-12)

Recovered `0x42a550` world-center calculation and the type 0/1 path through
`0x42a6e0`: unlink existing active entries, calculate four corner cells, suppress
duplicate cell insertions, and append entries to each cell's linked-list tail.
Entry owner/auxiliary metadata and unused cell indices survive unlinking. The
world center still updates when the global spatial-grid enable is off. Types 2
and invalid values unlink but do not insert; types 3/4 remain unrecovered.

Grid coordinates use truncation toward zero through original `0x4be978`, not
floor. Thus coordinates between -1 and 0 map to cell zero. Out-of-range corners
use the extra cell at dimension squared and participate in duplicate suppression.
The four entry slots correspond to corner order, rather than a packed unique list.

32,162 original-execution cases match 222 words each with zero differences:
world center, all entry words with normalized pointers, and cell/neighbor links.
Includes 162 directed boundary cases, dimensions 1–8, cell sizes .5–100,
prepopulated lists, multiple old entries in the same cell and one-to-four unique
new cells. Report: `mcm-collision-grid-validation.json`; reproduce with
`node scripts/mcm-reference/compare-collision-grid-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.

Scope uses existing four-entry storage. Allocation, types 3/4, collision dispatch,
main-update integration and complete world checkpoints/trajectories remain open.
The original routine was executed without patched callees for these cases.

### Collision entry allocation (2026-11-12)

Extended type 0/1 grid updates to allocate four entries when object +0x8c is null.
The original initializes previous/next, owner, auxiliary and active fields, then
inserts unique corner cells. It leaves cell-index fields uninitialized for corners
that have never been inserted. The JS port represents those with absent cell
properties rather than assigning a fictitious initial cell. Disabled updates and
types 2/invalid do not allocate entries.

32,162 cases match 223 output words with the original CRT allocator running under
Wine, without an allocation stub. The harness initializes the original CRT heap
and thread state and keeps allocated blocks until process exit. It checks entry
count, initialized entry metadata, world center, and all observable cell/neighbor
links. Fresh inactive cell-index words alone are normalized to zero in both
comparison outputs because the original leaves them undefined. Existing-entry
cell indices remain fully compared. Includes fresh and existing entry storage,
empty/no-allocation outcomes and directed cell boundaries.
Report: `mcm-collision-grid-allocation-validation.json`; reproduce with
`node scripts/mcm-reference/compare-collision-grid-allocation-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.

Types 3/4 have separate spatial insertion paths and remain open, along with
collision dispatch and integration into complete original-versus-port trajectories.
This allocation validation does not claim memory-allocator implementation parity.

### Type 3 collision line-grid insertion (2026-11-12)

Recovered the full type 3 branch `0x42a9a0..0x42b00d` and connected it to common
grid dispatch/unlinking. It inserts both endpoints, then traverses X and Z at
cell-size increments using float32 deltas and intermediate coordinates. New nodes
are individually allocated and inserted at the cell-list head, rather than held
in the object's four-entry array used by types 0/1.

Preserved two original quirks: duplicate-owner checks examine the sentinel and
all nodes with successors, excluding the tail; the Z traversal uses the X origin
when constructing its intermediate Z coordinate, while its interpolation subtracts
the Z origin. Neither behavior is replaced with a conventional line rasterizer.

16,000 original-execution cases match all 1,236 output words with zero differences.
Original CRT allocation runs unmodified. Checks ordered owner/auxiliary/active
fields, list lengths and previous-link consistency for every cell; uninitialized
cell-index fields are excluded. Cases include differing grid origins, both signs
of axis delta, zero-length axes, dimensions 1–8, empty lists and one/two existing
neighbors, matching sentinel/tail owners and disabled updates.
Report: `mcm-collision-line-grid-validation.json`; reproduce with
`node scripts/mcm-reference/compare-collision-line-grid-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Type 4, collision dispatch, main-step integration and whole-bike parity remain open.

### Type 4 collision grid branch (2026-11-12)

Traced the separately compiled type 4 branch (`0x42b00d..0x42b673`), including
both endpoint insertions and both axis traversals. Its observable behavior matches
the type 3 traversal, including the tail-excluding owner test and X-origin use
in Z traversal. Dispatch now shares the recovered implementation for types 3/4.

The original type 4 branch was executed independently for the same 16,000 cases.
All 1,236 output words per case match, and its result SHA256 is identical to the
original type 3 run. The regression test therefore checks both types against the
same captured fixture without duplicating it. Separate original source/report:
`collision-type4-grid-oracle.c`, `mcm-collision-type4-grid-validation.json`.
Reproduce with
`node scripts/mcm-reference/compare-collision-type4-grid-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Collision dispatch and complete simulation integration remain unfinished.

### Collision dispatch and sphere pair (2026-11-12)

Recovered connected dispatch `0x42ccc0`, candidate preparation `0x42b870`,
pair-state gate `0x42ca00`, and type 0/type 0 primitive `0x42c0e0`. Preserves
protected pair states, symmetric hit/miss updates, original depth calculation,
asymmetric contact-field copies and ordered primary/secondary callbacks.

32,000 original-execution cases match all 66 output words with zero differences,
covering four objects, repeated cell/owner references, enable flags, protected
pair states, and zero through six observational callbacks. Report:
`mcm-collision-dispatch-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-collision-dispatch-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.

Other primitive combinations, mutating gameplay callbacks, full simulation
integration and whole-bike trajectory parity remain unfinished.

### Oriented ellipsoid contact and collision routing (2026-11-12)

Recovered type 1/type 1 primitive `0x42bab0`: broad-radius rejection,
inverse-transform support directions, per-axis extent scaling, coarse square
root/inverse square root, depth, contact position, opposite normals, and
penetration vector. All float stores and instruction-order sums are preserved.
40,000 original-execution cases with full 3D rotations match all 14 output words
with zero differences (4,690 hits). Inputs use positive extents/radii and distinct
finite centers; coincident/degenerate inputs remain outside this validation.

Connected the recovered primitive to default collision dispatch. A further
32,000 original-execution cases match all 66 words, including original no-hit
combinations, invalid type IDs, protected pairs and ordered observer callbacks.
The original deliberately returns no hit for most type combinations, including
type 2/type 2 after local scratch calculations and type 4 as the first object.
Unrecovered line/ellipsoid combinations throw explicitly instead of returning a
fabricated result. Reports: `mcm-collision-ellipsoid-validation.json` and
`mcm-collision-routing-validation.json`; reproduce with corresponding
`compare-collision-ellipsoid-oracle.mjs` / `compare-collision-routing-oracle.mjs`,
pinned executable path, and fresh output directory.

Line/ellipsoid contacts, mutating gameplay callbacks, connected main-step
integration and end-to-end original-v-port whole-bike trajectories remain open.
These checks do not establish full physics parity.

### Line contacts and complete collision type routing (2026-11-12)

Recovered horizontal line/ellipsoid `0x42c1b0` and spatial segment/ellipsoid
`0x42c5b0`, including projection clamps, distinct broad-phase radius rules,
oriented extent support, depth, and writes that occur before a rejected contact.
The horizontal response follows a directed line perpendicular; the spatial
response follows separation. Both preserve the original untouched other-object
normal field rather than synthesizing a symmetrical result.

40,000 original-execution cases match every hit flag and all thirteen contact
state words with zero differences: horizontal 5,385 hits / 14,615 misses; spatial
3,120 hits / 16,880 misses. Positive extents, nondegenerate segments, finite
nonzero separation and full 3D rotations are covered. Degenerate/zero separation
remains outside the math-helper contract and this validation.

Connected all type routes in `collision-dispatch.js`. Another 32,000 cases match
all 66 outputs using original dispatcher and actual primitives, with every pair
of types -1 through 5 exercised. Hit/miss coverage includes both horizontal
argument orders and the original asymmetric spatial route (1/4; 4/1 is no hit).
Reports: `mcm-collision-line-validation.json`,
`mcm-collision-routing-full-validation.json`; reproduce with corresponding
`compare-collision-line-oracle.mjs` / `compare-collision-routing-full-oracle.mjs`
and the pinned executable plus fresh output directory.

All primitive type routes are implemented for the validated finite domain.
Gameplay-mutating collision callbacks, complete main-step integration and
original-v-port whole-bike trajectories remain unfinished; full parity is not
yet established.

### Single-body collision impulse and callback map (2026-11-12)

Recovered `0x45b3c0`: normal contact speed, type-3 separating gate, inverse
rotation of the lever/normal cross product, inverse-inertia scaling, effective
mass, restitution impulse, optional linear scaling and original angular limiter.
Includes `0x4b85c0` forward-vector rotation with instruction-order sums.
40,000 original-execution cases match all 24 output words with zero differences
(linear/angular velocity, impulse, resolved world matrix and cache flag). Covers
cached/uncached root transforms, full 3D rotations, stationary contacts, all
type gates, positive inverse mass/inertia, and signed angular scales.
Report: `mcm-collision-impulse-validation.json`; reproduce with
`node scripts/mcm-reference/compare-collision-impulse-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.

Constructor `0x4a396d/0x4a397d` assigns bike primary callback `0x49e490` and
secondary `0x49e610`. These apply cooldown/secondary-bike gates, optional tag
transfer (`0x4b1d30`), then collision response `0x49d900`. Secondary sets bike
`+0x8a8` before invoking primary. Response type 0 uses the other bike; type 1
uses its rider/proxy body; type 2 is static contact.

Static response calls bike wrapper `0x49d7f0`, which invokes the recovered
`0x45b3c0`. Wrapper arguments are normal, contact velocity, world lever, local
lever, angular scale, type, linear scale. State `+0x844` selects inertia `+0x5fc`
and restitution .1 (linear scale forced zero), otherwise inertia `+0x5f0` and
restitution `+0x5e0`. It updates angular `+0x534`, linear `+0x510`, copies local
lever to `+0x654`, then for type !=3 rotates angular into `+0x528` and reports
to `0x427110`. Dynamic response instead calls paired-body solver `0x45b6b0`.
The response ends with collision/proxy transform synchronization, grid update,
and possible event wrapper `0x4a4b60`. These wrappers and paired-body solver
remain to be connected and validated; this milestone alone is not full parity.

### Paired-body impulses and bike impulse wrapper (2026-11-12)

Recovered `0x45b6b0`, including relative contact velocity, both bodies' rotated
inertia contributions, effective mass, impulse, and linear/angular updates.
The original uses an unstored impulse intermediate for A's linear update, then
the stored float for angular and B updates. A null B velocity destination skips
both B output updates but still uses B mass/inertia and resolves its transform.
40,000 original-execution cases match all 47 output words with zero differences,
including both linear/angular velocities, impulse and both transform caches.

Connected bike wrapper `0x49d7f0` to the recovered single-body solver. State
selects restitution/inertia/linear-scale rules; the local lever is copied even
when a type-3 separating contact skips solving. Other types refresh world
angular velocity and invoke an optional audio notification adapter. A further
40,000 cases execute the real original wrapper, solver, transforms and audio
routine with a nonmatching listener (no playback). All 29 outputs match. Audio
playback side effects are outside this physics validation.

Reports: `mcm-collision-pair-impulse-validation.json` and
`mcm-bike-collision-impulse-validation.json`. Reproduce via matching
`compare-collision-pair-impulse-oracle.mjs` /
`compare-bike-collision-impulse-oracle.mjs` with pinned executable and new output
directory. Input coverage uses finite supplied states, positive inverse mass
and inertia, full 3D root transforms, and zero/nonzero relative motion.

The main collision response `0x49d900`, primary/secondary callback gates, tag
transfer, and final event/grid integration still require recovery/connection.
Complete original-v-port trajectories and full physics parity remain unproven.

### Connected static collision response (2026-11-12)

Connected `0x49d900` type 2 through position correction, world/local lever
calculation, scaled contact-point angular velocity, real bike impulse wrapper,
speed refresh and low-speed stop, collision matrix/proxy synchronization, and
grid unlink/reinsertion. Preserves two ordering details: position correction
does not rewrite the source transform, and stopping angular Y does not redo the
earlier world-angular refresh.

32,000 original-execution cases match 179 output words each with zero
differences. The original response executes its real impulse solver, transform
helpers, grid update and inactive audio routine. Coverage includes state 0/1/2,
position-correction suppression, stop/nonstop, cached/uncached root transforms,
proxy synchronization and enabled/disabled grids with preexisting list entries.
Report: `mcm-static-collision-response-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-static-collision-response-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.

Visual effects are disabled in the original fixtures. State/secondary flags
naturally suppress the final event transition; the port requires an explicit
transition adapter if that gate is entered. These effect/event boundaries,
dynamic contact types, primary/secondary callback gates, and full main-step
integration remain outstanding. No full whole-bike parity claim is made.

### Connected dynamic collision response (2026-11-12)

Connected original `0x49d900` types 0/1 through bike/rider mass and inertia
selection, heading-dependent contact velocity scaling, position correction,
paired impulse, local lever/world angular refresh, speed, proxy and grid updates.
Preserves the original callback ordering: this response updates only its own
bike, leaving the other body's velocities for its separate response callback.
Rider contacts select primary or alternate rider motion when the other bike is
in a nonzero state. The signed heading wrap and floating-point store boundaries
are preserved.

32,000 original-execution cases match 263 output words each with zero
differences. Coverage includes all 144 combinations of contact type, both bikes'
state 0/1/2, position correction gate, and both independent rider flags, plus
cached/uncached full 3D root transforms and enabled/disabled linked-list grids.
The original executes its real paired solver, transforms, grid updates and
inactive audio routine. Retained fixtures include every state/flag combination.
Report: `mcm-dynamic-collision-response-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-dynamic-collision-response-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.

Visual effects and final event transitions remain suppressed in this validation;
the port requires an explicit event adapter when the final transition gate is
entered. Primary/secondary callback gates, tag transfer, event integration,
full main-step orchestration and complete original-v-port trajectories remain
outstanding. This is not evidence of complete whole-bike parity.

### Collision callback gates and connected dynamic response (2026-11-12)

Recovered primary `0x49e490` and secondary `0x49e610`. Preserves own/other
cooldown gates, secondary field618 and state-2 gates, secondary position-
correction suppression, and the rider-to-own-bike identity exception. Tag
transfer changes the holder before the reset callback, then sends its
notification before setting both bikes' five-second cooldowns. A matching tag
player with a third-party holder reaches the response without the usual other-
bike cooldown gate. Unknown classes reach response routing but do no work.

11,520 exhaustive original callback cases match 23 output words each with zero
differences. These cover both callbacks, classes 0..4, all Boolean gates, states
0/1/2, tag presence/player/holder selection and self-rider aliasing. Response,
tag reset and network notification are instrumented boundaries in this suite;
it validates their call order and arguments, not their downstream behavior.
Report: `mcm-collision-callback-validation.json`.

A separate 32,000-case suite executes the real original callbacks connected to
`0x49d900`, paired impulse, transforms, proxy/grid and inactive audio. All 264
words match with zero differences across 1,152 combinations of callback,
cooldowns, dynamic contact type, both states, position gate and rider flags.
Tag is disabled and the final event gate naturally suppressed here. Report:
`mcm-connected-collision-callback-validation.json`. Reproduce with the matching
`compare-collision-callback-oracle.mjs` or
`compare-connected-collision-callback-oracle.mjs`, pinned executable, and a fresh
output directory.

The port defaults to the recovered static/dynamic responses and requires tag
reset/notification adapters for those branches. Full dispatcher execution with
mutating bike callbacks, final event integration, tag reset internals and full
main-step/trajectory parity remain outstanding.

### Collision response through final crash event (2026-11-12)

Connected `0x49d900` types 0/1/2 to the real `0x4a4b60` event transition,
including its decision, orientation reset, bounds copy and rider animation
selection. The adapter reads the bike after impulse, speed refresh and
proxy/grid synchronization and passes the original collision arguments,
including the wrapper's impulse/type argument ordering. It updates the shared
bike velocities, state, scratch vector and transform and returns the remaining
event/rider state for the caller.

32,000 original-execution cases match 367 output words each with zero
differences. Both dynamic types and static contacts cover event/no-event,
orientation reset on/off, parented/root source components, cached transforms,
linked grid updates, rider selection and input/RNG call counts. Finite supplied
states include zero speed on either bike. Contact type varies independently of
the event scenarios. The original response, impulse, event, orientation and
rider callees run together; only input-query results and CRT draws are supplied.
Visual effects and active audio are disabled; bounds children are absent in
this suite. Report: `mcm-collision-event-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-collision-event-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.

This connection exposed and fixed a previously untested zero-speed decision:
x87 invalid normalization stores negative indefinite NaN, whose unsigned bits
select event kind 3. Depending on a JavaScript NaN's sign incorrectly selected
kind 4/5 and different rider records. Stopped-bike cases are now retained among
the original-execution fixtures.

Full dispatcher traversal with mutating gameplay callbacks, persistent event
state adaptation in the full main step, tag reset internals and complete
original-v-port trajectories remain outstanding. Full physics parity is not
yet established.

### Main-step collision phase with live gameplay callback (2026-11-12)

Recovered `0x4ac7c4..0x4ac89e`: clears the collision's previous other-object
pointer, synchronizes world/proxy matrices, refreshes grid membership, and
enters the real dispatcher unless the secondary-contact flag suppresses it.
Suppression clears that flag after synchronization. Missing collision objects
still synchronize the proxy but leave the flag and other state alone. A
state-zero to nonzero transition during dispatch sets remaining substeps to
one and clears carry time; an already-crashed bike does not take that branch.

32,000 cases match 409 output words each with zero differences. The original
section executes real transform/grid helpers, live dispatcher traversal,
horizontal-line contact generation, primary bike callback, static impulse and
final crash/rider event. Its callback updates the same grid being traversed;
contact pointers, pair table, scratch contacts, grid links, bike/proxy state,
event/rider state, remaining substeps and carry all match. Inputs cover missing
objects, enabled/disabled objects/manager/grid, pair exclusion, broad-phase
misses, contact hits, both suppression flags and initial states 0/1/2.
Suppression varies independently of event scenarios.

Report: `mcm-collision-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-collision-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The harness enters/exits the original section using its real stack/register
layout; it does not replace the dispatcher or gameplay callback. Input-query
results and CRT draws remain supplied boundaries. This suite uses one static
line and one bike, root bike transforms, no bounds children, inactive audio and
no visual effects. Dynamic multi-bike dispatch, persistent event state across
full steps, tag reset internals and complete trajectory parity remain open.

### Two-bike dispatch with ordered gameplay responses (2026-11-12)

Bound the recovered primary/secondary callbacks to live collision objects.
Each callback resolves the other bike from the current contact, so a primary
response's velocity, crash state, transform and grid mutations are visible to
the secondary response. Both responses share the same pair table and grid.

32,000 original-execution cases match 473 output words each with zero
differences. The original main-step collision section runs real ellipsoid
contact generation, both ordered callbacks, paired impulse solvers, proxy/grid
updates and first-bike crash/rider transitions. Secondary responses run for
all three initial states, including the second bike's real final event call in
a supplied nontriggering timing state. Outputs cover both bikes' motion,
transforms, contact vectors, both sets of grid entries, pair table, first-bike
event state and remaining/carry time. A disabled third grid owner also verifies
that traversal ignores disabled objects.

Report: `mcm-bike-pair-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-bike-pair-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Both collision bodies use type-1 ellipsoid primitives and class-0 bike responses;
rider-class dispatch is not included here. A triggered second-bike event,
tag reset internals, persistent event adaptation across complete steps and
whole-bike acceleration/release trajectories remain outstanding. This does
not establish complete physics parity.

### Connected common substep tail (2026-11-12)

Connected `0x4ac6cd..0x4ac94b` as one original-code sequence: local position
copy, low-speed yaw-rate suppression, world angular refresh, delayed award,
suspension/dt output copy, two-bike grid/contact/callback/event processing,
remaining/carry scheduling and orientation extraction. The adapter passes
current suspension heights and the delayed-award flag into the collision event;
stale heights otherwise selected the wrong crash reason and rider animation.

32,000 cases match 496 output words each with zero differences. Carry values
vary independently of remaining-count values and include both sides of the
float32 .0001 threshold. The suite checks that a collision crash clears carry
and ends the substep sequence, while a non-crash with sufficient carry schedules
one extra update and changes dt/reciprocal dt. Both outcomes have retained
fixtures. Initial state 0/1/2, delayed award/suppression/timer branches,
suspension-height event branches, both ordered bike responses and final
orientation are covered in the connected run.

Report: `mcm-substep-tail-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-substep-tail-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The original section executes continuously, including real CRT angle helpers,
scoring arithmetic, collision/event routines and grid mutations. Its fixture
scope retains the prior two-bike harness limitations: root bike transforms,
no bounds children or active audio/visual/UI observers, supplied input/CRT
random draws, and a nontriggering second-bike event timing state. The loop
backedge to earlier force/contact work, persistent full-step state adaptation,
remaining update-end work and full acceleration/release trajectories are still
required before claiming complete parity.

### Connected substep start and analog engine input (2026-11-12)

Recovered and connected `0x4a5bd7..0x4a5e27`: shift-timer decrement/clamp,
brake input/ramp, engine release flag, crashed-state mass substitution,
digital or analog throttle, automatic shifts, previous-speed refresh, vertical
acceleration filtering and low-speed/nonfinite velocity stop. Automatic shifts
read the old saved speed before this section overwrites it with current speed.
Brake and throttle queries retain their original order and gating.

The analog path uses the engine's stored filter duration, preserves the filter
value separately from the .2 dead-zone/1.0-clamped demand, and compares the raw
input against the original double .05 release threshold. The vertical filter
uses the stored duration and the supplied inverse timestep, then saves vertical
velocity before the low-speed stop clears the velocity vector. Brake ramp
increments are per substep, rather than multiplied by dt.

40,000 original-execution cases match 33 words each with zero differences.
The original sequence runs real input gate/aggregator, brake clamps, both
throttle paths, gear helper, acceleration filter and finite-speed check. Only
the primary device response and CRT shift draw are supplied. Cases include
states 0/1/2, rider flags, AI/secondary input gates, timer expiry, shifts both
ways, old/current speed differences, analog dead-zone/saturation inputs,
filter durations above/below dt, and speeds around float32 .001. Fixtures retain
all observed branch outcomes and check device poll order and RNG call count.

Report: `mcm-substep-start-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-substep-start-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Inputs are finite with positive filter durations and the captured five-gear
parameter table. Arbitrary device/POV layouts remain covered separately, not
by this connected run. Contact generation and full loop/state integration are
still required before comparing whole-bike acceleration/release trajectories.

### Connected suspension reset and contact-transform preparation (2026-11-12)

Extended the continuous substep start through `0x4a5ea5`. Original front reset
`0x49eaf0` clears its limit flag and local translation only; rear reset
`0x49ed20` clears its flag and restores the saved local matrix. Both execute
the original cache-invalidating helpers. The subsequent `0x4b7950` null-reference
query resolves the designated node's world position into bike+0x504. The seven
temporary-vector constructor calls at `0x40ded0` do not initialize storage;
the port preserves supplied scratch values rather than inventing zeroes.

40,000 original-execution cases match 257 output words each with zero
differences. This includes all prior connected engine outputs plus six nodes'
local/world matrices and cache flags, both limit flags, the reference position
and seven unchanged scratch vectors. Graph coverage includes root nodes,
front/rear ancestor relationships in either direction, separate branches,
aliased front/rear nodes and position queries on every node. Cached/uncached
states exercise the original rule that invalidating an already-invalid node
skips its descendants. Real full-3D matrix resolution runs inside the original
sequence; only the device response and shift RNG remain supplied boundaries.

Report: `mcm-contact-preparation-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-contact-preparation-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The settings-dependent contact-query branches after `0x4a5ea5`, contact/force
assembly and whole-loop state adaptation are still required before full
acceleration/release trajectory parity can be claimed.

### Wheel-contact terrain samples and front frame (2026-11-12)

Recovered the continuous `0x4a0130..0x4a0442` sequence: rear and front terrain
height/normal samples, world-space forward/up resolution, contact-axis helper
`0x4a1450`, front tangent and normal construction, normal orientation correction,
wheel-radius offset, and the offset terrain resample. Zero cross products retain
the original forward fallback. Missing terrain preserves supplied normal storage.

40,000 original-execution cases match all 80 output words with zero differences.
The oracle runs the real terrain, transform, cross-product and inverse-square-root
helpers. Inputs exercise full 3D root transforms, cached/uncached matrices,
leaf/child/parent terrain traversal, absent child tables, empty child tables and
null terrain roots. Outputs include all ten point/normal/axis arguments, unchanged
height arguments, bike tangent/normal/offset, local/world matrices and cache flag,
and the routine's forward and resample-normal scratch vectors.

Report: `mcm-wheel-contact-frame-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-wheel-contact-frame-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
This validates the front preparation section with synthetic terrain and finite
inputs; rear contact construction, contact-depth processing, connection to the
main substep and full acceleration/release trajectory parity remain unfinished.

### Both wheel frames and initial contact heights (2026-11-12)

Extended the continuous wheel-contact query through `0x4a06ee`. The rear axis
uses the bike's stored forward/up vectors; its tangent falls back to stored
forward when the cross product is zero. The routine overwrites the shared
normal/offset scratch fields with the rear result, offsets the rear wheel by
its own radius, resamples terrain and writes both terrain-minus-contact height
differences. The front tangent and original forward/resample scratch survive.

40,000 original-execution cases match all 86 output words with zero differences.
The oracle executes both frames and all four terrain queries continuously.
In addition to front-frame terrain/cache coverage, inputs include independent
rear radii, arbitrary stored forward/up vectors, parallel rear axes, zero rear
normals and seeded rear scratch normals for absent terrain. Regression fixtures
retain the first case for each combination of these conditions as well as a
deterministic sample of the remaining cases.

Report: `mcm-wheel-contact-pair-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-wheel-contact-pair-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Pitch-dependent contact corrections and the rest of `0x4a0130` remain pending.
The two-wheel query is not yet connected to a recovered full substep, so this
does not establish whole-bike acceleration/release trajectory parity.

### Complete wheel-contact query and penetration selection (2026-11-12)

Recovered the remaining `0x4a0130` sequence through its return: heading/roll
probe points, both additional terrain samples, refined contact frames and
radius offsets, final samples, greater-penetration selection, and conditional
normal/tangent replacement (including helper `0x4a15a0`). The shared scratch
normal/offset fields preserve the final rear refinement even when the earlier
contact wins. Finite float32 pitch cannot equal the original double pi/2
comparison constant, so finite inputs always use its heading-based probe path.

The original calls imported `D3DRMVectorRotate`. The reference game uses Wine
11's D3DRM DLL, SHA-256
`7edb1ed218aececbb44f4d92d5b0880f0ff1777dc525e555140f987015d8be1a`.
The oracle loads that real helper, copies the loaded DLL to temporary output,
and verifies its hash before accepting results. The port preserves the DLL's
float32 quaternion multiplication and normalization, rather than substituting
a direct sine/cosine rotation. This is runtime-specific evidence; it does not
validate arbitrary Windows D3DRM versions.

40,000 continuous original-execution cases match all 110 output words with
zero differences. Coverage includes all four front/rear penetration selections
combined with all four normal-change combinations, hierarchy/cache cases,
parallel axes, flat/zero normals, identity/full-3D transforms, heading values
at zero and float32 multiples of pi/2, and roll values at zero and +/-1.
Fixtures retain every observed outcome combination and deterministic samples.
Report: `mcm-wheel-contacts-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-wheel-contacts-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.

Zero-normal cases exposed an overly restrictive inverse-square-root guard.
The original lookup returns a finite estimate for zero and subnormal inputs;
these now execute the same lookup instead of throwing. Independent validation
matches 58,961 binary64 outputs, including signed zero and all subnormal seed
boundaries. Updated report: `mcm-inverse-sqrt-validation.json`.

Scope remains finite supplied state, synthetic terrain, and the pinned runtime.
Main-substep contact-query dispatch, force assembly and whole-loop integration
are still required before full acceleration/release trajectory parity is proven.

### Ordinary main-substep wheel-query connection (2026-11-12)

Connected `0x4a63d2..0x4a647a`: clear bike+0x6b0, resolve the rear wheel's
world position, then the front wheel's world position, and execute the complete
wheel-contact query. Original stack argument locations and bike+0x590/+0x594
height outputs are captured at the main routine boundary. The real transform
and contact helpers run continuously inside this sequence.

40,000 original-execution cases match 210 output words with zero differences.
Four-node parent graphs cover all 16 front/rear node pairings, including wheels
sharing each other or the contact-frame node, cached/uncached query transforms
independently for each pairing and terrain mode, and ancestor/cache propagation.
Outputs include complete contact results and scratch, every node's local/world
matrices and cache flag, and the cleared field. Leaf-only synthetic terrain is
scaled to keep transformed wheel positions within its allocated tile.

Report: `mcm-substep-wheel-query-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-substep-wheel-query-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
This connects the ordinary query branch only. The alternate settings-dependent
branch, common work after the query and force/whole-loop integration remain
pending; this does not establish full acceleration/release trajectory parity.

### Alternate-contact bike reset (2026-11-12)

Recovered complete reset `0x4a1a40`, called by the alternate pose/contact
routine `0x49f8f0`. It clears motion/event/contact fields, restores mass from
bike+0x68c, resets optional components, and resets the engine to gear zero with
one CRT draw for its new threshold. The inverse mass uses the unrounded mass
product; field+0x814 clears only its low byte. Fields outside the original
write set remain unchanged, including component parameters and engine filters.

8,192 original-execution cases match all 1,043 output words with zero
differences. Each comparison covers the complete 0xcc8-byte bike allocation,
four component buffers, engine allocation, optional effect buffer, and RNG
call count. All 64 optional-component combinations run with zero, maximum and
varied CRT draws. Allocations start with independent finite sentinel values;
the packed byte field starts with arbitrary bits. Supplied pointer slots are
restored to their input sentinels before comparison; only CRT rand is replaced.

Report: `mcm-bike-reset-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-bike-reset-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Source mass is positive and source time/threshold parameters are finite.
The reset is validated independently; the subsequent pose rebuild, terrain
alignment and alternate-path integration remain pending before whole-loop
acceleration/release parity can be established.

### Connected alternate reset and initial pose rebuild (2026-11-12)

Recovered the continuous `0x49f8f0..0x49fa3c` sequence. It executes the full
bike reset, copies supplied forward/up vectors, places the body at input x/z
and local y=100, and saves that position. A vertical/zero forward vector uses
the supplied up vector with a sign selected from the original forward-y bits.
The path then sets world-up, flattens forward-y, applies local orientation to
body and component, and calls the original zero-angle component handoff.

Both orientation calls normalize and overwrite the same forward/up storage.
The second normalization is retained even when the body and component share
one node. The zero-angle handoff copies the body local matrix, zeros component
translation and still executes the axis-angle matrix operation. Cache
invalidation follows the original rule that an already-invalid node skips
its descendants. The saved bike position can consequently differ from the
final local translation when the two nodes alias.

8,192 original-execution cases match all 1,176 output words with zero
differences. Outputs include the full bike/component reset allocations and
random-call count, four nodes' local/world matrices and cache flags, and the
component angle. Cases cover all 64 optional reset-component combinations,
all 16 body/component node pairs, parent graphs, cached/uncached nodes, and
vertical, zero and general forward vectors. Fixtures retain every component
presence pattern, every node-pair/vertical combination, and periodic samples.
Only CRT rand is supplied; reset, orientation, finite check, matrix copy,
translation, rotation and invalidation helpers execute inside the original.

Report: `mcm-reset-pose-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-pose-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Source parameters are finite and the component rotation axis is nonzero.
Terrain alignment after this initial pose, remaining alternate-path work and
whole-loop integration are still needed for full trajectory parity.

### Connected alternate terrain support and pivot alignment (2026-11-12)

Extended the continuous reset/pose sequence through `0x49fcd0`. It reads rear
then front wheel world positions, samples their terrain heights, sets the two
normal outputs to world-up, and places the body at the higher support height.
It derives half the slope angle from the height difference and bike+0x5d8,
rotates about the corresponding positive/negative bike+0x5dc wheel pivot, saves
the resulting local position, resolves body world orientation and applies it
to the component with orthogonalization disabled. Shared forward/up arrays
retain the relative-orientation helper's float32 normalization stores.

16,384 original-execution cases match all 1,208 output words with zero
differences. The comparison retains complete bike/component allocations, RNG
count, four transform nodes, component angle, ten contact argument vectors and
both height outputs. Cases cover both higher-support branches (including
equal heights), all body/component and front/rear node pairings, shared nodes,
parent graphs, cached/uncached transforms, optional engine/effect state, and
leaf/child/parent/missing/null terrain. The four wheel/pose components are
present because this original path dereferences them unconditionally.

Report: `mcm-reset-terrain-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-terrain-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Only CRT rand is supplied; all reset, terrain, transform, pivot-rotation and
relative-orientation helpers execute inside the original sequence. Inputs are
finite, with positive wheelbase/pivot distances and synthetic terrain bounded
for the leaf-only cases. The subsequent orientation-angle/contact query,
final correction and whole-loop integration remain pending before full
acceleration/release trajectory parity can be claimed.

### Alternate contact query and final correction (2026-11-12)

Extended the alternate reset sequence through `0x49fe3a`. The first boundary
at `0x49fd8b` includes orientation extraction `0x43f870` and the complete
`0x4a0130` wheel-contact query. It consumes the existing terrain support
positions rather than rereading wheel transforms. The second boundary includes
`0x49ff10` support correction, another orientation extraction, and the final
rear/front/reference-node world-position reads. The correction uses the same
half-angle pivot arithmetic as the first alignment, then writes -0.01 for the
unsupported wheel and zero for the supported wheel.

Both continuous original-execution comparisons match all 1,208 output words
in 16,384 cases with zero differences. They retain full bike/component state,
RNG count, four transform graphs, contact arguments and height outputs. The
final comparison additionally checks the refreshed reference position stored
within bike state. Inputs cover both support branches, all body/component and
wheel-node pairings, all reference-node choices, cached/uncached parent graphs,
vertical/zero/general forward vectors, optional engine/effect state, varied
wheel radii, and leaf/child/parent/missing/null synthetic terrain.

The real original CRT orientation helpers execute with their heap/thread setup;
the actual loaded Wine 11 D3DRM DLL is hash-checked. CRT rand and initial
uninitialized contact-normal scratch are the supplied boundaries. Separate
fixture sets preserve both intermediate and final states. Reports:
`mcm-reset-contacts-validation.json` and
`mcm-reset-contact-finish-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-contacts-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`
and `node scripts/mcm-reference/compare-reset-contact-finish-oracle.mjs /path/to/mcm.exe /tmp/another-new-output-directory`.

Inputs remain finite with positive wheelbase/pivot distances and the pinned
runtime. Collision-proxy/game-object synchronization after `0x49fe3a`, the
main routine's alternate-path dispatch and whole-loop force integration remain
unfinished. These results do not establish whole-bike trajectory parity.

### Alternate reset bounds and child transforms (2026-11-12)

Extended continuous original execution through `0x49fe41`, including bounds
copying in `0x4309d0`/`0x430970` and ordered player callbacks `0x44fa70`.
The recovered reset now copies minimum/maximum bounds and applies each active
child record's local or relative orientation and position. Axis normalization
mutates the record, and transform cache invalidation follows the original.

All 1,235 output words match in 16,384 cases: zero differences. The comparison
retains the full previous reset/contact output plus all three child records,
including inactive records. Cases exercise zero through three callbacks, both
orientation branches, different component targets, cached/uncached transforms,
and parent chains. Callback targets have parents, as required by the original
relative-position routine; a deliberately invalid parentless target caused an
original-executable fault during harness development and is excluded. The
four-node graph permits component/body aliasing and ancestor relationships.

Report: `mcm-reset-bounds-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-bounds-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The pinned executable and loaded Wine 11 D3DRM hashes are checked. Only CRT rand
and initial contact-normal scratch are supplied. Collision-proxy/grid updates
and final flags after this boundary remain pending, along with main-loop
integration and complete acceleration/release trajectory validation.

### Complete alternate reset routine (2026-11-12)

Connected `0x49f8f0` through its original return. After ordered bounds callbacks,
the routine clears the collision partner, copies the resolved body world matrix,
synchronizes the proxy, and updates collision-grid membership. With no collision
object it still copies the body matrix before synchronizing the proxy. It then
saves bike position at `+0x56c` and sets integer flags `+0x8c0` and `+0xcb4`.
The matrix copy matters when proxy updates invalidate shared transform ancestors.

All 1,474 output words match in 16,384 continuous original-execution cases with
zero differences. Outputs include full bike/component state, transform matrices
and caches, contact arguments, mutable child records, collision matrix/partner,
world center, all four grid entries, and links for 65 cell/marker pairs. Cases
cover collision present/absent, grid enabled/disabled, object types 0/1/2/5,
4- and 8-cell grid dimensions, active and inactive prior entries, proxy/body
aliasing and shared ancestors, plus the existing reset/contact/bounds variations.

Report: `mcm-reset-full-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-full-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The original routine now returns normally; there is no patched exit boundary.
CRT rand and initial uninitialized contact-normal scratch remain supplied, and
the executable and loaded Wine 11 D3DRM hashes are verified. These cases use
existing four-entry collision objects; allocation and line collision types are
outside this integrated comparison. Main-loop alternate dispatch, force
integration, and whole-bike acceleration/release trajectories remain unfinished.

### Main-loop reset pose selection (2026-11-12)

Recovered `0x4a5eb4..0x4a62eb`, entered with a nonzero reset reason. Modes
0/1/4 call the terrain selector; mode 2 chooses a stored respawn pose or a
normalized direction from current position toward the stored point (with the
stored point's Y cleared), then optionally adjusts position through the terrain
selector without a heading argument. Mode 3 uses related pose selection and
calls the course selector with both position and heading. Other signed-short
mode values retain current position/forward. Mode 2's stored-pose branch writes
bike position before any terrain adjustment; mode 3 leaves it unchanged here.

All 18 output words match in 40,000 original-execution cases: zero differences.
The outputs include chosen position/forward, mutated bike position, helper call
count/type, nullable heading argument, and exact vectors passed to the helper.
Inputs cover modes 0..5, -1 and signed-short extrema, settings and bike flags,
nonzero reset reasons, zero/general direction vectors, and seeded caller
scratch (the original vector constructor does not initialize it).

Report: `mcm-reset-selection-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-selection-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
This comparison executes the real branching, subtraction and normalization.
Terrain selector `0x4ae0b0` and course selector `0x4adb10` are supplied boundaries
with captured inputs and deterministic outputs; their internal logic is not
claimed validated by this report. Recovering these selectors and connecting the
main-loop dispatch through the complete reset remain pending. Whole-loop force
integration and acceleration/release trajectory parity are still unfinished.

### Reset nearby-bike avoidance and course adjustment (2026-11-12)

Recovered the complete `0x4adb10` helper. It finds the nearest eligible bike in
original enumeration order, uses the original approximate square root, and
repeats position adjustments until clearance is sufficient. Repeated encounters
with the same bike use a different displacement. Vertical/zero horizontal
heading falls back to world forward when avoidance is enabled. Bike position
is updated during avoidance; later course-limit changes affect the supplied
reset position without copying it back to bike position in this helper.

Mode 3 applies width-scaled limits and geometric terrain-normal checks in X
then Z order, followed by the conditional unnormalized heading toward the stored
respawn point. Comparisons retain the original unrounded intermediate values,
including the Z-distance product and width-scaled boundary thresholds.

All 840 output words match in 16,384 cases: zero differences. These include the
full bike allocation, reset position/heading, and neighboring-bike positions and
eligibility flags. The original executes real `0x459e90` enumeration, square-root
lookup, terrain lookup and face-normal callees, with no patched helper calls.
Inputs cover one/three primary bikes, zero to four additional bikes, disabled
enumeration, skipped neighbors, both clearance thresholds, null/general/vertical
headings, mode and setting variants, and independently varied flat/steep terrain.
The 284 retained fixtures cover branch combinations plus periodic samples.

Report: `mcm-reset-course-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-course-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The harness runs original startup initializers, including `0x412910` for the
terrain default normal; omitting it during development changed boundary results.
Inputs use valid level-two synthetic terrain, finite state and positive course
width. The main selection's integration with this helper, terrain selector
`0x4ae0b0`, complete main-loop forces and acceleration/release trajectory parity
remain unfinished.

### Connected terrain reset selection (2026-11-12)

Recovered complete `0x4ae0b0`, including its real terrain, target-position and
avoidance callees. Five samples cover current position and world X/Z offsets
of +/-10. The original compares normal Y values, preserves its tie order, and
tracks a secondary support using comparisons between normal Y and sample height.
Modes 0/2/4 derive heading from that support or retain the saved heading, then
call `0x4ae9c0` avoidance when a heading pointer is present. Mode 1 optionally
points toward a selected target and calls `0x4adb10`; remaining modes return the
selected support without those heading adjustments.

Target access `0x475380` calls `0x4b7920`, which reads local translation directly;
it does not resolve world transforms or change their caches. The reference
harness runs world-right/up/forward initializers as well as terrain-normal and
math-table initialization. Missing the world-right initializer during harness
development incorrectly collapsed the two X-offset samples onto the center.

All 906 output words match in 16,384 cases: zero differences. Outputs include
the entire bike allocation, selected position/heading, neighboring bikes and
both target-node matrices/caches. Inputs independently vary three terrain grid
scales, flat/shallow/steep height scales, optional target and target choice,
parent/cache combinations, null headings where valid, saved vertical headings,
and neighbors placed around the sampled support locations to exercise avoidance.
Mode 1 supplies a heading pointer, matching its original caller requirements.
There are 300 retained regression fixtures. Shared avoidance arithmetic was
extracted for both original helper entry points; existing course fixtures still
validate the separate boundary-adjustment path.

Report: `mcm-reset-terrain-selection-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-terrain-selection-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
No callees are patched or supplied. Cases use finite synthetic state and valid
level-two terrain. Main selection/complete-reset dispatch integration, full
force-loop integration, and acceleration/release trajectory parity remain open.

### Main reset selection with recovered callees (2026-11-12)

Connected the main selection sequence `0x4a5eb4..0x4a62eb` to the recovered
terrain and course helpers by default. Explicit callbacks remain available for
the earlier boundary-isolation test. The connected oracle executes all original
callees; only its exit boundary is patched. It covers nonzero reset reasons,
mode/setting and bike flags, conditional position-only terrain selection, stored
respawn headings, target objects, nearby bikes and varied terrain.

All 906 output words match across 16,384 cases with zero differences; 429
fixtures preserve this connected comparison independently of the complete
terrain-selector fixtures. Report: `mcm-reset-selection-connected-validation.json`.
Reproduce with
`node scripts/mcm-reference/compare-reset-selection-connected-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The subsequent call into the complete bike reset, main-loop force integration,
and whole-bike acceleration/release trajectories remain pending.

### Continuous main-loop alternate reset branch (2026-11-12)

Connected `0x4a5eb4..0x4a64dc`: mode-dependent pose selection with all real
terrain/course/avoidance helpers, the complete `0x49f8f0` reset, and post-reset
control/cooldown writes. Unlike the earlier standalone reset harness, this path
passes bike `+0x590/+0x594` directly as the contact-height output pointers.
The recovered adapter preserves that aliasing in final bike state.

The main loop clears stack controls at `+0x1c/+0x30/+0x2c/+0x8c` and bike flag
`+0x88c`. It sets cooldown `+0x888` to 3 and integer flag `+0x8ac` to 1 unless
the optional object at settings `+0x608` refers to this bike at `+0x80`. Absent
and other-bike observers take the cooldown path; a self observer preserves the
existing cooldown/flag values.

All 1,566 output words match across 16,384 continuous original-execution cases
with zero differences. Outputs retain full bike/components/engine/effect,
RNG count, transform matrices/caches, contact arguments, child records, collision
matrix and grid links, selected pose, cleared controls, neighboring bikes and
target nodes. Cases combine nonzero reset reasons, modes and flags, observer
variants, targets, nearby bikes, multiple terrain scales, optional engine/effect
and collision objects, and transform aliasing/parent graphs.

Report: `mcm-reset-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The original main branch calls its real reset routine and returns to the main
loop before the exit boundary at `0x4a64dc`. Only that exit, CRT rand and initial
wheel-query normal scratch are supplied; the pinned executable and loaded Wine
11 D3DRM hashes are checked. Inputs use finite synthetic state and valid
level-two terrain. Zero-reset ordinary-path integration, shared force updates,
full main-loop assembly, and acceleration/release trajectory parity remain open.

### Ordinary contact update and shared force preparation (2026-11-12)

Extended the ordinary branch from `0x4a63d2` through `0x4a64dc`, including
complete wheel contacts, conditional component update `0x49eef0`, and cooldown.
The component accumulates a rounded time/rate increment, clears non-finite or
sub-threshold angles, copies the body local transform, zeroes its translation,
and rotates only when the resulting angle is nonzero. Invalidation follows the
original child graph. Cooldown tests signed float bits before and after the
subtraction, preserving negative zero and clearing the associated integer flag
only when a positive cooldown expires.

A second continuous comparison extends through `0x4a663d`: signed-zero-aware
contact flags, rear-normal and speed copies, initial force, conditional velocity
drag, absolute rear alignment, and normalized contact-position difference. Drag
rounds its scalar before scaling velocity; direction normalization uses the
original inverse-square-root routine even for a zero vector.

Both original-execution runs cover 40,000 cases with zero differences across
214 and 227 output words respectively. Inputs cover four-node parent/child
and alias combinations, both component-update branches, tiny angle thresholds,
overflowing angle increments from finite input floats, signed-zero cooldowns,
expiry/equality cases, all terrain-query modes and drag threshold equality.
Component-angle/cooldown bits are stored explicitly in fixture inputs to retain
negative zero through JSON serialization.

Reports: `mcm-contact-substep-validation.json` and
`mcm-contact-force-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-contact-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`
and
`node scripts/mcm-reference/compare-contact-force-substep-oracle.mjs /path/to/mcm.exe /tmp/another-new-output-directory`.
The original component, terrain and math callees execute directly. Query scratch
is seeded as before, and query-return/main-exit observation boundaries capture
outputs. Pinned executable and loaded Wine 11 D3DRM hashes are checked. Later
force assembly, unified complete main-loop execution, and acceleration/release
trajectory parity remain unfinished.

### Connected roll target and suspension geometry (2026-11-12)

Extended ordinary-path execution through `0x4a692a`. The recovered block
projects rear contact normal off the wheel-contact direction, constructs the
roll-target geometry, evaluates the original signed arcsine, and blends the
angle toward current roll according to component steering angle. It preserves
the original differing normalization rounding points and signed speed-bit gate
at 32. The cosine is written before the steering blend and is not recomputed.
Inactive/degenerate paths use current roll and cosine 1.

A second extension through `0x4a69e8` resolves rear and front suspension-mount
world positions after the component rotation, computes wheel lever vectors,
and constructs the front contact axis. These reads can repopulate caches
invalidated by the preceding update, including aliased body/component/mount
nodes. The normal scratch ends with the front mount world position.

Both continuous original-execution runs match all 40,000 cases with zero
differences, across 229 and 238 output words. They retain the prior contact,
force and transform outputs plus target angle/cosine, lever vectors and axis.
Cases cover state and speed gates, exact and adjacent speed thresholds,
component angle thresholds and overflow, signed zeros, all mount pairings,
parent graphs, cached/uncached transforms, and synthetic terrain variants.
The pinned original CRT arcsine executes with heap/thread initialization.

Reports: `mcm-contact-roll-substep-validation.json` and
`mcm-contact-geometry-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-contact-roll-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`
and
`node scripts/mcm-reference/compare-contact-geometry-substep-oracle.mjs /path/to/mcm.exe /tmp/another-new-output-directory`.
The executable and loaded Wine 11 D3DRM hashes are checked. Initial wheel-query
normal scratch and query-return/main-exit observation boundaries are supplied;
geometry and math callees execute directly. Chassis terrain probes, remaining
force assembly, complete main-loop integration and acceleration/release
trajectory parity remain unfinished.

### Connected chassis terrain probes (2026-11-12)

Extended continuous ordinary execution from `0x4a63d2` through `0x4a6c01`.
The recovered chassis block gates on crash state, control20, roll and pitch;
transforms two candidate component probes and one body probe; and executes
terrain height/normal queries to select chassis contacts. It compares depth
before float32 storage, preserves incoming scratch and controls when skipped,
and preserves the prior component contact flag when both candidate probes miss.

The original-execution comparison matches 40,000 cases with zero differences
across 262 output words, including all earlier wheel/contact/force/transform
outputs and the new probe world positions, surfaces, normals, depths and flags.
Coverage includes exact/adjacent roll and pitch thresholds, absent terrain,
parent/mount aliasing, cached transforms, both component probes and missed
contacts. Report: `mcm-chassis-probes-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-chassis-probes-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The executable and loaded Wine D3DRM remain hash pinned. Only initial scratch
and observation boundaries are supplied; terrain and transform callees execute
in the original. Remaining force assembly, full-loop integration and repeatable
acceleration/throttle-release trajectory parity are still unfinished.

### Connected crash steering and landing response (2026-11-12)

Extended continuous ordinary execution through `0x4a6eac`, including both
crashed and upright branches. Recovered crash steering selects signed steering
increments from wheel contacts and target roll, or computes the single-front
contact response from velocity/normal alignment. The component update executes
with the original angle limit and invalidates the same transform descendants.
The upright branch updates landing flags and records airborne roll sign and
angular state. Skipped branches preserve incoming state and scratch values.

All 40,000 original-execution cases match, across 278 output words with zero
differences. The extension exposed a previously untested extreme-angle mismatch:
x87 FCOS/FSIN leave finite operands with magnitude at least 2^63 unchanged.
The recovered axis-angle construction now preserves that behavior, including
resulting overflowing matrix entries, instead of JavaScript range reduction.
An original-execution regression fixture retains this case. Earlier ordinary
component updates and crash updates share the recovered `0x49eef0` operation.

Report: `mcm-contact-response-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-contact-response-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Pinned executable/Wine DLL checks, real terrain/transform callees and supplied
scratch/observation boundaries remain as before. This completes another shared
response block, not the force assembly, full main-loop integration or whole-bike
acceleration/release trajectory comparison; those remain unfinished.

### Connected takeoff, rider weight and force reference (2026-11-12)

Extended continuous ordinary execution through `0x4a7221`. On takeoff, the
original captures position/velocity, updates airborne state and clears the
landing latch. Rider lean drives a bounded-time filter; the active branch uses
the unrounded filter result for mass-weighted front/rear distribution, while
the inactive branch sets equal weights and relaxes the filter toward 0.5.
Grounded state shifts the force reference along normalized horizontal rear
contact tangent; airborne state resolves its reference transform instead.

All 40,000 cases match across 307 output words with zero differences. Cases
include signed-zero lean, enabled/disabled lean, filter durations below/equal/
above timestep, takeoff transitions, mount/node aliasing, and prior contact,
crash, geometry and transform state. An overflowing parent transform exposed
host-dependent NaN signs: the recovered world-matrix stores now preserve the
original x87 negative indefinite value. A selected original-execution fixture
retains the failure case; arbitrary input NaN payloads are outside this corpus.

Report: `mcm-contact-balance-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-contact-balance-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Executable/DLL pinning and observation boundaries remain unchanged. Filter
durations and masses are finite positive values. Remaining force assembly,
full-loop integration and whole-bike acceleration/release parity are unfinished.

### Connected front suspension and crash reference transform (2026-11-12)

Extended ordinary execution from `0x4a63d2` through the first front suspension
response at `0x4a73e2`; no-wheel/rear-only branches are observed at `0x4a8b6e`
and `0x4a7ad6` before their later response calculations. The force reference is
converted into body-local space, lowered by one local unit in crash state and
transformed back. Front suspension now consumes the actual earlier wheel
height, lever and contact normal; its component translation invalidates the
real parent/child graph, including aliases with earlier queried nodes.

The 40,000-case comparison matches all 325 output words with zero differences, preserving all previous
outputs and adding local reference position, suspension displacement/velocity,
travel history, limit/contact flags and activity. It exercises state 2's bypass,
missing front/any contacts, travel limits, signed zeros, zero timestep, graph
aliasing and extreme finite steering. Zero-timestep velocity and overflowed
reference transforms exposed additional x87 NaN-sign behavior. Recovered code
preserves negative invalid results, sign reversal and equal-payload positive
NaN propagation; saved fixtures retain these observed exceptional paths.
Arbitrary input NaN payload propagation remains outside this finite-input corpus.

Report: `mcm-front-suspension-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-front-suspension-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The original suspension/transform callees execute directly with pinned
executable and Wine D3DRM hashes. Later front/rear force calculations, no-wheel
response, complete integration and whole-bike acceleration/release parity
remain unfinished.

### Connected front load preparation (2026-11-12)

Extended continuous ordinary execution through `0x4a7717`, retaining the earlier
no-wheel/rear-only observation exits. When both wheels contact, the original
steering helper changes linear velocity and turn radius, then the caller scales
its turn angle, constructs the front contact arm, projects angular velocity onto
the contact normal, and crosses that projection with the arm. This cross product
writes stack `0x450`; the earlier contact direction at `0x45c` stays intact.
Shared force is scaled by the recovered rear-weight field as in the executable.
Front-only contact instead uses the full force, clears its designated scratch,
and inverse-rotates the contact-to-body offset into the local arm field.

All 40,000 original-execution cases match all 345 output words with zero
differences, including updated linear velocity, radius/turn, arm, projected
angular vector, cross product, force and transform-cache side effects alongside
prior outputs. Report: `mcm-front-load-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-front-load-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Original steering/transform callees run directly; no-wheel/rear-only exits are
observation boundaries, not implemented downstream response. Remaining wheel
force calculations, no-wheel response, full-loop integration and whole-bike
acceleration/release trajectory parity remain unfinished.

### Connected front contact velocity and tire force (2026-11-12)

Extended continuous ordinary execution through `0x4a7b27`, with no-wheel and
rear-only branches still observed before downstream execution. The front path
projects velocity off the contact normal, normalizes with the original inverse
square-root lookup and float32 scale store, updates front-only travel direction
and forward speed, and combines linear contact velocity with its angular term.
Contact speed uses the original approximate square-root lookup. Signed-bit
speed gates preserve distinct low-speed branches and untouched scratch fields.
The connected front tire helper now consumes that contact direction/load and
writes alignment, perpendicular factor, force magnitude and force vector.

All 40,000 cases match across 369 output words with zero differences, including
exact/adjacent 0.001 speed thresholds, signed zeros, front-only/both-wheel
contact, low-speed force clearing and preserved skipped state. The extended
oracle invokes both original lookup-table initializers. Its adapter also makes
local/world matrix arrays independent, matching their distinct original memory
ranges even when a synthetic input reused the same JavaScript array.
Exceptional inverse-point results use typed storage to preserve NaN signs
under V8 optimization; this was verified by the full warmed regression suite
as well as another 40,000-case original-execution run.

Report: `mcm-front-velocity-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-front-velocity-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Original projection, lookup, steering, terrain, transform and tire callees run
directly. Remaining contact-force processing, rear-only/no-wheel response,
full-loop integration and whole-bike acceleration/release parity are unfinished.

### Connected rear-only entry, rotating suspension and drive (2026-11-12)

Extended ordinary execution through `0x4a7c6c`. Rear-only contact now executes
its real front-response clearing block at `0x4a7ad6`, then joins both-wheel
contact for rear suspension and drive force. No-wheel/front-only paths are
observed at their downstream branch entries. Rear response consumes recovered
wheel axis, lever, normal and height, updates travel and wheel contact position,
and rotates the suspension mount with descendant-cache invalidation. Degenerate
contact geometry and skipped responses preserve the original transform behavior.
The suspension helper reports whether rotation actually occurred so an already
invalid parent does not cause spurious invalidation on a skipped rotation.

The rear drive call uses the updated substep speed and rear tangent, executing
released/local/AI branches with synthetic fifteen-entry engine tables. All
40,000 cases match 382 output words with zero differences, including previous
front outputs, rear suspension state and drive scalar/vector. The original
component fields are limit `+54`, divisor `+4c`, limit angle `+48`, prior travel
`+58` and prior height `+5c`; the oracle supplies these independently.

Report: `mcm-rear-suspension-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-rear-suspension-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Original terrain, transform, suspension and engine callees run directly with
pinned executable/DLL checks and both lookup initializers. Remaining rear tire
and contact-force processing, no-wheel response, full-loop integration and
whole-bike acceleration/release trajectory parity remain unfinished.

### Connected rear load and contact velocity (2026-11-12)

Extended continuous ordinary execution through `0x4a8216`, preserving no-wheel
and front-only observation exits. Both-wheel contact constructs the rear arm,
projects angular velocity onto the rear normal, forms its angular cross product
and assigns the front-weight share of shared force. Rear-only contact uses full
force and updates the local contact arm. Rear tangent projection then updates
forward speed, travel direction, contact speed and normalized contact direction.
Unlike the front path, rear linear velocity is not rounded before adding the
angular contribution. The low-speed path retains separate zeroing/preservation
behavior, including leaving the tangent and alignment scratch untouched.

All 40,000 original-execution cases match across 404 output words with zero
differences. The extended corpus exposed an overflowed suspension transform
whose invalid matrix products/sums must store x87 negative indefinite NaNs;
the recovered matrix multiplication now preserves those stores, and a selected
fixture retains the observed failure. Arbitrary input NaN payloads remain
outside this finite-input corpus.

Report: `mcm-rear-motion-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-rear-motion-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
All prior terrain, suspension, steering, front-tire and rear-drive operations
execute continuously with original callees. Remaining rear tire/contact-force
processing, no-wheel response, full-loop integration and whole-bike
acceleration/release trajectory parity remain unfinished.

### Connected rear traction and tire force (2026-11-12)

Extended continuous ordinary execution through `0x4a8634`; front-only contact
now executes the original rear-response cleanup and joins this boundary.
Only the no-wheel path remains observed at its earlier branch entry. Rear
traction compares forward speed and crash state, derives drive acceleration
minus the prior acceleration magnitude, clamps its factors and scales the drive
vector. It preserves the unrounded factor for the vector's X component and uses
the stored factor for Y/Z. Both-wheel contact chooses the front or midpoint
contact arm using the signed-bit 0.9 threshold, then inverse-rotates that arm.
The rear tire helper consumes the resulting scale, normal load and direction;
its low-speed branch clears force/magnitude without overwriting unused scratch.

All 40,000 cases match across 422 output words with zero differences, retaining
all previous connected outputs plus traction intermediates and rear tire force.
Cases include zero/nonzero acceleration, speed limits, crash/normal state,
front-only/rear-only/both-wheel contact, skipped scaling, released drive and
local/AI force branches. Report: `mcm-rear-tire-substep-validation.json`.
Reproduce with
`node scripts/mcm-reference/compare-rear-tire-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Pinned original callees execute directly throughout. Remaining combined
contact-force processing, no-wheel response, full-loop integration and whole-bike
acceleration/release trajectory parity remain unfinished.

### Connected combined tire-force and torque accumulation (2026-11-12)

Extended continuous ordinary execution through `0x4a875b`. Front-only and
rear-only contact pass the actual tire force vector to the limiter, preserving
its in-place mutation; both-wheel contact uses a summed temporary. The caller
combines force magnitudes, derives enabled contacts from signed speed-bit gates,
and passes the real contact arms, timestep, mass, accumulated force/torque and
remaining velocity-change budget into original `0x4b1570`.

All 40,000 cases match across 430 output words with zero differences. The
connected corpus includes zero-timestep invalid arithmetic and canonical NaNs
propagated from overflowed contact arms. Limiter stores preserve the original
negative indefinite value; cross-product and torque arithmetic distinguish it
from positive NaN propagation. Shared exceptional arithmetic also serves the
previous inverse-point path. Saved fixtures retain both observed NaN signs;
arbitrary input payloads remain outside the finite-input corpus.

Report: `mcm-tire-accumulation-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-tire-accumulation-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
No-wheel execution remains observed at its branch entry. Subsequent braking,
contact-force processing, no-wheel response, full-loop integration and whole-bike
acceleration/release trajectory parity remain unfinished.

### Connected braking and airborne suspension cleanup (2026-11-12)

Extended continuous ordinary execution through `0x4a8be0`, including the real
no-wheel cleanup branch previously observed at its entry. Front and rear brakes
consume the velocity-change budget remaining after tire friction, in that order.
The original gates front braking on forward contact speed but rear braking on
combined contact speed. Rear brake magnitude includes the traction factor;
both-wheel contact halves each requested forward-speed change. Force vectors
retain the original unrounded first component and rounded remaining components,
and each limited force adds its contact-arm torque to the shared accumulator.
Crash state skips braking. Airborne cleanup clears suspension activity, travel,
compression and front displacement history while preserving unrelated scratch.

All 40,000 cases match across 440 output words with zero differences. The corpus
includes signed-zero and nonzero brake inputs, crash and airborne states,
front-only/rear-only/both-wheel contact, reversed direction, zero timesteps and
canonical NaNs generated from finite state. Original braking, limiting and cross
product callees execute directly; only entry scratch and final observation
boundaries are supplied. Report: `mcm-braking-substep-validation.json`.
Reproduce with
`node scripts/mcm-reference/compare-braking-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Subsequent force assembly, full-loop integration and whole-bike acceleration /
throttle-release trajectory parity remain unfinished.

### Connected chassis contact merging and penetration correction (2026-11-12)

Extended continuous ordinary execution through `0x4a8ddf`, with the skipped
contact branch observed at `0x4a9b29`. The caller selects crash/normal angular
weights and refreshes chassis probe positions after suspension transforms when
required. Original `0x4b0100` merges rear/front suspension limits and the two
chassis contacts, averages their positions, normalizes the summed normal when
multiple contacts participate, and selects the penetration depth. It computes
the world contact arm, local body arm and velocity at that contact, then moves
both body position and balance center by the normal-projected correction.

All 40,000 cases match across 458 output words with zero bit differences.
Every combination of the four contact flags appears. The response executes with
zero contacts in 106 cases, one in 1,950, two in 6,908, three in 6,595 and four
in 18,482; another 5,959 cases skip it and preserve scratch. Fixtures retain
these branches alongside prior finite-input overflow, signed-zero, transform
aliasing and terrain coverage. The helper and its original transform/math
callees run directly, with no replacement of the contact solver.

Report: `mcm-chassis-contact-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-chassis-contact-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Subsequent collision response and force assembly, full-loop integration, and
whole-bike acceleration / throttle-release trajectory parity remain unfinished.

### Connected contact-count angular response and crash damping (2026-11-12)

Extended continuous ordinary execution through `0x4a9a52`, just before the
single-body impulse wrapper, with the skipped contact branch still observed at
`0x4a9b29`. Chassis-contact response now selects normal/crashed mass and angular
coefficients, resolves one-contact or two-contact surface levers in the original
branch order, transforms the resulting angular change into body coordinates,
and applies the original speed-bit-dependent damping. The two-contact rear-only
body branch deliberately reads the front terrain surface, matching the binary.
Other contact counts preserve normal-state motion or damp/stop crashed motion;
the stop branch changes state to 2 and clears local angular and linear velocity.

All 40,000 cases match across 473 output words with zero bit differences.
Captured outputs include local angular velocity, its shared field `0x53c`,
local lever `0x660`, response scalars, and every previously connected output.
The contact-count observation hook preserves the overwritten instructions and
resumes original execution; no response or transform helper is replaced.
Report: `mcm-chassis-response-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-chassis-response-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The following single-body impulse call, remaining force assembly, full-loop
integration, and whole-bike acceleration / throttle-release trajectory parity
remain unfinished.

### Connected chassis impulse and low-speed stopping (2026-11-12)

Extended continuous ordinary execution through the shared `0x4a9b29` boundary.
The chassis response now feeds original bike wrapper `0x49d7f0` and single-body
solver `0x45b3c0` with its merged normal, contact velocity, world/local contact
arms and angular scale. Restitution and inverse inertia follow the current crash
state, including a state change in the preceding response. The type-3 branch
updates linear and local angular velocity, preserves stored world angular
velocity, and bypasses audio notification. The caller then recomputes speed
with its original sum/store/square-root order and applies the low-speed stop
using signed float-bit thresholds, preserving squared-speed scratch.

All 40,000 cases match across 478 output words with zero bit differences.
The capture includes resulting speed and squared speed plus explicit world
angular velocity, in addition to all earlier connected state. Both solver and
wrapper execute directly; no solver/audio substitute is installed. Skipped
contact response preserves scratch and initial post-impulse speed.
Report: `mcm-chassis-impulse-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-chassis-impulse-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Remaining force assembly, full-loop integration, and whole-bike acceleration /
throttle-release trajectory parity are still unfinished.

### Connected suspension force assembly and low-speed lean gate (2026-11-12)

Extended continuous ordinary execution through `0x4a9d5c`; crashed bikes with
chassis contact exit at the original alternate branch `0x4ab426`. Before force
assembly, both-wheel low-speed contact can clear local angular X according to
forward/tangent slope, alignment thresholds and the rider-lean bit sign. Each
active suspension passes its displacement, velocity, travel, weight share and
spring/damping coefficients into real `0x4b11e0`. Inactive suspension clears
force while preserving damping scratch. Airborne execution restores the local
arm from the balance center and clears displacement/travel history.

All 40,000 cases match across 490 output words with zero bit differences.
Connected zero-timestep state required the unchecked original square-root table
lookup, including nonfinite bit patterns, and x87 exceptional arithmetic in
spring/damping operations. The checked `mcmSqrt` API retains its existing input
domain; suspension uses the recovered unchecked lookup. This corpus also caught
a warm-up-dependent V8 NaN-sign change in the first braking cross-product array
element; explicit typed stores now preserve that sign. Saved original fixtures
cover the new outputs and retain all preceding connected state.

Report: `mcm-suspension-force-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-suspension-force-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Subsequent force/torque combination, the alternate crash branch, full-loop
integration, and whole-bike acceleration / throttle-release trajectory parity
remain unfinished.

### Connected single-wheel force and torque assembly (2026-11-12)

Extended front-only and rear-only ordinary execution through `0x4aaa55`.
Airborne execution reaches the same boundary after restoring the local contact
arm and clearing torque. Both-wheel execution remains observed at its assembly
entry `0x4aa573`; crashed chassis-contact execution exits at `0x4ab426`.
Single-wheel assembly projects suspension force onto the initialized world-up
vector, scales it by target-roll cosine, and adds the existing contact load and
normal force. It computes body-local torque from the contact arm, applies the
front/rear pitch clips and shared counter, and refreshes the local contact arm.
The rear-only branch additionally applies the original height-dependent torque
scale and drive torque helper `0x4b1ad0` with the connected control/AI state.

All 40,000 cases match across 515 output words with zero bit differences.
Projection partial stores, normal loads, world/local torque scratch, drive
torque, pitch counter and preceding state are captured. Arithmetic retains
zero-times-nonfinite results in world-up projection instead of simplifying the
projection to a Y-only copy. Original projection, transform, cross-product and
drive-torque callees execute directly.

Report: `mcm-single-contact-force-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-single-contact-force-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Both-wheel force assembly, the alternate crash branch, subsequent integration,
complete-loop wiring, and whole-bike acceleration / throttle-release trajectory
parity remain unfinished.

### Connected both-wheel force and torque assembly (2026-11-12)

Extended both-wheel ordinary execution through `0x4aaa55`, sharing the existing
single-wheel/airborne boundary. Crashed chassis-contact execution still exits
at `0x4ab426`. The both-wheel branch projects each suspension force with real
`0x4ad430`, scales it by target-roll cosine and adds the contact load before
storing each component. This retains the different store order from the single-
wheel branches. It adds the normal forces, accumulates both loads, applies rear
then front pitch clips to body-local torque and the shared counter, adds drive
force/torque, and copies the force-reference local arm into the correction arm.

All 40,000 cases match across 527 output words with zero bit differences.
The capture includes both normal-force vectors and projection temporaries,
as well as all preceding connected state. Expanded finite-input cases exposed
mixed-sign canonical NaN propagation in paired force addition and impulse
scaling/velocity updates. Those operations now use recovered x87 arithmetic;
the saved fixtures retain the angular-velocity regression. Arbitrary external
NaN payloads remain outside this corpus. Original projection, torque, transform
and drive-torque callees execute directly.

Report: `mcm-paired-contact-force-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-paired-contact-force-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Contact correction and integration, the alternate crash branch, full-loop
wiring, and whole-bike acceleration / throttle-release trajectory parity remain
unfinished.

### Connected contact correction and angular acceleration (2026-11-12)

Extended ordinary execution through `0x4aaded`, connecting the existing contact
correction helper after both-wheel force assembly. The alternate crashed
chassis-contact branch still exits at `0x4ab426`. The connected stage selects
normal or crashed inverse inertia, produces local angular acceleration, updates
the contact mask, and applies the original front/rear or crash pivot rotation.
It invalidates the body transform and descendants only when the original calls
the rotation routine; even zero-angle calls retain that invalidation behavior.
Unordered comparison branches retain the original x87 conditions.

All 40,000 cases match across 532 captured output words with zero bit
differences, including earlier state, node local/world matrices and cache flags.
Independent controller combinations and targeted small-roll/low-speed inputs
exercise both crash-angle choices. Explicit coverage requirements also ensure
front-only and rear-only pivot rotations execute. The original pivot rotation
callee runs directly. The corpus covers finite synthetic inputs, generated
exceptional arithmetic, graph aliases, skipped state, and float thresholds;
it does not establish arbitrary NaN payload behavior or whole-bike parity.

Report: `mcm-contact-correction-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-contact-correction-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Next: opposing-torque conversion and angular integration from `0x4aaded`.
Subsequent linear integration, the alternate crash branch, full-loop wiring, and
whole-bike acceleration / throttle-release trajectory parity remain unfinished.

### Connected opposing torque and angular integration (2026-11-12)

Extended ordinary execution through `0x4aaf02`. After contact correction,
the original resolves the potentially invalidated world transform and converts
the accumulated opposing torque into body-local coordinates. The recovered
stage applies normal/crashed inverse inertia, the normal-state X/Z scale
factors, stationary/moving damping, and the final angular velocity update.
The original inverse-transform and damping callees execute directly in the
oracle. Its exit adapter removes the five outstanding cdecl arguments before
capturing the common stack frame; the early crashed-contact exit is unchanged.

All 40,000 cases match across 538 output words with zero bit differences.
The capture adds local opposing torque and scaled opposing acceleration and
checks the updated angular acceleration, angular velocity, and resolved world
caches along with all preceding state. Connecting the damping helper exposed
298 initial differences involving generated NaNs. Matching the original
unsigned bit-sign checks, unordered comparisons, and x87 arithmetic reduced
these to four differences in one inverse-transform case; recovered multiply/
add semantics eliminated those too. The saved fixtures retain that case.
All 229 preceding tests also passed after these shared-helper corrections.

Report: `mcm-angular-integration-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-angular-integration-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
This is synthetic connected-state validation, not full trajectory parity.
Linear integration, subsequent orientation/position updates, the alternate
crash branch, complete-loop wiring and repeatable whole-bike acceleration /
throttle-release comparisons remain unfinished.

### Connected linear integration and steering correction (2026-11-13)

Extended continuous execution through `0x4ab49e`. The ordinary branch now
converts assembled force into acceleration and delta velocity, computes the
two-wheel steering fallback and drive/lean correction, updates correction
decay/counter state, and integrates velocity, speed and position. Crashed
chassis contact joins at the real `0x4ab426` boundary and now executes position
integration too. Frozen bikes clear velocity and speed without moving position.
Later orientation and wheel updates remain outside this capture.

All 40,000 cases match across 548 output words with zero bit differences.
Captured state includes linear acceleration, delta velocity, steering angle,
decay, counter and selected rotation, in addition to all earlier fields and
the updated velocity/position/speed. Explicit coverage requires drive steering,
the fallback gate, and frozen/moving execution for ordinary and crashed
chassis-contact paths. Connecting the speed calculation exposed the original
x87 C3 check: both zero and unordered squared speed store zero before sqrt.
Recovered multiply/add semantics retain generated exceptional values.

Report: `mcm-linear-integration-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-linear-integration-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The full-loop entry, remaining orientation/wheel updates and later branches
still need connecting. Whole-bike acceleration/throttle-release trajectory
parity remains unproven; this synthetic connected-state comparison does not
establish 100% physics parity.

### Connected wheel and body transforms (2026-11-13)

Extended continuous original execution through `0x4ab7fd`. Wheel increments
now follow airborne coast/brake/engine behavior and front/rear contact motion.
Finite increments rotate their wheel nodes; nonfinite increments remain stored
without rotating. The body then receives integrated position and the normalized
angular-velocity pivot rotation. Node mutations occur in original call order,
preserving wheel/body aliases and parent/child cache invalidation. The original
wheel, translation and pivot-rotation callees execute directly in the oracle.

All 40,000 cases match across 553 output words with zero bit differences.
Coverage requires applied/skipped body rotation, large angles, wheel/body and
wheel/wheel aliases, and nonfinite wheel increments generated from finite
scales. Saved fixtures explicitly retain cases 12943, 16940 and 23908, which
exposed large-angle trig reduction and mixed-NaN pivot arithmetic.

Connecting rotation also required the original zero/unordered squared-length
guards and unchecked inverse-square-root lookup for overflowed finite inputs.
Two very large angles (approximately 3.32e12 and 4.44e13 radians) exposed x87
argument reduction differences from host libm. A direct Wine x87 probe confirmed
the phase difference; the recovered reducer subtracts quadrants using the
66-bit pi/2 constant `0x3243f6a8885a308d3 * 2^-65` with exact integer arithmetic.
Small remainders use host sine/cosine, and the existing >=2^63 operand-preserving
behavior remains. This is validated against the captured original outputs,
not a claim of exhaustive x87 transcendental emulation.

Report: `mcm-motion-transform-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-motion-transform-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Next are the state-dependent crash controls and remaining main-loop updates
from `0x4ab7fd`. Complete-loop wiring and whole-bike acceleration/throttle-release
trajectory parity remain unfinished.

### Connected controller handoff and crash orientation (2026-11-13)

Extended continuous execution from `0x4ab7fd` through the controller handoff
and nonzero-state orientation branch. Normal state exits at `0x4abb30`;
crashed state exits at `0x4ac6cd`, before the separately recovered collision
tail. Controller flags gate velocity/angular transfer. Transition kind 2 can
copy another bike's velocity (including self-reference and absent-pointer
fallback); kinds 4/7 add the bounded upward boost and copy angular velocity;
the remaining kinds scale angular velocity by 0.75.

After handoff, the original chassis-probe gate controls crash orientation.
Both-wheel execution normalizes the combined contact normals, resolves the
updated body world transform, converts the axis into local coordinates, and
rotates the local matrix around the force-reference pivot. Front-only
execution uses the negative component-rate angle about the initialized up axis.
Transform invalidation follows the real node graph and call order.

All 40,000 cases match across 568 output words with zero bit differences.
New captures include controller linear/angular velocity, the local orientation
axis, summed normals and projected normals. Coverage requires each active
transition family, all kind-2 pointer choices, skipped handoff and both/front
orientation. Fifteen initial NaN-sign differences exposed mixed-sign canonical
NaN selection in the controller boost and matrix products. Recovered x87
addition/multiplication replaces blanket negative-NaN canonicalization in matrix
multiplication; existing tests still pass. Explicit regression fixtures retain
cases 1360, 4533 and 7696.

Report: `mcm-controller-handoff-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-controller-handoff-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Normal-state controls from `0x4abb30`, collision/tail connection, complete-loop
entry and whole-bike acceleration/throttle-release trajectory validation remain.
This synthetic connected-state evidence does not establish full physics parity.

### Connected normal-state airborne controls (2026-11-13)

Extended the normal branch from `0x4abb30` through `0x4abef9`, preserving
its early exits at `0x4ac64a` and `0x4ac1f7`. Crashed execution still exits
at `0x4ac6cd`. The connected stage now applies airborne pitch/yaw input,
lean-disable behavior, conditional brake/engine pitch adjustments, velocity
normalization/redirection/rescaling, and angular damping. It reads the selected
forward component's cached world basis directly, matching the original's lack
of a world-cache refresh at this point.

All 40,000 cases match across 572 output words with zero bit differences.
An observation hook at `0x4abd6e` records actual entry into velocity
redirection, then reproduces the displaced instructions and resumes original
execution. The corpus includes 46 such executions. Independent special-control
and frozen flags prevent accidental correlation from excluding moving-bike
redirection. Captures add the control vector and redirection flag while checking
updated scratch vectors, velocity, speed and angular velocity.

Initial differences exposed zero-speed normalization and generated exceptional
arithmetic. Recovered x87 multiply/divide/add semantics and the original
zero/unordered speed check now apply. Typed angular stores preserve NaN signs
across JS array transitions. Cases 5 and 28 are explicitly retained alongside
earlier regressions. The new fixture is losslessly gzip-compressed; the test
loader supports both existing JSON and compressed JSON fixtures.

Report: `mcm-normal-control-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-normal-control-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Next are normal-state timers/orientation and alignment, then collision/tail and
entry connections. Whole-bike acceleration/throttle-release trajectory parity
remains unproven.

### Connected normal-state timer and control rotation

The continuous original branch now reaches `0x4ac17b`, following normal
controls with timer accumulation, phase/sign transitions, angular-Z updates,
control-vector normalization and pivot rotation about the local balance center.
Earlier suspension/state gates preserve the original skipped scratch angle.
Body mutation and descendant cache invalidation follow the existing node graph.

The pinned Wine 11 original matches all 573 captured words in 40,000 cases
(zero differences). Coverage includes phases 0 through 3, zero/nonzero angles,
all prior contact branches, and aliased transform nodes. The standalone helper
also preserves the original unordered sign comparison and cap selection, and
uses the unchecked inverse-square-root lookup behind the original guards.
The regression corpus is stored as compressed JSON.

Report: `mcm-normal-rotation-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-normal-rotation-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The next connection is the bike-event transition call (`0x4a4b60`) at
`0x4ac17b`, then normal-state alignment and collision/tail/entry integration. Complete-bike
acceleration and throttle-release trajectory parity remains unproven.

### Connected grounded alignment

The alternate normal-state branch now reaches `0x4ac5c5`, retaining the
connected airborne branch through `0x4ac17b`. Grounded alignment resolves
world matrices at each original call, rotates the local body about the front
load pivot, damps angular velocity, and applies steering minimum/maximum and
rate limits. It preserves original contact masks, scratch vectors, cache
invalidation and node aliasing.

All 577 captured words match the pinned original in 40,000 executions.
Connecting this branch exposed exceptional-value propagation in world-matrix
composition and axis-angle construction. These now use the recovered x87
arithmetic semantics rather than replacing every NaN with negative indefinite
or relying on host arithmetic for mixed NaN signs. Cases 1099 and 3367 are
explicitly retained in the compressed regression corpus. Coverage includes
active masks 0 through 3, paired/single/no-contact paths and valid/invalid
world-cache exits.

Report: `mcm-normal-alignment-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-normal-alignment-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Next are the bike-event transition calls and subsequent branch joins, then
collision/tail and entry integration. Full acceleration/throttle-release
trajectory parity is still unproven.

### Connected normal-branch event decision

All three normal-state routes now execute their original call to `0x4a4b60`
and its real decision callee `0x4a4d70`, stopping at `0x4a4baa` before event
setup. Already-crashed states retain the existing `0x4ac6cd` exit. Decisions
consume the preceding simulation's current position, velocity, angular rates,
contacts, suspension/cooldown flags, steering state and speed. Only external
input and CRT random queries are supplied by the harness.

The pinned original matches all 584 captured words in 40,000 executions,
including 4,752 triggered events. Coverage explicitly requires triggered
reasons 1, 2, 4, 5, 6, 7, 8, 9 and 12, plus input/random callbacks and skipped
crashed states. Reason 10 is unreachable from these call sites because their
argument 9 is zero; its standalone coverage remains separate. Rider input and
high-counter seeds are independent of lean-disabled and forced-crash seeds.

Report: `mcm-normal-event-decision-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-normal-event-decision-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
This boundary captures the decision return value before the caller stores
`bike+0x844`; it does not claim event setup or rider initialization is connected.
Those mutations, the caller's remaining branches, collision/tail and entry
integration remain ahead of complete acceleration/throttle-release trajectories.

### Connected event setup and rider initialization

The normal-state calls now return from the original `0x4a4b60` wrapper at
`0x4ac1b2`, `0x4ac5fc`, or `0x4ac681`. The connected model commits the event
state, updates its envelope, optionally resets body orientation and bounds,
clears animation/lean flags, applies the event angular minimum, and initializes
the rider controller with original random-selection ordering and resource IDs.
The orientation source is the same node used by earlier normal controls.
Parented target bodies and aliased source/target nodes are covered.

All 611 captured words match in 40,000 pinned-original executions. Regression
coverage includes event/no-event paths, orientation reset with root and parented
targets, source aliases, alternate resources, empty/nonempty first rider groups,
and launch-plus-rider random calls. The existing event orientation helper now
supports parented targets and recovered exceptional cross-product arithmetic.
Signed-zero headings are retained explicitly in fixture inputs. Event decision
and setup captures encode fields before concatenation, avoiding host-array NaN
sign canonicalization.

Report: `mcm-normal-event-setup-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-normal-event-setup-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
This corpus uses an empty bounds-child callback list; callbacks remain covered
standalone and must still be connected to this prefix. Caller joins and trick
handling, collision/tail integration, entry wiring and whole-bike acceleration/
throttle-release trajectories remain incomplete.

### Connected event child-transform callbacks

Event orientation reset now dispatches the bounds-child records in original
list order, using the real player vtable callback in the reference. Two attached
components participate in the same transform graph as the preceding physics,
including earlier invalidation and nested component parents. The recovered
callback applies each record's local or relative orientation and position,
retaining record-vector mutations and untouched/skipped state.

All 704 captured words match in 40,000 pinned-original executions. Coverage
includes zero through three callbacks, repeated component selection, alternating
local/relative records, flat/nested components, and event/no-event paths.
Case 25608 exposed a NaN-sign difference in pointer-argument matrix composition;
that matrix product now uses recovered x87 multiply/add semantics and the case
is explicitly retained in the compressed regression corpus.

Report: `mcm-normal-event-children-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-normal-event-children-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Next are the caller's post-event joins and trick handling, then collision/tail
and entry integration. Full whole-bike acceleration/throttle-release trajectory
parity remains unproven.

### Connected post-event joins and rider-call arguments

The normal callers now execute their post-event branches through the common
`0x4ac6cd` join or the entry of `0x4aecb0`, before its prologue. Triggered events
set the shared chassis control flag (`stack+0x20`) to 1 and clear `bike+0x8c8`.
Untriggered normal states call rider update only when that existing flag is 1.
The height argument follows the airborne/limited/grounded route and rear-wheel
contact; control comes from the already-updated rider balance filter, not a
separate input. The third argument is the original timestep.

All 710 captured words match in 40,000 original executions, including 7,235
rider calls. The harness observes entry arguments and exits before executing the
rider body; it does not substitute a fake rider result. Already-crashed states
and skipped calls preserve their scratch values. Initial failed comparisons
identified the shared contact flag and filtered-balance argument and eliminated
incorrect independent harness inputs for those values.

Report: `mcm-normal-event-join-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-normal-event-join-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The rider-update body (including input, pose/blend and transitions), common
collision/tail, entry wiring and whole-bike trajectory comparisons remain to
be connected. Full acceleration/throttle-release parity remains unproven.

### Connected complete rider-update body

The continuous prefix now executes the original `0x4aecb0` body and returns to
`0x4ac6cd`. Rider controls use the validated call arguments and current physics
state. The reference runs real bike-input aggregation, orientation reset, child
callbacks, nearby interaction, directional trick startup, animation selectors
and pose/blend. Only device responses, animation records and world-list data
are supplied. A valid player input controller is shared with the earlier event
decision; the device boundary now handles its button-8 query as well.

The recovered event/trick graph adapter accepts the existing live graph, so
rider transitions update the same body, source, attached components and caches
used by the physics prefix. Existing standalone callers retain their cloned
graph behavior. The adapter preserves a previous nearby reference unless a
nearby query actually occurs.

All 743 captured words match in 40,256 pinned-original executions: the 40,000
broad cases plus 256 independent input/animation variations of case 14630,
which naturally reaches the airborne rider-input path. The initial broad run
had only one input-query case; targeted cases exercise both flag-16 button
branches, six directional trick selections, accepted/rejected/missing nearby
candidates, animation seeking and normal pose/blend paths without bypassing
the preceding physics. Cases use synthetic records and a shared bike/rider
component graph; live assets and independent rider graphs remain separate.

Report: `mcm-normal-rider-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-normal-rider-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Next is the common post-event state and collision/tail connection, followed by
entry wiring and full acceleration/throttle-release trajectory comparisons.
Full whole-bike parity remains unproven.

### Connected common post-event state

The continuous prefix now reaches `0x4ac7c4` after the common post-event block.
It extracts the body position, applies the low-speed paired-contact yaw stop,
resolves the world transform and converts local angular velocity, handles the
delayed award/timer, and stores wheel-height history and the last timestep.
The award reference executes the real `0x4b1a40`; optional UI observers are absent.

All 748 captured words match in 40,256 original executions. An observation hook
records actual award-callee entry, requiring both paid and suppressed awards in
the corpus. Other coverage includes ticking timers, zero yaw, parented/root
bodies and the preceding event/rider paths. Initial differences were NaN signs
in world-angular conversion; the helper now uses recovered x87 arithmetic and
typed stores. Cases 388, 4300, 8901, 9506, 12610 and 14065 are retained explicitly.

Report: `mcm-post-state-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-post-state-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The new regression corpus uses lossless Brotli compression to keep it below
GitHub's 50 MB recommended file size; the fixture loader also retains support
for existing JSON and gzip fixtures.
Next is collision processing and the scheduler/orientation tail, then entry
wiring and full acceleration/throttle-release trajectory comparisons. Full
whole-bike parity remains unproven.

### Connected collision synchronization

The original-execution prefix now reaches `0x4ac81b` after collision proxy/grid
synchronization, or `0x4ac89e` on the no-collision-object branch. Collision dispatch
is the next connection. The corpus checks 876 words across 40,256 executions,
including live grid links, type 0/1 centers, root/parented proxies, grid opt-out,
and the preceding rider/event paths.

The collision proxy shares the rider animation object. The reference preserves
its animation state and components while attaching a distinct proxy transform
before the physics prefix. Recovered rider animation callbacks now accept that
separate target; existing shared-target callers retain their behavior. The first
extended run exposed NaN-sign differences in proxy translation and world-center
conversion. Recovered x87 operations now preserve those signs; the final corpus
matches every captured word. Explicit regressions include cases 388, 2328, 5238,
5529 and 6984.

Report: `mcm-collision-sync-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-collision-sync-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Collision callbacks, scheduler/entry wiring and whole-bike acceleration/release
trajectories remain to be connected and validated. This is not full parity.

### Connected static collision dispatch

The continuous prefix reaches `0x4ac89e`, executing the original grid dispatcher,
static-wall primary callback, impulse response and collision-triggered event
setup. All 917 captured words match across 40,320 original executions. An
observation hook counts real primary-callback entries; another captures the
pre-dispatch bike state. Required coverage includes a new collision-triggered
crash with the remaining-substep reset, callbacks without a new crash, existing
crash states, absent objects and skip/object/manager dispatch gates.

The recovered normal and collision paths now share event-decision and setup
helpers while retaining the live transform graph and cumulative external-input
counts. The connected corpus exposed an overly strict inverse-square-root input
check in line collision and an unordered projection clamp: the original uses
its unchecked lookup and clamps an unordered projection to zero. Cases 23474
and 28987 are explicit regressions; 64 variants of the observed crash case vary
line direction, radius, dispatch gates and the pair cache.

Report: `mcm-collision-dispatch-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-collision-dispatch-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
This connected corpus covers static-wall callbacks. Dynamic bike/rider collision
callbacks, the scheduler/orientation tail, entry wiring and complete
acceleration/throttle-release trajectories still need connected validation.
Full physics parity remains unproven.

### Connected scheduler and orientation finish

The continuous ordinary prefix now reaches `0x4ac94b`, immediately before the
loop-back branch. It includes the remaining-substep decrement, carry threshold,
remainder timestep/inverse-timestep replacement, and final forward/up, angle
and trigonometric-cache refresh. All 931 captured words match across 40,326
original executions. Explicit carry cases exercise zero, negative carry, the
exact threshold `0x38d1b717`, and its adjacent float32 values.

The larger connected state exposed 3,595 orientation differences in the initial
run. Original x87 C3 guards treat unordered normalization results like zero and
inspect the raw square root before storing float32. Matching those guards and
arithmetic order left nine yaw NaN differences; original CRT acos preserves an
incoming quiet NaN, which the recovered helper now does explicitly. Regressions
include cases 3, 388, 8439, 9506, 14065, 16975, 21146, 21922, 25608 and 38509.

Report: `mcm-finished-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-finished-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Dynamic bike/rider collision callbacks, entry/loop-back wiring and complete
acceleration/throttle-release trajectories still need connected validation.
Reaching this synthetic substep boundary does not establish whole-bike parity.

### Connected ordinary suspension/contact entry

The original-execution comparison now starts at `0x4a5e27` and continues through
`0x4ac94b` on the ordinary, no-reset-request path. The added entry resets front
translation and the rear rest matrix, clears both suspension travel-limit flags,
preserves contact scratch vectors and refreshes the balance-reference world position.
(The original no-op vector constructor was initially misread as clearing; the
pre-branch observation below corrects that interpretation.)
All 931 captured words match across 40,326 original executions, including aliased
front/rear/body/balance nodes and parented transforms.

The initial field mapping cleared active flags instead of travel-limit flags;
comparison corrected that distinction. Entry preparation also changes which
synthetic state reaches airborne rider inputs. Case 5629 now supplies those
variants naturally, with independent horizontal/vertical inputs and matching
raw-bit metadata. Required trick and nearby-interaction coverage remains present.

Report: `mcm-prepared-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-prepared-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Engine entry `0x4a5bd7..0x4a5e27`, reset requests, dynamic bike/rider collisions,
loop-back wiring and complete acceleration/throttle-release trajectories remain
to be connected and validated. Full physics parity remains unproven.

### Connected engine/input entry

The continuous original comparison now runs `0x4a5bd7..0x4ac94b`: engine/input
entry, ordinary suspension/contact preparation, physics, static collisions and
substep finish. All 964 captured words match across 40,326 original executions.
An entry observation captures throttle/brake, gear, shift timer, mass selection,
vertical acceleration filtering and ordered device calls before their shared
state flows into the rest of the physics. Coverage requires up/down shifts,
ordered brake/throttle polling, analog/digital control and low-speed stopping.

Recovered engine entry initializes the same torque/contact scratch state and
shares brake, velocity, mass, engine level, RPM demand and gear ratio with the
physics path. The checked public throttle helper retains its input validation;
the recovered entry uses an unchecked path matching finite out-of-range original
engine levels. The expanded corpus exposed a bike/rider mass mapping error,
original CRT asin domain-error behavior (case 8092), and a NaN sign lost by an
acceleration array literal (case 8901). Typed stores and recovered arithmetic
preserve the original results. Signed-zero brakes use the shared restored bike
field when replaying serialized fixtures.

Report: `mcm-engine-entry-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-engine-entry-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Reset requests, dynamic bike/rider collisions, frame-entry/loop-back wiring and
complete acceleration/throttle-release trajectories remain to be connected and
validated. This synthetic single-substep comparison does not prove full parity.


### Common preparation scratch preservation

An added observation at `0x4a5ea5`, immediately before reset/ordinary branch
selection, captures four scratch vectors. The original `0x40ded0` constructor
only returns its input pointer; it does not clear their contents. The recovered
preparation previously cleared them, a difference hidden by later ordinary
contact writes. The new observation detected 483,912 mismatching words across
40,326 executions before the correction (all twelve added words in every case).

Common preparation now preserves these vectors and is exposed separately for
reset-path integration. The engine-entry corpus includes the twelve intermediate
words as well as the existing 964 entry/final observations. All 976 words match
across 40,326 original executions after the correction. This strengthens
single-substep evidence; reset/force integration, dynamic collisions, repeated
substeps and whole-bike acceleration/release parity remain incomplete.

### Common preparation connected to reset selection and pose

The reset comparison now enters at `0x4a5e27`, sharing the original front
translation reset, rear rest-matrix restoration and balance-reference refresh
before selecting the nonzero-reset branch. It continues through `0x4a64dc`,
including all reset pose selection helpers, bike/engine reset, terrain support,
bounds-child callbacks, collision proxy/grid synchronization and cooldown flags.
All 1,566 captured words match in 16,384 original executions.

Required coverage includes every reset mode (0–4 and fallback), shared and
distinct suspension nodes, body/reference aliasing and parented/unparented rear
nodes. The initial rear rest matrix lives in its real component storage; it is
not rebuilt after preparation invalidates or mutates the live transform graph.
The original constructor calls preserve scratch storage at this boundary.

Report: `mcm-prepared-reset-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-prepared-reset-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
This connects common preparation to reset, but the reset-produced state still
needs to flow into the complete downstream force/collision/finish path. Engine
entry preceding reset, dynamic collisions, frame loops and full acceleration /
throttle-release trajectories remain unproven.

### Reset output connected to common contact and force preparation

The reset comparison now continues from `0x4a5e27` through `0x4a6eac`.
Reset-produced wheel positions, contact depths, tangent/normal vectors, body
orientation and cleared bike state flow into force initialization, target roll,
mount/contact geometry, chassis probes and contact response. It does not rerun
the ordinary wheel-query branch. Both chassis control flags and mutable bike
fields are carried back into the reset context for subsequent integration.

All 1,608 captured words match in 16,384 original executions. Coverage requires
both reset contact combinations, skipped/executed chassis probes, front probe
outcomes 0/1/2, body contact 0/1 and shared/distinct front mount/body nodes. The
new observation captures forces, alignment, lever arms, chassis world/surface /
normal vectors, depths and remaining-substep state, alongside the complete
reset memory and graph observations.

Report: `mcm-reset-contact-response-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-contact-response-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Reset output has reached common contact response; its continuation through
balance/suspension, tire/chassis forces, integration and substep completion is
still outstanding. Engine entry preceding reset, dynamic collisions, repeated
frames and complete acceleration/throttle-release parity remain unproven.

### Reset output connected through balance and both suspension branches

The connected reset comparison now reaches the rear drive-force boundary
`0x4a7c46` or front-only join `0x4a8602`, with the no-contact exit also observed
at `0x4a8b6e`. It continues from common preparation at `0x4a5e27` through reset,
contact response, rider balance filtering, wheel weights, balance-center offset,
front suspension, front load/velocity/tire response and rear suspension.
All 1,680 captured words match in 16,384 original executions.

Coverage requires neutral/nonzero rider lean, filter durations below/equal/above
the timestep, equal/non-equal weight distribution, both reset wheel-contact
outcomes and chassis-limited/unlimited suspension outcomes. Reset itself leaves
one wheel at zero penetration and the other at -0.01, so these executions validate
the naturally reached suspension reset/skip branches, not arbitrary active
compression. Active compression remains covered by the separate ordinary-path
corpus; consecutive steps after reset still require integration and validation.

Mutable balance-center, local lever, suspension history, contact depths and
control fields are written back to the reset context. The comparison observes
skipped scratch fields as well as newly calculated loads and motion fields.

Report: `mcm-reset-suspension-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-suspension-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Rear drive/loading, force accumulation, motion integration and substep completion
still need to be connected to this reset path. Engine entry preceding reset,
dynamic collisions, repeated frames and complete acceleration/throttle-release
parity remain unproven.

### Reset state connected through tire forces and chassis impulse

The continuous reset comparison now runs `0x4a5e27..0x4a9b29`. It extends the
balance/suspension path through rear drive/loading, velocity and traction,
combined tire-force accumulation, braking gates, chassis contact merging,
penetration correction, angular response and the real type-3 impulse solver.
All 1,763 captured words match in 16,384 original executions.

Required coverage includes rear traction enabled/skipped by its speed threshold,
positive/negative traction factors, front-only/rear-contact drive routing, skipped
chassis handling, two/three merged contacts and changed/unchanged angular state.
The reset-produced engine release flag yields zero drive thrust; reset also
clears braking. This validates their actual immediate post-reset behavior, not
accelerating or actively braking trajectories. The corpus supplies a present
engine for the downstream original drive call, while earlier reset-only tests
continue to cover engine absence.

Position, balance center, local/angular velocity, contact lever, rear speed and
suspension history remain connected through their original shared fields. The
new observation captures skipped scratch alongside rear traction and chassis
solver outputs; only external random input, initial scratch and observation
boundaries are supplied to the original.

Report: `mcm-reset-chassis-impulse-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-chassis-impulse-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Reset-path suspension/contact force contributions, angular/linear integration,
transform updates and substep completion remain to be connected. Engine entry
preceding reset, dynamic collisions, repeated frames and complete acceleration /
throttle-release parity remain unproven.

### Reset forces connected through integrated motion and transforms

The continuous reset comparison now runs `0x4a5e27..0x4ab7fd`. Following chassis
impulse handling, it executes suspension-force preparation, single/paired-contact
force assembly, contact pivot correction, opposing angular acceleration, angular
integration, force-to-linear acceleration and position integration, then ordered
wheel rotations and body translation/pivot rotation on the live transform graph.
All 1,829 captured words match in 16,384 original executions.

Required coverage includes both reset contact masks, pitch-counter changes,
nonzero linear motion, zero/nonzero body rotation, large rotation angles, shared
wheel/body nodes and shared/distinct wheel nodes. Reset still reaches one-wheel
contact here, so the paired-contact helper retains its original skip behavior;
paired force execution is covered separately by the ordinary-path corpus.
Counter words at bike+8bc/+6e0 are encoded as integers, independently of the
surrounding float state. No state is re-seeded between reset, forces and motion.

Report: `mcm-reset-motion-transform-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-motion-transform-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The remaining reset-path connection is post-motion control/events, rider/common
updates, collision dispatch and scheduler completion. Engine entry preceding
reset, dynamic collisions, frame-loop persistence and complete acceleration /
throttle-release trajectories remain unproven. This is synthetic single-substep
evidence, not full gameplay parity.
