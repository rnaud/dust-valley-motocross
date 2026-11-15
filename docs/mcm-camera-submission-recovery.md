# Camera submission and the physics caller stack

This milestone bridges computed camera state to original graphics submission and an exact renderer write into the stack word consumed by the next player update. It does not yet integrate the renderer schedule into the default retained physics replay.

## Submission-time clip planes

Original `0x479de0` optionally clears surfaces when camera byte `+0x1b0` is nonzero, calls `0x479fc0`, then submits view (type 2, camera `+0x70`) and projection (type 3, `+0x30`) through device vtable `+0x68` only when owner `+0x2c` points to this camera.

`restoreMcmSubmissionPlanes` recovers `0x479fc0`: when the clip values do not compare equal to near 1 and far **100000**, it calls the original clip setter with those defaults and rebuilds matrices. Unordered x87 comparisons take the equality branch; this matters when either plane is NaN. The immediate-mode setter does not change the refresh counter. Retained-mode forwarding is unsupported.

The earlier live camera-update boundary used far **768**. Submission temporarily restores far **100000** and rebuilds projection; later work restores the smaller far plane before the next captured camera update. The source of that later restoration remains outside this milestone. Earlier research notes that guessed the default far plane was 768 were incorrect; 768 was an observed update-boundary value, not the constant at `0x4d829c`.

An oracle executes intact `0x479fc0`, `0x47a190` and `0x47a670`. **4,096 cases / 274,432 words match**, with 2,048 rebuilds and 2,048 unchanged sentinel matrix records. Inputs cover equal/different planes and canonical NaN comparisons, along with the prior varied camera inputs. Arbitrary NaN payloads, retained-mode forwarding and surface-clear API behavior are not covered.

## Live computed chain to the exact writer

A fresh neutral-input capture contains 60 retained camera updates and 59 complete submission/render intervals. The analyzer derives the pose, FOV, view and projection from the recovered camera chain; it does not supply observed camera matrices to the renderer calculation. It then:

- Verifies the active-camera gate and both actual submission arguments: **59 pairs / 1,888 words**.
- Verifies the renderer's view operand against the computed view. In this capture, the world operand is identity; any other value is explicitly rejected instead of silently supplied as a new model input.
- Applies the pinned Wine SSE matrix product and matches **59 products / 944 words**.
- Observes `wined3d` RVA `0xc308b` (`movhps [eax+8],xmm4`) writing exactly the physics caller scratch address `0x22f038`. Single-step observations verify all **59 stored words** against computed product element 2.
- Verifies the computed word survives to **58 subsequent non-AI bike entries**, where the scratch address is `ESP+0x54`. The first entry precedes a captured store; the final store has no following entry before capture stops. Neither is counted as a carry check.

Submission itself changes the scratch word in **zero** observed intervals. The surface-clear gate is zero throughout, so those helpers are not ruled out on other paths. Other writes occur before the product, and the final observed product supplies the word seen by the next bike update.

All 22 guarded instructions were independently verified restored, with no debugger attached. The executable and Wine DLL hashes are recorded in the fixture/report. The capture tool checks the pinned Wine base, PE timestamp/image size and instruction bytes; verify the full hashes before running it. No direct CALL instruction is single-stepped. Live instrumentation changes timing, so this is not a controlled repeated acceleration/steering trajectory.

## Reproduction and next work

Generate base inputs using `generate-camera-matrices.mjs`, then `node scripts/mcm-reference/generate-camera-submission.mjs MATRIX_INPUT.bin NEW_INPUT.bin`. Compile `camera-submission-oracle.c` with the established 32-bit MinGW flags (`-O0 -Wall -Wextra -Werror`, image base `0x10000000`, dynamic base disabled). Run with `mcm.exe INPUT.bin OUTPUT.bin` in the reference prefix; compare using exported `compareCameraSubmission`. Input/output sizes are 64/268 bytes per case.

`capture-camera-submission.c PID NEW_CAPTURE.jsonl 60` captures the camera, submission, product and exact store boundaries. Verify cleanup independently. `analyzeCameraSubmission(rows, terrain)` performs the joined comparison; the compressed fixture retains raw oracle streams and live rows.

Next recover the world-identity submission and other world-transform gates, the later clip-plane restoration, surface-clear paths, and scheduling around HUD/AI/physics. Then use computed renderer scratch in a controlled negative-steering replay without observed-entry-word injection. The known frame-38 steering divergence is still open; default preview handling is unchanged.
