// Observe the host-copy branch and its register-save stack write. No CALL/REP hooks.
#define MCM_CAPTURE_HUD_LINE_STORES 1
#define MCM_CAPTURE_RENDER_BINDING 1
#define MCM_CAPTURE_BINDING_GATES 1
#define MCM_CAPTURE_UPLOAD_COPY 1
#include "capture-render-heap.c"
