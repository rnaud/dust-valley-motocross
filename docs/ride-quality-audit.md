# Ride quality audit — 2026-11-05

The previous checks established limited stability and turning behavior, not convincing motorcycle feel. This audit separates display artifacts from unfinished vehicle behavior.

## Corrected in this update

- **Unsynchronized presentation.** The fixed physics loop runs at 120 Hz, but rendering copied the latest chassis/wheel positions without interpolation. At 30 m/s, a physics step is 25 cm. Uneven display timing could alternate between held poses and visible position jumps. `RidePose` now interpolates chassis, wheel assemblies, steering and suspension on one timeline. Recovery and restart reset both endpoints. Camera horizontal position follows this same interpolated pose; vertical suspension movement remains filtered.
- **Rigid rider reaction.** The rider previously followed the largest wheel compression immediately every frame. Crouch and lateral body motion now filter those changes; this is presentation damping, not physical rider weight transfer.
- **Excessive draw submissions.** Each wheel had 39 separate meshes. Each now has two material batches, reducing both wheels from 78 to 4 mesh draws per pass. The 160 free-ride scenery objects contained 268 rock/cactus meshes; they now form two material batches, rebuilt when terrain mode changes. Geometry and shadows remain. These are draw-count reductions, not measured device FPS claims.
- **Tire art/contact mismatch.** Rendered tread extended to roughly 0.79 m radius while the suspension model used 0.61 m. Art now matches that radius. A banked tire's visible support extent is calculated from its axle and contact normal so its tread rests on the contact plane rather than hanging above it. This visual correction does not change traction or the rigid-body simulation.

Interpolation follows the fixed-timestep presentation method described in [Glenn Fiedler's original article](https://gafferongames.com/post/fix_your_timestep/). The render-timing test uses mixed 50/60/90/144 Hz intervals and verifies uniform displayed movement at constant speed, along with wheel/chassis synchronization.

## Still missing, in implementation order

1. **Consistent real-world proportions.** Physics wheelbase is 2.15 m and wheel radius is 0.61 m. As a concrete reference, [Yamaha's 2026 YZ450F specification](https://cdn2.yamaha-motor.eu/prod/product-assets/2026/YZ450F/Factsheets/2026-YZ450F_en.pdf) lists a 1.475 m wheelbase, 965 mm seat height, and about 300 mm suspension travel. The game's bike, rider, inertia, springs, wheel sizes and camera need to be dimensioned together. Reducing only the artwork would leave collision and movement mismatched again.
2. **A unified bike/rider/contact model.** The current bike is one rigid chassis with two narrow rays and several assists. It has no finite-width tire collision, unsprung wheel mass, steering-stem dynamics, or physical rear swingarm. Three-metre terrain cells can change contact normals abruptly. Longitudinal load transfer is estimated rather than coming from an articulated rider and suspension. Replace this structure as one coordinated change, with tests for steady cornering, wheel contact and load transfer, rather than adding more independent stabilizing torques.
3. **A drivetrain and useful throttle feedback.** There is no simulated engine RPM, clutch, gear selection, wheel spin or wheel angular momentum. Throttle directly requests force; sound follows road speed. Engine torque, automatic gears, rear-wheel slip and sound should describe the same state. Braking should visibly transfer weight and alter corner entry.
4. **A rider that rides.** The rider now uses shaped torso/helmet geometry and two-link arms and legs: gloves stay on the steering grips, boots stay on the pegs, and elbows/knees bend as the torso absorbs suspension motion. Independent physical rider mass and a full standing/seated transition remain missing.
5. **World interaction and riding routes.** Rocks, cacti and mountains are still decorative meshes without collisions. Free ride now has nine shaped jump features and a three-jump starter sequence; banked berms and physical scenery interaction remain absent. These omissions limit the feeling of choosing and riding a line, regardless of steering values.

## Evidence and limits

In an eight-second straight-line flat-ground simulation after settling, contact count remained stable and maximum chassis pitch change was approximately 0.000000026 rad per physics step. That does not support blaming persistent flat-ground shaking on suspension instability. On rolling terrain, contact changes and suspension movement occur; interpolation does not remove legitimate bumps.

All existing handling tests remain, with additional presentation tests for frame-rate mismatch, heading wrap, recovery, banked tread contact and static mesh transforms. Browser driving checks include acceleration and successive left/right turns. These checks do not establish that the game's overall handling matches a real motorcycle or Motocross Madness. The remaining structural items above are still open.

## Follow-up: steering, ground contact and jump lines

The virtual rider now requests bank, and front-wheel steering follows measured bank plus roll-rate anticipation; low-speed steering blends into this above walking pace. Existing turn-response and mirrored-input tolerances remain unchanged. A failing symmetry check exposed false suspension-ray misses at exact heightfield seams. Sub-millimetre fallback probes eliminate those dropouts. The ray also spans the full allowed suspension extension, instead of ending at spring rest length.

Rendering previously split terrain cells along the opposite diagonal from Cannon. Rendering, sampling and collision now agree; a test compares points inside every triangle against Cannon on an asymmetric surface. Free ride has a gently rolling basin and nine shaped takeoffs, broad tops and landing slopes, with large decorative props excluded from jump lines. The center starter line produces three landings in ten seconds at full throttle, retaining more than 15 m/s, without a crash. This does not resolve the remaining real-world proportions or drivetrain limitations above.

## Follow-up: front assembly and articulated rider

The visible wheel correction used an old contact point as its positional anchor after the chassis advanced. At speed, banking could pull the displayed wheel backward/sideways. It now adjusts only along the suspension direction against the contact plane. Fork ends, fender and bars follow the steered axle; tire spin is excluded from their orientation. Tests verify unchanged horizontal wheel position and axle alignment through bank, steering and wheel rotation.

The replacement rider has a tapered jersey, armor/panels, helmet shell, goggles, chin guard and peak, plus jointed limbs, gloves and boots. Limb constraints are tested throughout the supported crouch, lean and steering range. This is visual articulation, not an additional simulated rider mass.
