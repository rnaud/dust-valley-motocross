# Dust Valley

An original, arcade-style motocross playground built in Three.js, inspired by the open-terrain riding of Motocross Madness. Procedural desert scenery and motorcycle geometry; no assets from the original game.

## Play

https://rnaud.github.io/dust-valley-motocross/

- **Desert circuit:** three laps of a hand-authored 1.33 km circuit through twelve ordered gates, with rolling grade, seventeen jump features including sharp kickers and rollers, start lights, gate splits, a translucent best-lap ghost, best lap and a locally saved personal best.
- **Free ride:** ride fifteen shaped jumps across several lines, follow the flags and compass markers, explore the outer hills, and build a combo multiplier from clean landings.
- **Deformable sand:** enabled by default in every mode, including MCM preview. Tires settle and carve the surface, repeated passes compact it, and soft soil adds rolling resistance. Uncheck the menu option for hardpack. Ruts persist during a ride within a bounded terrain cache; restarting clears them.
- **Keyboard:** WASD or arrow keys to ride; Space to boost; R to recover; C cycles near/far/helmet cameras; P or Escape pauses; I/K shifts rider weight and adjusts pitch in the air. Land level; a hard impact or tipped chassis can cause a wipeout.
- **Gamepad:** left stick steers and leans, RT/A throttles, LT/B brakes, RB/X boosts, Start pauses.
- **Mobile:** drag the left thumb joystick for proportional steering (horizontal) and rider lean (vertical), while holding GAS on the right. BRAKE slows the bike; BOOST adds engine power. Use ↺ to recover. Portrait and landscape supported.
- Sound is optional and starts only after pressing SOUND: RPM/gear-driven engine load and shifts, wind, tire roost and landing impacts. Camera shake follows hard landings.
- **Daily sprint:** one lap of the circuit against today's local best, with a local top-five board and a share/download result card.
- **Photo mode:** pause, hide the HUD, orbit/inspect the bike, and save a PNG.
- **Settings:** near/far/helmet cameras, quality (auto/high/low), dawn/day/dusk light, touch sensitivity. First launch includes a three-step ride tutorial.

Requires a modern browser with WebGL 2. Touch controls were checked using mobile browser emulation and simultaneous touch events; physical-device performance will vary.

## Develop

```sh
npm ci
npm run dev
npm test
npm run build
```

The simulation uses Cannon ES at 120 Hz: a 183.7 kg rigid chassis, two independent raycast suspensions with progressive springs and digressive damping, contact-gated rear-wheel traction, Pacejka-style lateral tire curves, wheel angular-speed/slip-ratio state, a five-speed torque-curve drivetrain with clutch launch and 50 ms shift interruptions, combined grip limits, virtual-rider steering feedback, drag, gravity, rider pitch torque, bounded roll-balance assistance, low-speed rider-foot support and speed-scaled wheel gyroscopic damping. The controller is informed by Bike Lab, Kright/MotorcyclePhysics, TLabVehiclePhysics and Randomation Vehicle Physics; see [bike-controller-research.md](docs/bike-controller-research.md). Suspension movement drives the rendered wheels and forks. This is an assisted arcade physics model, not a reconstruction of the original game's proprietary simulation. Terrain and the chassis collide; six hero boulders have static Cannon spheres, while the rest of the scenery is visual only.

The physics and geometry tests run with Node's test runner, including circuit closure, centreline lookup and self-intersection checks in `tests/track.test.js`. `scripts/smoke.mjs` exercises desktop and mobile gameplay with Playwright and a local Chrome installation, against a development server on port 5189. Update the Chrome executable path for your platform.

GitHub Actions builds and publishes `dist/` on every push to `main`. Vite uses relative asset paths for GitHub Pages project hosting. Google Fonts is optional; local system fonts are the fallback.

## Artwork

`src/textures.js` generates seeded soil and scrub color maps, course-aligned worn lanes and ruts, world-space gravel detail, sandstone strata, cactus ribs, rubber grain, and a cloudy sky. No original Motocross Madness textures are used. The desert rock albedo and ground-detail maps are AI-generated and live in `src/assets/`, as are the 1990s-style menu hero and metal UI panel; prompts and sources are recorded in [ai-art.md](docs/ai-art.md). The terrain color map is 1536² on desktop and 1024² on touch devices; smaller repeating detail maps provide close-up texture without large downloads. `src/track.js` owns the closed spline, arc-length table, bucketed nearest-point queries, grade and tabletop feature list, so paint, collision, gates, stakes and the minimap all follow the same course.

The distant terrain mesh is 360² at 2.5 m spacing. With sand enabled, nine nearby 16 m tiles use shared 0.25 m collision/render samples, bounded rut depth and berms, and up to 128 cached soil tiles (4 MiB of soil arrays). The soil model is a deterministic load/drive-demand approximation, not granular simulation or recovered MCM physics. Explicit `sand:false` keeps fixed terrain for baseline validation. Lighting uses a sky-derived environment and a tight bike-following shadow; sand and rock have separate normal and roughness maps. Rounded bodywork, radiator, brake and rider details improve the procedural bike, with rigid chassis parts batched by material. The circuit has outer berms, a graded surface, seventeen kickers, tabletops and rollers; wind-shaped dunes, 520 instanced boulders, 380 batched cacti/rocks and 1,500 crossed-plane grass tufts fill the basin. The 320 boundary stakes are one instanced draw, and the 45 buttes are merged by material after each terrain rebuild. Workload varies with quality and the active terrain patch; browser smoke checks use software rendering and do not establish real-device frame rates.

Race feedback includes three-light start sequencing, a split time at every gate, best-lap and personal-best storage, a translucent best-lap ghost, a wrong-way warning after sustained opposing travel, and a combo multiplier for chained airtime. A live gear/RPM readout shares state with the synthesized engine. Free ride flags carry numbered boards and the compass shows nearby jump markers. Large hero boulders have matching Cannon spheres, tyre-stack barriers mark the start area, the start/finish gantry has checkered banners and a painted line, and a large stone arch is the basin landmark. Warm dust motes drift around the camera.

Quality presets control pixel ratio, shadow resolution, boulder density and dust; auto lowers quality once if sustained frame rate falls below 48 fps. A branded loading screen covers procedural texture generation.

Handling tuning: joystick directions are tested in the chase camera's coordinate frame. Normal throttle reaches 60 km/h in approximately 2.19 seconds on the flat test surface (about 1.63 seconds with boost). Rider torque assists power delivery and landing recovery; airborne steering targets a bounded lean and yaw rather than continuously rolling the bike. These are arcade handling targets, not specifications for a real motorcycle.

Cornering stability: the controller now uses Bike Lab's balance-steer law s = b + (b - t)k + d, with an assist gain for this reduced tire model, a steering damper and a yaw-rate correction. Tire impulses have reduced rollover leverage, and roll assistance follows the requested bank. Power-balancing torque is applied only while the driven rear tire has ground contact. Regression tests hold full steering for 20 seconds in both directions, on flat and course terrain, after several launch durations; mobile browser tests also hold the actual joystick for 20 seconds each way. Crash detection remains active for overturned impacts.

Free ride has an open practice basin, a three-jump starter line, smaller rollers, larger cross-country jumps and natural outer hills without circuit grading, painted lanes, ruts, stakes, gates, or checkpoint HUD. Its compass replaces the route map, and recovery resets the bike at its current location. Switching modes updates both rendered terrain and the physics heightfield. Mountain foundations extend below the lowest terrain across their full footprints, with their tops preserved and their bases contained within the ground mesh.

Landing recovery uses continuous progressive springs and velocity-dependent damping, with separate front/rear coefficients and a 30 kN safety ceiling per wheel. Damping force grows at half its initial slope above each wheel’s recovered velocity threshold; there is no landing-only damping multiplier. Downward speed alone no longer declares a wipeout on an upright landing. Tests check retained speed and settled wheel contact after drops and course-shaped jumps. Both tires leave procedural tread ribbons from actual contact points; the trail breaks while airborne or recovering and is cleared on a new ride or mode change. A bounded ring buffer limits trail memory on mobile.

Motorcycle handling: front/rear tire forces now generate yaw through their wheelbase lever arms. The direct chassis yaw motor is removed. A virtual rider adjusts the handlebars and banks into the requested turn; braking and power share grip with cornering. The camera is closer and lower, with a wider speed-dependent field of view and instanced ground detail for scale. Research sources, deliberate assists, measured comparisons and limitations are documented in [motorcycle-handling.md](docs/motorcycle-handling.md). `scripts/reversal-smoke.mjs` drives the arrow-key sequence in both modes and checks reversal response and retained speed.

Ride presentation now interpolates chassis, wheels and steering between fixed physics steps, damps rider crouch, and keeps camera horizontal motion on the same timeline. The rider rolls and twists into corners, drops a shoulder and leads with the head; tire contact patches keep the wheels visually planted, and a small rear-quarter camera offset reveals the bike profile. Throttle adds visible rear-wheel spin and a boost flame, jumps pull the camera back for landing anticipation, speed adds screen-space streaks and a low camera rumble, and hard landings flash the edges of the frame. The rendered wheels are proportioned smaller than the collision radius and the body sits lower, improving the bike’s silhouette without changing handling. Static wheel details and scenery are batched by material. A chain run, rear shock/spring and sprocket complete the mechanical silhouette. Tire artwork matches the physics radius and banked contact plane. See the [ride quality audit](docs/ride-quality-audit.md) for the remaining gaps in vehicle proportions, rider/contact simulation, drivetrain and world interaction.

Ground contact: visible terrain, tire marks and collision use the same triangle diagonals. Suspension rays cover the full extension stroke and retry sub-millimetre offsets at exact grid seams to prevent numerical contact loss. Tests cover mirrored steering, continuous flat-ground tire contact, terrain agreement and at least three clean starter-line landings in ten seconds. Off-piste hardpack adds a high-frequency rough layer with kickers and erosion whoops.

Rider and front assembly: a shaped, articulated rider keeps gloves on the steering grips and boots on the pegs while elbows/knees absorb body movement. The front fender, fork ends and handlebar follow the wheel axle without inheriting tire spin. Ground-contact presentation corrects along the suspension axis so old contact points cannot pull the wheel out of alignment at speed.

Motocross Madness handling adaptation: recovered 40° requested bank, rate-limited lean transitions, 405 lb combined mass, progressive front/rear springs, digressive damping, the first decoded power curve and five-speed shift interruptions now drive the default simulation. Engine RPM/load is shared by propulsion, HUD and audio. Overall gear reductions, launch clutch, downshift logic, inertia, tire model, air control and crash gating remain game-specific adaptations; see [the binary research and implementation notes](docs/motocross-madness-reverse-engineering.md). `node scripts/handling-benchmark.mjs` reproduces acceleration, braking, coast-down and steering measurements.
