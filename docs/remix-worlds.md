# Remix Worlds

Select **Remix Worlds** on the main menu, choose a world, and press **Let’s Ride**. These experimental courses use Dust Valley's playground handling so their custom moving collision surfaces work; they are separate from the original Motocross Madness parity simulation.

| World | Playable rules |
| --- | --- |
| The Last Train | Ten moving freight carriages, cargo obstacles, side boarding ramps, ground alternative, sequential moving checkpoints, and a 100-second deadline to catch the engine. |
| Erase the World | Paper tiles disappear behind a chasing eraser. First-lap tire trails become permanent physical ink. Lap two returns you to the ink starting pad, removes every paper collider, and requires riding the road you drew. No new ink on lap two. |
| Rush Hour, Size Small | Two laps on a breakfast table with giant props, a toaster launch pad, a growing coffee spill that slows the bike, and a dishwasher bridge that opens for nine seconds out of fourteen. |
| The Sleeping Giant | Animated breathing collision terrain. Smooth riding preserves sleep; hard braking, boosting, and crashes disturb it. Press E or the on-screen Wake button for a shorter central return with stronger terrain motion. |
| The Track Is Your Opponent | Three laps. Throttle raises jumps and widens the occupied sector; braking narrows and bends it. Lock one sector after each of the first two laps, preserving its geometry. |

All worlds support keyboard/touch riding, pause, restart, and recovery at the last checkpoint. Lime rings mark the next checkpoint; small lime dots show the route. In the ink world's second lap, only the drawn road remains. Art filters apply through the existing renderer; generated voxel terrain is suppressed here because an extra visual floor would hide the real gaps and moving collision surfaces.

## Validation

`node --test tests/remix-worlds.test.js` drives complete challenges with the actual bike simulation at 120 Hz, waits for the kitchen bridge, verifies the paper colliders disappear, forbids second-lap road generation, checks locked sectors, drives both giant routes, and verifies cleanup and fall failures. `node scripts/remix-smoke.mjs` checks all five menu entries, movement, pause/photo, restart, return to menu, and mobile wake controls against the production preview on port 5197.

These are a first playable set with procedural art, not finished production environments. The original parity work remains tracked separately.
