# Dust Valley

An original, arcade-style motocross playground built in Three.js, inspired by the open-terrain riding of Motocross Madness. Procedural desert scenery and motorcycle geometry; no assets from the original game.

## Play

https://rnaud.github.io/dust-valley-motocross/

- **Desert circuit:** three laps through twelve ordered gates, with a timer and locally saved personal best.
- **Free ride:** explore the basin, jump the hills, and accumulate airtime points.
- **Keyboard:** WASD or arrow keys to ride; Space to boost; R to recover; P or Escape to pause. Forward/backward input adjusts pitch in the air. Land level to avoid a speed penalty.
- **Mobile:** hold GAS and a steering button together. BRAKE controls braking/air lean; BOOST adds speed. Use ↺ to recover. Portrait and landscape supported.
- Sound is optional and starts only after pressing SOUND.

Requires a modern browser with WebGL 2. Touch controls were checked using mobile browser emulation and simultaneous touch events; physical-device performance will vary.

## Develop

```sh
npm ci
npm run dev
npm test
npm run build
```

The pure physics tests run with Node's test runner. `scripts/smoke.mjs` exercises desktop and mobile gameplay with Playwright and a local Chrome installation, against a development server on port 5189. Update the Chrome executable path for your platform.

GitHub Actions builds and publishes `dist/` on every push to `main`. Vite uses relative asset paths for GitHub Pages project hosting. Google Fonts is optional; local system fonts are the fallback.
