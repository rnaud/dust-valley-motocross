# Motorcycle handling research and implementation

Reviewed 2026-11-05. The previous implementation used a chassis yaw motor and a single lateral drag force. It could avoid crashes without reproducing the relationship between contact grip, heading and lean. Its camera was also 10 m behind and 5.2 m above the rider anchor.

## Primary references

- [Jolt MotorcycleController source](https://github.com/jrouwe/JoltPhysics/blob/master/Jolt/Physics/Vehicle/MotorcycleController.cpp): limits steering using wheelbase, speed and permitted lean; derives balance from ground impulses. Its balance correction takes wheel-contact velocity changes into account, and strong correction requires supported wheels. This is an important warning against treating a car's inline wheel setup plus an independent roll spring as a motorcycle.
- [Jolt WheeledVehicleController source](https://github.com/jrouwe/JoltPhysics/blob/master/Jolt/Physics/Vehicle/WheeledVehicleController.cpp): resolves longitudinal/lateral tire behavior from contact velocity and available suspension support.
- [NWH Motorcycle Module](https://www.nwhvehiclephysics.com/doku.php/NWH/VehiclePhysics2/Modules/MotorcycleModule/MotorcycleModule): uses a torque-based PID balance controller, with rear-wheel drive.
- [MX Simulator](https://mxsimulator.com/): describes lean, suspension and drivetrain behavior as central to its riding model. Its marketing description is a useful design reference, not an implementation specification.

## Chosen model

This remains an assisted arcade model. It does not reproduce Motocross Madness's unpublished physics or claim to match a measured motorcycle. The implementation is original, using the references as design guidance.

The two suspension contacts now feed separate front/rear tire forces. Contact velocity includes yaw at each wheel; tire slip angle produces cornering force. Drive and braking share an elliptical grip budget with lateral force. Excess demand causes slip. The front wheel's force generates turning torque through its longitudinal lever arm; the old direct yaw motor is removed.

Player input requests cornering strength. The relation `tan(lean) = v² / (g R)` and wheelbase convert this to a speed-dependent steering angle. A virtual rider adjusts the bars to damp excess yaw. Balance targets actual lateral/support force, with a bounded roll spring. Cross-slope is measured against an unbanked horizontal axis; using the banked chassis axis incorrectly subtracts the bike's own lean.

Several deliberate assists remain: planar tire force levers, equilibrium longitudinal load transfer with rider weight adjustment, smoothed support loads, reduced yaw leverage during one-wheel touchdown, and bank-independent suspension-ray direction. Ray direction retains pitch for ramps. These address limitations of zero-width ray contacts and a single rigid chassis; they are not a full tire-contact or articulated-rider simulation. There is no physical steering stem, tire deformation, wheel angular-momentum model or measured tire curve. Grip values are arcade tuning.

## Speed presentation

The chase camera is now 6.2 m behind and 2.7 m above the anchor, with a smoothly varying 70–84 degree vertical field of view and a level horizon. Nearby world-anchored stones and scrub provide scale and motion cues in two instanced draw calls. This is a design hypothesis verified visually, not a claim established by the physics references.

## Validation

At an entry speed of 54 km/h, one second of full left input plus throttle changed heading by about 48 degrees, compared with 26 degrees in the prior build. At 79 km/h the change was about 34 versus 21 degrees. Both runs retained forward speed. These are deterministic flat-ground comparisons, not predictions for every terrain or mobile device.

Tests cover force limits, unloaded tires, progressive analog steering, mirrored left/right response, meaningful heading change, controlled slip, reversals, braking, ballistic flight and landings. The lean envelope now allows the intended approximately 53-degree full-input bank. Rough-ground full-lock loops also verify acceleration after releasing steering, rather than demanding a particular speed at an arbitrary uphill endpoint. Passing these checks is not proof of convincing ride feel; actual browser driving remains necessary.
