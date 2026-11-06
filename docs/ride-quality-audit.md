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

## Follow-up: circuit, feedback and presentation — 2026-11-05

- **Circuit.** The analytic oval is replaced by a closed Catmull-Rom spline (1,330 m) with an arc-length table in `src/track.js`. Gates, paint, stakes, minimap, spawn, recovery and closest-point queries all read that one table. A 12 m road is graded by a gentle two-frequency rise and carries five tabletop features; the heightfield is now 360² at 2.5 m spacing instead of 300² at 3 m.
- **Race feedback.** Three-light start sequence, gate split toasts, best-lap and personal-best storage shown in the menu, a wrong-way warning when sustained travel opposes the local tangent, a translucent best-lap ghost recorded at 10 Hz, and a combo multiplier for chained airtime. Free-ride flags and compass dots mark jump takeoffs.
- **Audio.** `src/audio.js` synthesizes a two-oscillator engine with gear-dependent frequency and shift dips, wind noise, landing thumps, gate/countdown beeps. It starts only after SOUND and follows the same state as the throttle.
- **Presentation.** Dust plumes and landing bursts, stronger tread ribbons, camera pullback by aspect and speed, landing shake, layered butte profiles, sun glow and warmer desert grade.
- **Draw budget.** 320 stakes are one instanced draw and the 45 buttes are merged after each terrain rebuild; a riding frame measured about 70 draw calls and 330k triangles at 1440×900 in headless Chrome. These are draw-count measurements, not device FPS claims.
- **Still open.** Real-world wheelbase/seat/travel proportions, finite-width tire collision, unsprung wheel mass, swingarm/steering-stem dynamics, a real drivetrain (RPM/clutch/gears/wheel spin), physical berms, collidable rocks/cacti, a full replay/editor, and online leaderboards. The visual bike is still dimensioned around the existing 2.15 m / 0.61 m collision model rather than a coordinated rescale.

## Follow-up: cornering weight shift, contact and terrain density — 2026-11-05

- **Rider freedom.** The torso now rolls up to 11° beyond the bike, the hips shift 6 cm into the corner, the rider crouches 9 cm and the head leads the turn. Limb IK still keeps gloves on the grips and boots on the pegs; the pose range is covered by the existing rider test.
- **Wheel contact.** Contact patches are drawn at both tire contact points, and the rendered wheels are lowered 6 cm while a ray is in contact. This deliberately sinks the visual tread slightly so the banked tire silhouette reads as planted rather than hovering; it is a presentation correction, not a change to the collision radius.
- **Bike readability.** The frame is now dark, the rear fender smaller, and a rear-quarter camera offset shows more of the bike profile instead of a single-wheel silhouette.
- **Terrain.** Added curvature-shaped outer berms, eight rollers/whoops, wind dunes outside the groomed line, 520 instanced boulders/hoodoos and 380 batched cacti/rocks. The measured frame remains around 100 draw calls and 350k triangles at 1440×900 in headless Chrome.
- **Still open.** The front wheel is often occluded by the rider/body in a directly-behind chase view; a full first/third-person camera set and a coordinated real-world geometry rescale remain open. Contact patches mask a few millimetres of visual disagreement rather than replacing finite-width tire collision.

## Follow-up: readability, physical props, daily/photo/settings — 2026-11-05

- **Camera readability.** Near, far and helmet presets; the far preset is rear-quarter and high enough to expose both wheels. C cycles presets and settings persist.
- **Physical props.** Six shared hero boulders have matching Cannon spheres and rendered meshes; tyre-stack barriers mark the start area; free-ride flags carry numbered boards.
- **Drivetrain feel.** Six gear bands and RPM are derived from road speed and throttle, shown in the HUD and used by the synthesized engine. Wheel angular momentum and clutch/gear physics are still not simulated.
- **Meta.** Three-step first-run tutorial, settings panel (camera, quality, light, touch sensitivity), daily one-lap sprint with a local top five and share/download card, photo mode with orbit/zoom and PNG export, branded loading screen and auto quality downgrade.
- **Still open.** The bike is still dimensioned around the 2.15 m / 0.61 m collision model; a coordinated real-world rescale, clutch/gear/wheelspin dynamics, finite-width tire collision, physical berm meshes and full replay editing remain open.

## Follow-up: speed, impact and ground detail — 2026-11-05

- **Feel.** Speed-scaled screen streaks, boost FOV, low-speed rear-wheel spin, camera rumble and lean roll, and an edge flash on hard landings/crashes.
- **Graphics.** Checkered start/finish paint, denser crossed-plane grass (1,500 instances), numbered free-ride flags, tyre-stack barriers, and visible hero boulders with matching colliders.
- **Measured.** ~90 draw calls and ~366k triangles at 1440×900 in headless Chrome; 60 fps in the test session. These are draw-count observations, not physical-device promises.
- **Still open.** The coordinate vehicle rescale, wheel/contact deformation, brake/gear physics, and a multi-line track design remain the largest structural items.

## Follow-up: proportion, landmarks and air feel — 2026-11-05

- **Visual proportion.** The rendered tire radius is reduced to 0.53 m against the unchanged 0.61 m collision radius, the wheel centers are lowered to keep the tread in contact, the body is lowered 4 cm and the front fender follows the smaller wheel. This improves silhouette without invalidating handling tests; a coordinated physical rescale is still open.
- **Motion.** Jump camera pullback, visible rear-wheel throttle spin, boost flame/glow, speed streaks and lean roll.
- **Landmarks and dressing.** A 26 m stone arch on the far side of the basin, checkered start-gantry banners, a checkered start/finish paint band, denser grass and warm dust motes.
- **Measured.** About 93 draw calls and 366k triangles at 1440×900 in headless Chrome, still 60 fps in the test session.
- **Still open.** Physical wheelbase/seat/travel rescale, full tire/contact deformation, collision for all scatter and track furniture, and a multi-line circuit.

## Follow-up: AI art and bike-controller research — 2026-11-06

- **Art.** OpenAI-generated 1990s menu hero, sandstone albedo, monochrome ground detail and metal/checker UI panel. The menu is now a poster-led 90s layout with metal panels; procedural track paint and ruts are retained.
- **Controller.** Reviewed Bike Lab, Kright/MotorcyclePhysics, TLabVehiclePhysics and Randomation. Adopted low-speed foot support, speed-scaled roll-rate damping and centralised lean targeting. A countersteer experiment was rejected after it scrubbed speed and failed the turn-radius test.
- **Still open.** Pacejka/LUT tires, a full balance-steer controller, unsprung wheel mass, swingarm/steering-stem dynamics, real clutch/gearbox and coordinated world-scale geometry. See `docs/bike-controller-research.md`.

## Follow-up: Pacejka lateral model and wheel-speed state — 2026-11-06

- **Pacejka lateral curve.** Replaced the linear-with-clamp lateral force with a peak-and-fall magic-formula curve. The peak lateral limit is 1.72× load, and the combined grip ellipse now uses that same limit. The turn, steering, grip-share and course tests still pass after retuning B/C/D/E.
- **Wheel speed state.** Each wheel now carries angular speed and slip ratio. The rear rendered wheel spins from slip instead of raw throttle, and the values are exposed for future drivetrain/audio work.
- **Controller.** Low-speed rider-foot support and speed-scaled gyroscopic roll damping remain. A sustained countersteer term was tested and removed because it scrubbed speed at 22 m/s and failed the turn-radius regression.
- **Still open.** Wheel inertia/engine-torque coupling, clutch/gearbox, unsprung mass, swingarm/steering-stem dynamics and a full balance-steer controller.

## Follow-up: balance steer and chaotic airtime — 2026-11-06

- **Controller.** The Bike Lab law `s = b + (b - t)k + d` is now explicit in `src/controller.js` and the physics step. A speed-dependent assist gain compensates the reduced tire/steer geometry, the damper acts on steering, and a small yaw-rate correction keeps full-lock alternating inputs recoverable. Safe braking now falls off with bank.
- **Terrain.** Race features increased to seventeen, including four sharp kickers and larger tabletops; the free-ride park has fifteen features, including a 3.2 m big-air jump at the end of the starter line. A high-frequency hardpack/erosion layer was added to the open basin and off-piste race terrain, without disturbing the groomed racing line. A 30-second free-ride run measured 10.3 s of airtime across eight landings, with a 2.4 s longest jump.
- **Tests.** 66 tests pass, including new controller helpers, Pacejka grip, full-lock 20-second recoverability and the updated starter-line airtime check.
- **Still open.** Wheel inertia/engine-torque/clutch coupling, physical rider feet, unsprung mass and full real-world geometry.

## Follow-up: mechanical detail and physical RPM — 2026-11-06

- Added chain runs, rear shock/spring and sprocket to the bike, completing the Bike Lab-style mechanical silhouette.
- Rear wheel angular velocity remains derived from ground speed plus commanded wheelspin; an inertia-integrated version overspun the rendered wheel and was reverted.
- The HUD gear/RPM now follows wheel speed through six gear ratios instead of a pure speed lookup. A full engine-torque/clutch drivetrain was prototyped but reverted: the reduced tire/steer model became unstable in the 20-second full-lock course tests. The flat drive-force curve remains the stable baseline.
- Terrain remains at seventeen race features and fourteen free-ride jumps, with the off-piste hardpack layer.
- **Still open:** wheel inertia/clutch coupling, physical rider feet, unsprung mass and full real-world geometry.
