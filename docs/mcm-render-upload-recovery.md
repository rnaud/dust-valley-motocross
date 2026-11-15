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

Still required: viewport-matrix payload recovery, the remaining upload gates,
temporary-buffer lifetime/free conditions, and shared-world particle
visibility/order. The transform-upload model is isolated; preview handling
does not invoke it yet. A transform upload alone does not prove a free or
an overlapping scratch write.
