# Motocross Madness physics parity roadmap

Written November 12, 2026, against the current Dust Valley implementation.

## Objective and honest starting point

Reproduce the supplied Motocross Madness build's simulation: the same initial state, terrain, settings, input sequence and elapsed-time sequence should produce matching motion and gameplay events.

**We currently have an adaptation, not a recovered physics engine.** We recovered several constants and parts of a few routines, then implemented them inside our existing Cannon-based simulation. The 74 passing tests establish that our game behaves acceptably under those tests. They do not establish agreement with Motocross Madness. We have no original-game telemetry yet, and no defensible percentage-complete estimate.

Our target executable is SHA-256 `e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b`. Both local copies have that hash. Select one complete installation as the reference and record its data files and settings too: matching executable hashes alone do not establish matching runtime conditions.

Supporting material:

- [Recovered binary evidence and implementation notes](motocross-madness-reverse-engineering.md)
- [Machine-readable initializer evidence](mcm-binary-evidence.json)
- [Current adaptation measurements](mcm-handling-measurements.json)
- Inspection tool: `scripts/inspect-mcm.py`
- Current benchmark: `scripts/handling-benchmark.mjs`

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
