# Transform-upload gate and payload selection

The first transform upload in Wine state-block application is now predicted
from incoming state, including the pre-transformed-vertex path. This is a gate
toward the renderer's proven heap write, not complete upload/free scheduling
or a fix for the older frame-38 physics divergence.

## Native paths

The earlier hypothesis that the preparation helper changed the flags was wrong.
A fresh capture observes the gate inputs before and after helper RVA 0x1f04a0:
they remain unchanged in all 868 recorded applications.

The missing path is at RVA 0x1bdd9b. If the state-block declaration pointer at
+0x10c exists and its byte +0x18 is nonzero, the vertices are pre-transformed:

- +0x108 bit 0x40 or +0x106 bit 0x40 triggers viewport-matrix construction.
- The constructed matrix is at local frame +0xa0. RVA 0x1bdef6 jumps directly
  to 0x1bf964, bypassing the other gate.
- Its address is the aligned state-application entry stack minus 0x7c0,
  already represented by mcmRenderProductAddress. Its contents are not
  validated by this milestone.

Otherwise the path through RVA 0x1bf703 requires +0x107 bit 0x40 and either
+0x58 bit 8 or +0x108 bit 0x40. It uploads the retained matrix at
state-block +0x2de0. A missing declaration follows this same path.

Both paths call RVA 0x1c6e00 with kind 6, flags 0x10000, offset 256 and
count 64, returning to RVA 0x1bf994. The other upload calls are kept in the
fixture but are not counted as this transform upload.

## Evidence and limits

tests/fixtures/mcm/render-upload-wine11.json.br preserves all 868 applications'
entry, incoming/prepared state, declaration and upload observations. The
recovered predicate and source address match 16 uploads: 12 viewport and
4 retained-state sources. All 852 skips match. No captured scratch value is
used as a simulation input.

The full original run captures five player updates/four rider updates with
zero modeled physics differences; 56,403 visual word differences remain.
This short run cannot establish long trajectory parity. The original was
restarted before capture: Windows PID 288, player 0x051c8d40. No previous-process
checkpoint was restored. All 167 hooks independently verified restored, with
no debugger attached.

Source and regression:
- src/physics/mcm/render-upload.js
- scripts/mcm-reference/analyze-render-upload.mjs
- scripts/mcm-reference/capture-render-heap.c (adds metadata at existing hooks)
- tests/mcm-render-upload.test.js

Use the capture and cleanup commands in mcm-render-heap-recovery.md. The
additional metadata observes state-input, state-prepared, state-declaration
and upload-input without adding breakpoint sites.

Still required: the remaining upload gates,
temporary-buffer lifetime/free conditions, and shared-world particle
visibility/order. The transform-upload model is isolated; preview handling
does not invoke it yet. A transform upload alone does not prove a free or
an overlapping scratch write.

## Viewport matrix arithmetic

The pre-transformed path's matrix calculation is now recovered in
`src/physics/mcm/render-viewport.js`. The pinned instruction block at RVA
0x1bddc6 runs through 0x1bdef6 (including the 0x1c1306 branch), stopping before
the upload at 0x1bf964. It reads viewport x/y/width/height at state +0xade4,
and raw state +0x2300 / device +0x28 fields for the depth diagonal. The latter
fields retain their offset names because their semantics are not established.

Each SSE arithmetic instruction rounds to binary32. Sign inversion is a sign
bit XOR. Generated invalid results use negative indefinite NaN, while quiet
input NaNs preserve operand selection. Plain JavaScript arithmetic produced
3,600 NaN-sign differences in the edge fixture; the recovered operations remove
them. No half-pixel correction or viewport depth-range input appears here.

`oracle-render-viewport.c` loads the pinned DLL in a separate process without
resolving imports, guards entry/exit instructions, and redirects only the exit
to collect its 16 output words. It does not attach to or patch the running game.
The DLL SHA-256 is
`25feee6100619bd123fc00568d4e5107a3a20d60f62d160e12c368731fa32f1c`.
MXCSR is 0x1f80. The fixture preserves raw inputs and outputs:

- 4,096 randomized finite cases / 65,536 words.
- 10,000 Cartesian edge cases / 160,000 words, including signed zeros,
  infinities, quiet NaNs with distinct payloads, and minimum subnormal values.

All 225,536 words match, and fresh native reruns reproduced both saved output
files byte for byte. Signaling NaNs and alternate MXCSR modes are outside this
coverage. The subsequent live validation below joins this arithmetic to actual
uploads. It does not yet close the shared stack writer schedule or change
preview handling.

A subsequent live-payload capture attempt on PID 288 stopped after one record,
before renderer observations. The retained launcher reported game exit
0x80000004. The pre-capture check verified all 167 instructions and no debugger;
the post-capture check could not read the exited process and therefore does not
prove restoration. No payload observations from that attempt are used here.
The fresh-process capture below recovered this validation path.

### Fresh live payload validation

After restarting the original through its menus, a fresh five-frame capture
completed all ten requested records. The capture adds input/payload reads at
existing hooks without adding breakpoint sites. It records state +0x2300,
the command stream's device +0x28, and all 16 upload words. The command stream
comes from apply argument 1 +0x12d0; its device pointer is at +8.

All 12 pre-transformed uploads match all 192 computed words. The regression
also checks matching input/frame ownership, command-stream identity, byte count,
and the derived stack payload address. Inputs are captured at apply entry;
observed output words are comparison targets only. This is one live viewport
configuration, supplemented by the broader isolated cases above.

The independent verifier confirmed all 167 instructions restored and
`debugger=0 clean=1`. The fixture is
`tests/fixtures/mcm/render-viewport-live-wine11.json.br`; the capture source
remains `scripts/mcm-reference/capture-render-heap.c`. The earlier failed
attempt is retained as a separate failure, not included in this evidence.
The retained replay of these five bike/four rider updates has zero modeled
physics differences and 70,318 visual differences (70,296 particle words).
It does not reach or resolve the older frame-38 steering failure.

To reproduce, decompress `tests/fixtures/mcm/render-viewport-wine11.json.br`,
decode each group's base64 `input` to a file, compile the oracle with
`i686-w64-mingw32-gcc -O0 -Wall -Wextra -Werror`, and invoke under the pinned
Wine prefix with three arguments: pinned DLL path, input path, output path.
Each input record contains four float32 viewport values and two uint32 flags
(24 bytes); each output record is 16 float32 words (64 bytes). Compare the
output to the group's decoded `output`. Run
`node --test tests/mcm-render-viewport.test.js` for the recovered model.
