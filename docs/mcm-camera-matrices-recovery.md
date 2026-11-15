# Camera view, projection and viewport matrices

`composeMcmCameraMatrices` recovers the complete arithmetic routine `0x47a670..0x47a819`. It computes the view matrix at camera `+0x70`, projection at `+0x30`, projection-to-viewport transform at `+0xf0`, combined view/projection/viewport at `+0xb0`, and screen scale at `+0x16c`. This connects the recovered camera pose/FOV to the matrices consumed later by rendering; it does not yet model their renderer submission or scratch writes.

The routine uses the existing recovered `0x475760` view builder. Projection `0x4756d0` converts FOV with the original double constant `0.01745329`, rounds radians to float, then computes the half-angle. Cosine rounds to float before division by the unrounded sine. Depth is `f32(1/(1-near/far))`. The viewport transform has X scale 0.5, Y scale `f32(-0.5*aspect)`, and X/Y translation 0.5. By-value multiplication `0x475b00` starts from positive zero and accumulates four terms in loop order, unlike the previously recovered unrolled pointer-argument product. The screen-scale tangent uses the unrounded degree conversion, not the rounded projection angle.

## Evidence and scope

The oracle calls intact original `0x47a670`, including its view, projection, identity and matrix-multiplication helpers. **4,096 cases / 266,240 output words match exactly**. Inputs vary eye, forward/up vectors, roll, near/far planes, aspect, and viewport width; FOV cases include negative, zero, tiny positive, ordinary, 180, 270 and 360 degrees. Zero and maximum unsigned viewport widths are included. The zero-FOV case produces native infinities/NaNs in downstream matrix arithmetic; their stored words match. Arbitrary NaN payloads, nonfinite pose inputs, very large FOV angles and degenerate near/far planes are not covered by this fixture.

A fresh **60-frame mode-0 idle capture** matches all four matrices and screen scale: 3,900 additional words. Inputs come from the computed retained chase eye/target, final pose/orientation, and FOV filter; observed matrix outputs are not injected. Projection context (near/far/aspect/width) is seeded once and must remain unchanged. Matrix state is checked at the next source entry and before the native update. All prior controller, terrain-clearance, finalization and counter checks also pass, with zero per-frame refresh-counter boundary inputs.

The analyzer retains matrices when the update skip flag is set; that branch is not exercised in this live capture. Camera mode/FOV/viewport-control transitions still require recovery and are rejected if they change the modeled context. All fourteen capture hooks were independently verified restored and no debugger attached. An earlier capture-helper loop-bound error aborted before recording a frame; cleanup was verified before the corrected capture. The reference executable remained running.

## Reproduction and next work

Generate cases with `node scripts/mcm-reference/generate-camera-matrices.mjs NEW_INPUT.bin`. Compile `camera-matrices-oracle.c` using 32-bit MinGW with `-O0 -Wall -Wextra -Werror -Wl,--image-base,0x10000000 -Wl,--disable-dynamicbase`. Run under the reference Wine prefix with `mcm.exe INPUT.bin OUTPUT.bin`; use exported `compareCameraMatrices`. Inputs are 15 words (pose10, FOV, near, far, aspect, unsigned width), outputs 65 words (projection16, view16, combined16, screen16, screenScale1).

`capture-camera-matrices.c PID NEW_CAPTURE.jsonl 60` uses the existing fourteen guarded non-CALL hooks. Independently verify restoration/detachment afterward. Analyze with `node scripts/mcm-reference/analyze-live-chase-controller.mjs CAPTURE.jsonl --terrain COURSE.trn --matrices`.

Next trace matrix submission, renderer cache/refresh gates and stack-writer ordering, then test the known frame-38 negative-steering divergence without supplying observed scratch state. Action-11 transitions, remaining input paths and whole-world parity remain open. Preview handling is unchanged by this milestone.
