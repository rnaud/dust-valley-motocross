# Dust Valley

An original, arcade-style motocross playground built in Three.js, inspired by the open-terrain riding of Motocross Madness. Procedural desert scenery and motorcycle geometry; no assets from the original game.

## Play

https://rnaud.github.io/dust-valley-motocross/

- **Desert circuit:** three laps through twelve ordered gates, with a timer and locally saved personal best.
- **Free ride:** explore the basin, jump the hills, and accumulate airtime points.
- **Keyboard:** WASD or arrow keys to ride; Space to boost; R to recover; P or Escape to pause. I/K shifts rider weight and adjusts pitch in the air. Land level; a hard impact or tipped chassis can cause a wipeout.
- **Mobile:** drag the left thumb joystick for proportional steering (horizontal) and rider lean (vertical), while holding GAS on the right. BRAKE slows the bike; BOOST adds engine power. Use ↺ to recover. Portrait and landscape supported.
- Sound is optional and starts only after pressing SOUND.

Requires a modern browser with WebGL 2. Touch controls were checked using mobile browser emulation and simultaneous touch events; physical-device performance will vary.

## Develop

```sh
npm ci
npm run dev
npm test
npm run build
```

The simulation uses Cannon ES at 120 Hz: a 150 kg rigid chassis, two independent raycast spring/damper suspensions, contact-gated rear-wheel traction, separate front/rear slip-angle tire forces, combined grip limits, virtual-rider steering feedback, drag, gravity, rider pitch torque, and bounded roll-balance assistance. Suspension movement drives the rendered wheels and forks. This is an assisted arcade physics model, not a reconstruction of the original game's proprietary simulation. Decorative scenery has no collision bodies; terrain and the chassis do.

The physics tests run with Node's test runner. `scripts/smoke.mjs` exercises desktop and mobile gameplay with Playwright and a local Chrome installation, against a development server on port 5189. Update the Chrome executable path for your platform.

GitHub Actions builds and publishes `dist/` on every push to `main`. Vite uses relative asset paths for GitHub Pages project hosting. Google Fonts is optional; local system fonts are the fallback.

## Procedural artwork

`src/textures.js` generates seeded soil and scrub color maps, course-aligned worn lanes and ruts, world-space gravel detail, sandstone strata, cactus ribs, rubber grain, and a cloudy sky. No original Motocross Madness textures are used. The terrain color map is 1536² on desktop and 1024² on touch devices; smaller repeating detail maps provide close-up texture without large downloads.

Handling tuning: joystick directions are tested in the chase camera's coordinate frame. Normal throttle reaches 60 km/h in approximately 1.9 seconds on the flat test surface (about 1.4 seconds with boost). Rider torque assists power delivery and landing recovery; airborne steering targets a bounded lean and yaw rather than continuously rolling the bike. These are arcade handling targets, not specifications for a real motorcycle.

Cornering stability: steering angle now limits requested lateral acceleration as speed rises. Tire impulses have reduced rollover leverage, and roll assistance follows the measured turn rate. Power-balancing torque is applied only while the driven rear tire has ground contact. Regression tests hold full steering for 20 seconds in both directions, on flat and course terrain, after several launch durations; mobile browser tests also hold the actual joystick for 20 seconds each way. Crash detection remains active for overturned impacts.

Free ride uses natural hills without the circuit grading, painted lanes, ruts, stakes, gates, or checkpoint HUD. Its compass replaces the route map, and recovery resets the bike at its current location. Switching modes updates both rendered terrain and the physics heightfield. Mountain foundations extend below the lowest terrain across their full footprints, with their tops preserved and their bases contained within the ground mesh.

Landing recovery temporarily increases compression damping and suspension force capacity to absorb jump impacts without bottoming the chassis into the dirt. Downward speed alone no longer declares a wipeout on an upright landing. Tests check retained speed and settled wheel contact after drops and course-shaped jumps. Both tires leave procedural tread ribbons from actual contact points; the trail breaks while airborne or recovering and is cleared on a new ride or mode change. A bounded ring buffer limits trail memory on mobile.

Motorcycle handling: front/rear tire forces now generate yaw through their wheelbase lever arms. The direct chassis yaw motor is removed. A virtual rider adjusts the handlebars and balances against tire/support forces; braking and power share grip with cornering. The camera is closer and lower, with a wider speed-dependent field of view and instanced ground detail for scale. Research sources, deliberate assists, measured comparisons and limitations are documented in [motorcycle-handling.md](docs/motorcycle-handling.md). `scripts/reversal-smoke.mjs` drives the arrow-key sequence in both modes and checks reversal response and retained speed.
