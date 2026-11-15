// Combined 42-frame scene/writer trace with indexed draw backend boundaries.
// All 213 guarded sites are non-CALL/non-REP instructions.
#define MCM_CAPTURE_HUD_LINE_STORES 1
#define MCM_CAPTURE_RENDER_BINDING 1
#define MCM_CAPTURE_BINDING_GATES 1
#define MCM_CAPTURE_UPLOAD_COPY 1
#define MCM_CAPTURE_INDEXED_SUBMIT 1
#define MCM_CAPTURE_WORLD_WRITERS 1
#define MCM_CAPTURE_SCENE_TREE 1
#include "capture-render-heap.c"
