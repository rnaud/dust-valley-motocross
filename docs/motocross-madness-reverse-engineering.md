# Motocross Madness: recovered physics and replication plan

Analysis date: 2026-11-12. Target: the user's two local Windows copies.

For the full remaining recovery work, dependencies and acceptance criteria, see the [physics parity roadmap](mcm-physics-parity-roadmap.md).

## Implementation status

The recovered handling changes now run by default in Dust Valley. `src/mcm-handling.js` owns SI spring constants, front/rear damping thresholds, 183.7 kg mass and the 40° requested bank with bounded transitions. `BikeVehicle.updateSuspension` replaces Cannon's linear suspension force calculation. The landing-only damping boost is removed; continuous damping and a constant 30 kN per-wheel safeguard handle impacts. Chassis inertia scales with the mass change while preserving our existing proportions.

`src/drivetrain.js` interpolates the decoded curve in torque, drives the rear tire, interrupts power for 50 ms on shifts, and shares engine RPM/load with audio and the HUD (now scaled to the 10,000 RPM redline). Recovery clears gearbox, pending shifts, wheel slip and cached contacts.

Explicit adaptations: overall reductions `[38,25,18,14,11]`, launch clutch at 5750 RPM, 4200 RPM downshift threshold, 250 ms anti-hunting delay, efficiency 0.92, rear engine braking up to 100 N, and 1.35× boost. The 7350 RPM upshift threshold follows the recovered curve-1 band, but the full original shift predicate is not reconstructed. The recovered 0.9505 traction tuning factor scales drive demand; the ambiguous speed-floor logic is not guessed. Lean rates limit our requested bank while existing torques control actual orientation. Collision geometry, tire forces, airborne control and crash gating remain our existing model pending stronger evidence.

Validation: 74 Node tests pass, including new torque/shift/damping/rate-limit tests, 20-second sustained turns in both directions, reversals, 3–15 m drop landings and the starter jump line. Two legacy expectations were updated deliberately: a smaller bank turns wider, and a powerband changes post-jump acceleration. Flat test worlds now omit decorative-world boulder colliders; previously a full turn could hit an unrelated rock. The production build passes, with the existing bundle-size warning. Browser smoke tests could not run: the local Vite listener was denied with EPERM and headless Chrome exited during launch.

Reproduce measurements with `node scripts/handling-benchmark.mjs`; results are in `docs/mcm-handling-measurements.json`. 0–30/60/90 km/h: 0.967/2.192/4.475 s; boosted: 0.733/1.625/3.158 s. Braking from 60 km/h to under 0.2 m/s takes 1.533 s and 12.656 m. One-second full-input heading changes are 24.62° at an initial 54 km/h and 19.85° at 79.2 km/h. These measure our adaptation, not parity with original-game telemetry.

## What was actually recovered

This is **partial manual decompilation from x86 disassembly**, not recovered original C++ source and not a completed port. The executable has stripped symbols. Function and field names below are analyst-assigned. I inspected the PE, decoded constants, followed string references into constructors, and traced selected fields into simulation routines. No original game execution or instrumented telemetry was available. Ghidra was not installed; a download attempt failed because the shell could not resolve GitHub. The installed Apple LLVM `objdump` could disassemble the PE successfully.

Both `Downloads/mcm/mcm.exe` and `Downloads/Motocross_Madness/mcm.exe` are **byte-identical**, 1,036,800 bytes, SHA-256:

`e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b`

Their `sbike/bike2.bik` files are also identical. The `mcm` directory includes additional graphics/network wrappers; these do not constitute a different main game binary. PE image base is `0x400000`, x86/PE32, linker 4.20; the header timestamp says July 20, 1998 (not proof of release provenance).

**Important:** the companion configuration is useful documentation, but many parameters are compiled as immediate constants. The inspected constructors do not read the textual keys. `GeneralBikeInfo`, `BikeWeight`, and `bike2` do not occur as ASCII strings in the executable. This supports, but does not globally prove, that the file is a development leftover. Do not assume changing it changes this build.

The executable actually differs from the file in power-curve samples and shift initialization. Where they disagree, prefer executable evidence.

## Reproduce the inspection

From the repository root:

```sh
python3 scripts/inspect-mcm.py ~/Downloads/mcm ~/Downloads/Motocross_Madness \
  --output docs/mcm-binary-evidence.json \
  --disassembly /tmp/mcm-disassembly.txt
```

The script reads originals without modifying or executing them. It locks analysis to the exact SHA-256, verifies instruction encodings and object offsets for 20 initializers, decodes the first power curve directly from instruction immediates, and checks it against the companion file. It needs only Python's standard library; optional assembly output also requires LLVM-compatible `objdump`. It deliberately does not copy game binaries or assets into the repository. JSON output records initializer evidence, not an assertion that all downstream semantics are solved.

## Confirmed parameters and differences before implementation

| System | Original executable evidence | Dust Valley today | Consequence |
|---|---|---|---|
| Timestep | Nominal 0.02 s; max 10 iterations (`0x4a2104`, `0x4a2114`) | 1/120 s | Keep our stable step; convert original rate-based behavior to seconds. Original also has a short-frame fallback, described below. |
| Bike + rider | 240 + 165 = 405 lb ≈ 183.7 kg (`0x4a2163–0x4a2177`) | 150 kg | Our acceleration, spring support and inertia cannot match by copying force constants alone. |
| Mass used internally | 12.57764 slugs (`0x4a21d2`), consistent with 405/32.2 | SI units | Original uses feet, pounds-force and slugs. Convert dimensions consistently. |
| Lean target limit | 0.698132 rad = 40° (`0x4a2344`; consumed `0x4ac3d3`) | 1 rad ≈ 57.3°, with slope compensation | Original uses a smaller target bank. This is not a hard limit on all physical orientations. |
| Lean correction rate | 2.094395 rad/s = 120°/s (`0x4a234e`, `0x4ac49e`) | Torque controller, no equivalent explicit angular-step limit | Reversal timing is controlled differently. One original branch reduces rate to 96°/s. |
| Transmission | Five valid entries and sixth sentinel −1 (`0x49f020–0x49f056`) | Six cosmetic speed bands | Engine/gear state should influence propulsion, not just HUD and sound. |
| Shift duration | 0.05 s (`0x49eff8`) | No force interruption on gear change | Add a brief shift transient once drivetrain behavior is reconstructed. |
| Power model | RPM/HP tables; torque = HP × 5252 / RPM (`0x49f48b–0x49f49d`) | `throttle * 1700 / (1 + speed/40)` | The original has a powerband; ours is strongest at launch and falls smoothly. |
| Suspension | Different front/rear progressive springs and digressive damping | Identical linear Cannon springs; landing damping boost | This is a substantial difference in jump takeoff and recovery behavior. |
| Traction tuning | `0.85 + 0.15 * setting` (`0x4a2144–0x4a2153`); special branch uses 1 | Pacejka-style lateral force and combined grip cap | Original's slider value 0.67 means about 0.9505, not coefficient 0.67. Full tire equivalence remains unresolved. |
| Wreck parameters | Lean 70°, pitch cosine of 85°, acceleration +200/−800 ft/s² | Custom contact/upright crash tests | These are initialized thresholds, not sufficient to reconstruct the whole crash decision. |

Current implementation locations: `src/world.js` (mass, suspension, drive force, bank assistance, air control), `src/controller.js` (balance-steer law), `src/tires.js` (tire forces), `src/bike-vehicle.js` (suspension ray casting), `src/main.js` (fixed step).

## Manually recovered routines

### 1. Progressive suspension with high-speed damping relief

Both front and rear contact paths call `0x4b11e0` (`0x4a9c19` and the following rear-wheel branch). The caller supplies spring coefficients, damping multiplier, velocity threshold, load share, vectors and an extra scalar term. The routine returns a combined force vector and a separate damping vector.

Readable algebra from `0x4b11e0–0x4b1315`:

```text
speed = length(velocityVector)
kEffective = kLinear + kCubic * displacementScalar²
c = 2 * dampingMultiplier * sqrt(bodyMass * kEffective * massShare)
if speed > velocityLimit:
    c *= (velocityLimit + 0.5 * (speed - velocityLimit)) / speed
dampingVector = -c * velocityVector
forceVector = (kEffective + extraScalar) * displacementVector + dampingVector
```

The binary uses a custom magnitude helper at `0x4016c0`, not necessarily bit-identical to a modern `sqrt`. Signs and geometry are supplied by the caller. The companion file describes the restoring spring as `−k*x − k2*x³`; the helper's multiplication confirms the progressive coefficient structure. Do not replace displacementVector with a unit direction without also carrying its displacement magnitude.

Defaults: front k=1000 lbf/ft, k2=100 lbf/ft³; rear k=600, k2=60. Player tuning computes front k=`900+200*u`, rear k=`500+200*u`, then k2=`0.1*k` in original units. Damping multipliers are `1.4+0.2*u`. Front velocity limit is 20.6 ft/s (6.279 m/s), rear is 1.6 ft/s (0.488 m/s). The large front/rear difference is present in machine code, not a transcription error.

SI conversion: kLinear multiplies by 4.448221615/0.3048; kCubic by 4.448221615/0.3048³. Default front is approximately 14,594 N/m and 15,708 N/m³; rear is 60% of those values. Cannon's suspension stiffness is subsequently multiplied by chassis mass, so these numbers are **not** direct replacements for its `suspensionStiffness` property. The body mass in the original helper is total weight/32.2; the supplied default share is 0.5.

Above the velocity limit, damping force keeps increasing, but with half the slope. This is different from imposing a force cap or halving all damping. It suggests why merely raising our landing damping from 3.5 to 12 can feel unlike the original. That perceptual explanation is a hypothesis until compared in motion.

### 2. Power curves and shifts

Constructor `0x49ef90` initializes the drivetrain. First curve (RPM → HP), decoded and verified by the script:

```text
0→0, 3000→10, 3250→11.5, 3750→15, 4750→20.5,
5250→24, 5750→26, 6750→39, 7250→43, 8250→40.5,
8750→37, 9250→28.5, 10250→25
```

The constructor converts every nonzero RPM sample to torque using 5252 and constructs adjacent-sample interpolation slopes for both HP and torque (`0x49f4c0–0x49f4f0`). Interpolating sample torque is not identical to interpolating HP and then dividing by RPM.

It tracks the sample of maximum torque. Shift-band initialization at `0x49f591–0x49f5e2` uses that sample's RPM ±100, **not the configuration's repeated 8000 RPM entries**. For curve 1 this initializes 7150–7350 RPM. This establishes constructor behavior; full runtime shift conditions and clutch behavior still need tracing. Minimum speed fields initialize to 22, 41, 60, 76, 95 ft/s (24.1, 45.0, 65.8, 83.4, 104.2 km/h); these are not proof of observed shift speeds.

Outdoor entries are 1.95, 1.9, 1.85, 1.8, 1.8; indoor entries are 1.7, 1.6, 1.5, 1.5, 1.5. Do not assume they are conventional absolute gear reductions: final-drive/ratio composition and wheel-RPM coupling are not fully recovered. Copying them directly into a modern gearbox would be premature.

Another file/binary discrepancy: curve 2 has 41.5 HP at 7000 RPM in code versus 41 in the file (`0x49f344–0x49f349`). All three branches should be decoded into independent fixtures before a complete drivetrain port.

### 3. Lean control

At `0x4ac335` the candidate lean combines a steering-related angle and another lateral state with weights 0.05 and 0.2, multiplied by a local scalar. The complete semantics of that scalar and second state remain unresolved. A conditional small-lean path uses 0.087 rad. Then:

```text
targetLean = clamp(candidateLean, -maxLean, +maxLean)
error = currentLean - targetLean
rate = maxLeanRate            // 120 degrees/second
if signs of compared state and error match:
    rate *= 0.8              // 96 degrees/second
correction = clamp(error, -dt * rate, +dt * rate)
// subsequent contact/orientation checks gate application of the correction
```

Clamp and rate logic are visible at `0x4ac3d3–0x4ac50e`; the inverse timestep at local stack offset `0x48` is set at `0x4a5548`. This is an explicit bounded orientation correction, unlike our torque-only balance loop. Do not claim that the whole original turns by directly setting yaw: the rest of its contact and steering model is still unresolved.

### 4. Nominal fixed step with a fallback

`0x4a54b6–0x4a5548` computes integer steps from `(remainder + frameDelta)/0.02`, stores the fractional remainder, then caps executed iterations at 10. If there are no whole steps, it clears the remainder and executes one short step (or 0.02 if the frame delta is zero). Thus **“strict 50 Hz fixed step” would be inaccurate**. Preserve our 120 Hz architecture unless an A/B experiment demonstrates that the timing behavior is essential.

### 5. Traction assistance: partly recovered

`0x4a832c–0x4a83f0` constructs a floor from a state divided by the 45 ft/s threshold, chooses the larger of that floor and another capped traction factor, then multiplies by the traction tuning factor. The companion file calls this a speed-dependent minimum traction contribution. However, the inspected path zeroes the state at `0x4a81e7`, and its broader lifetime/other paths need tracing. Do not yet translate this into an asserted universal `grip = speed/45` rule or apply it to lateral cornering grip. It is a promising drivetrain/traction investigation lead.

## Implementation plan from the investigation

The handling, suspension, mass and drivetrain changes below are implemented as described above. Runtime recovery of the remaining original systems and original-game A/B telemetry remain future work.

1. **Build an optional comparison handling profile** with a 40° lean target and a time-based 96–120°/s target transition. Keep contact forces and current crash detection initially. Log full-left/right reversals at fixed speeds. A rate-limited target is an adaptation, not a claim to reproduce the original's gated orientation correction exactly.
2. **Implement separate front/rear progressive suspension and digressive damping**, preserving full-stroke raycasts and terrain agreement. Start with physically consistent mass/support conversion. Use drop, ramp, repeated-whoop and one-wheel landing scenarios to evaluate bottoming, bounce and retained speed before removing existing landing assistance.
3. **Replace cosmetic gearing with a real engine state and sampled torque curve.** Finish tracing ratio composition, shift predicates, engine braking and wheel contact first. Add shift-time behavior, then route the same engine state to audio and HUD. Avoid stacking a new engine curve on the current drive-force formula.
4. **Evaluate mass and scale together.** Use the recovered 183.7 kg total as a profile parameter, then recalibrate suspension/inertia. The original wheelbase, wheel radii and body inertia still need recovery; our 2.15 m wheelbase and 0.61 m tire radius should not be treated as matches.
5. **Recover and measure air control and landing failure logic.** Initialized angle/acceleration thresholds alone do not establish crash rules. Record upright, nose-first, sideways and rear-wheel landings in the original before changing ours.

Recommended acceptance measurements: 0–30/60/90 km/h times; coast-down; braking distance; turn radius at 20/40/60 km/h; full-lock reversal time; takeoff pitch; peak jump height/range; time to regain two-wheel contact; retained speed after landing; crash outcomes by landing angle. Use an identical scale and input schedule. Current unit tests validate our behavior but are not an original-game comparison.

## Work remaining / boundaries of confidence

The values and selected formulas above are grounded in the supplied binary. The complete physics is not yet recovered: drivetrain runtime, tire/contact solver, chassis inertia and geometry, rider weight shift, air control, collision response and terrain units still need detailed tracing and original-game telemetry. No original executable, artwork or decompiled code dump has been incorporated into the shipped game. The implementation uses recovered constants and formulas with explicitly identified adaptations; it is not a verified complete physics port.
