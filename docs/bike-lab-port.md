# Bike Lab controller port checklist

| Bike Lab feature | Dust Valley implementation |
| --- | --- |
| Two-wheel rigidbody | One 150 kg Cannon chassis with two raycast suspension wheels |
| Balance steering `s = b + (b - t)k + d` | `getBalanceSteer` / `getSteerCommand` in `src/controller.js`, used by `stepBike` |
| Steering damper | Roll-rate term on the steering target |
| Max steer / max lean | `s.steer` clamp and `desiredRoll` clamp |
| Acceleration / front / rear / safe brake | Throttle force, separate front/rear brake values, bank-sensitive safe-brake factor |
| Feet support near the fall limit | Low-speed rider-foot restoring torque below 5 m/s |
| Balance / lean helpers | Explicit balance and target-balance functions and tests |
| Wheel interpolation | `RidePose` / visual interpolation between fixed physics steps |
| Slip effects | Tire tracks, dust, wheelspin and speed feedback |
| Fork, swingarm, chain, damper | Fork tubes, swingarm bars, chain runs, rear shock/spring and sprocket |
| Rider IK | Articulated rider with grip IK, crouch, bank and head lead |
| Pacejka-style tire | Lateral magic-formula curve with combined grip ellipse |
| Wheel angular speed | Ground-speed/slip-derived rear-wheel omega and rendered spin |
| Terrain / track | Spline circuit, berms, jumps, chaotic off-piste hardpack and free-ride park |

Known simplifications: unsprung wheel mass, a separate clutch/flywheel and full real-world geometry are not modelled. They are future refinements beyond the controller feature set.
