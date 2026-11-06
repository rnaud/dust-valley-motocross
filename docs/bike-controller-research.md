# Bike controller research — 2026-11-06

The handling pass was informed by these open-source Unity projects and reference notes:

- **Bike Lab / BikeController** (V-Kudryashov documentation): a two-WheelCollider rigidbody with a computed **balance steering angle** for a given speed and lean, a steering damper, a low centre of mass, rider feet that provide support near the fall limit, separate telescopic-fork/swingarm/chain visual parts, IK rider and 2 ms-scale physics for long jumps. <https://github.com/V-Kudryashov/md-Files/blob/main/BikeLab/BikeLab.md>
- **Kright/MotorcyclePhysics**: countersteering model, low-speed engine assistance to avoid falling, explicit high-speed wobble limits, and a 0.005 s fixed step. <https://github.com/Kright/MotorcyclePhysics>
- **TLabVehiclePhysics**: Pacejka/LUT tire model, suspension and torque-curve reference implementation built on WheelCollider. <https://github.com/TLabAltoh/TLabVehiclePhysics>
- **Randomation Vehicle Physics**: open tire/suspension reference used by TLab. <https://github.com/JustInvoke/Randomation-Vehicle-Physics>
- **Unity WheelCollider** motorTorque/steer/brake API and friction-curve model. <https://docs.unity3d.com/Manual/class-WheelCollider.html>

## What was adopted here

- **Balance steer:** implemented the Bike Lab law `s = b + (b - t)k + d` in `src/controller.js` and the physics step, with a speed-dependent assist gain for the reduced tire model, a roll-rate steering damper and a small yaw-rate correction. `b` is the balance steer for current lean; `t` is the balance steer for the requested lean.
- **Safe brake:** braking force is clamped by bank angle so a fully leaned tire is not asked for a straight-line stop.
- **Low-speed support:** a small rider-foot torque catches the chassis when speed is below 5 m/s and relative lean exceeds ~16°, fading out with speed. This is the practical part of Bike Lab's feet behaviour without adding separate foot rigidbodies.
- **Wheel gyroscopics:** a speed-scaled roll-rate damping term stabilises fast direction changes; it is a reduced model, not a full spinning-wheel inertia tensor.
- **Lean target centralisation:** the desired roll is computed once and shared by the roll controller; this removed duplicated state and makes later balance-steer work possible.
- **Pacejka lateral curve:** replaced the linear-with-clamp lateral force with a peak-and-fall magic-formula curve (game-tuned B/C/D/E). Peak lateral grip is 1.72× load; the combined grip ellipse is unchanged.
- **Wheel angular speed:** rear/front wheel omega and slip ratio are now carried in state; rear visual spin is driven from slip rather than raw throttle. The values do not yet feed a full wheel-inertia drivetrain.
- **Visual lean/IK:** the rider crouches, shifts hips and leads with the head; the bike’s visual wheels are proportioned smaller than the collision radius while the contact patch stays on the ground.

## What was tested and rejected

An extra sustained countersteer term was tried before the balance-steer law. It produced a more realistic turn-in shape, but at 22 m/s it added several m/s of scrub and failed the existing turn-radius regression. The explicit balance-steer law plus steering damper replaced it.

## Still missing

- Longitudinal Pacejka/LUT slip-ratio curves and wheel angular momentum feeding engine torque/clutch/gears.
- Unsprung wheel mass, swingarm/steering-stem dynamics, a real clutch/gear box, and coordinated real-world geometry.
- Separate physical rider/feet support bodies and low-speed engine assistance.
