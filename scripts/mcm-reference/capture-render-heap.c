#if defined(MCM_CAPTURE_SHADER_CACHE) && !defined(MCM_CAPTURE_SHADER_APPLY)
#error Shader cache capture requires shader apply hooks
#endif
#if defined(MCM_CAPTURE_SHADER_APPLY) && !defined(MCM_CAPTURE_INDEXED_SUBMIT)
#error Shader apply capture requires indexed submit hooks to preserve hook indices
#endif
#if defined(MCM_CAPTURE_INDEXED_SUBMIT) && !defined(MCM_CAPTURE_UPLOAD_COPY)
#error Indexed submit capture requires upload copy hooks to preserve hook indices
#endif
#if defined(MCM_CAPTURE_UPLOAD_COPY) && !defined(MCM_CAPTURE_BINDING_GATES)
#error Upload copy capture requires binding gates to preserve hook indices
#endif
#ifdef MCM_CAPTURE_WORLD_WRITERS
#define MCM_RENDER_RECORD_COUNT 84
#else
#define MCM_RENDER_RECORD_COUNT 10
#endif
#if defined(MCM_CAPTURE_BINDING_GATES) && (!defined(MCM_CAPTURE_RENDER_BINDING) || !defined(MCM_CAPTURE_HUD_LINE_STORES))
#error Binding gates require binding and HUD hooks to preserve hook indices
#endif
// Pinned Wine stack-writer diagnostic: 167 guarded hooks, exactly 10 records.
// See docs/mcm-render-heap-recovery.md. Not a whole-world replay.
// Experimental controlled player replay for the pinned retail executable.
// MCM_SCRIPTED enables dt=.02, throttle on frames [0,40), negative .25 steering
// on frames [20,70), and RNG seed 12345. Renderer cameras remain observed inputs.
// MCM_RIDER_TIMING observes the separate player rider update at 0x40e990.
// MCM_FIXED_RIDER additionally forces its argument to .02 (requires SCRIPTED).
// Incoming rider timing remains observable; this does not control the world.
// Every 400 frames it restores the initial local checkpoint. This is NOT a full
// world save: opponent, camera, rendering and timer state are deliberately not
// restored, and any resulting divergence must remain visible in comparisons.
// Captures the scheduler entry and the end of the whole bike update.
// Includes the proven 0xcc8-byte bike allocation and known engine prefix. The complete 0x1f0-byte engine is checkpointed.
// This is NOT a complete state/replay format: only the documented local blocks
// are followed. Rider animation assets and the complete world remain outside it.
// Breakpoints slow execution and consequently change the observed frame deltas.
#include <windows.h>
#include <stdio.h>
#include <stdint.h>
#include <stdlib.h>
#define MCM_ANIMATION_EMBEDDED
#include "capture-animation-assets.c"
#undef MCM_ANIMATION_EMBEDDED
#include "capture-collision-world.c"
#include "capture-frame-environment.c"

static DWORD addresses[] = {0x4a54b6, 0x4ad0e1, 0x4ad5a2, 0x4bf195, 0x40e990, 0x42ce38, 0x4acfd8, 0x4acaad, 0x40f99c, 0x4a5c8a,0x43b200,0x43b334,0x43b216,0x44faf0,0x7a83308b,0x423a7d,0x423f24,0x423f58,0x423b22,0x423b63,0x423bc9,0x4a52c0,0x44ff95,0x44feec,0x467fcb,0x467fd0,0x467fd8,0x4743f8,0x467f40,0x467c58,0x467c64,0x467d2f,0x467d3a,0x467eea,0x467f03,0x4206f2,0x4206f9,0x43b402,0x43b4b5,0x43b582,0x43b840,0x43b87b,0x43b8ad,0x43b8e7,0x7aa9ea3f,0x7aa9eaa5,0x7aa9eae1,0x7aa9eb19,0x7aa9eb4f,0x7aa9eb76,0x7aa9eb88,0x7aa9eb9a,0x7aa9ebb4,0x7aa9ebd8,0x7aa9ebf6,0x7aa9ebfe,0x7aa9ec3d,0x7a92d500,0x7a92d547,0x7a92da0e,0x7a92da41,0x7a92db2b,0x7a92db3c,0x7a92db4d,0x7a92dd4e,0x7a92dd88,0x7a92dfaf,0x7a92dff3,0x7a92e070,0x7a92e15c,0x7a92e3a5,0x7a92e402,0x7a92e6d1,0x7a92e79e,0x7a92e86e,0x7a92e931,0x7a92e9fd,0x7a92eacd,0x7a92ec30,0x7a92ec7e,0x7a92ecad,0x7a92ed1c,0x7a92eda4,0x7a92ee18,0x7a92ee60,0x7a92ee8f,0x7a92ef04,0x7a92ef84,0x7a92eff8,0x7a92f040,0x7a92f06f,0x7a92f0e0,0x7a92f13e,0x7a92f16d,0x7a92f1d0,0x7a92f3e6,0x7a92f468,0x7a92f4a8,0x7a92f58b,0x7a92f5b7,0x7a92f602,0x7a92f640,0x7a92f677,0x7a92f7f5,0x7a92f830,0x7a92f895,0x7a92f8ba,0x7a92f8ca,0x7a92f994,0x7a92fa12,0x7a92fa7a,0x7a92faaa,0x7a92fb61,0x7a92fba4,0x7a92fd96,0x7a92fdad,0x7a92fe06,0x7a92fe3c,0x7a92feca,0x7a92ff0d,0x7a92ff42,0x7a92ff7e,0x7a92ffd9,0x7a93001a,0x7a93004f,0x7a930104,0x7a930179,0x7a930249,0x7a930374,0x7a93044b,0x7a9304b4,0x7a936e00,0x7a9356c0,0x7a92f98c,0x7a93572a,0x7a93578e,0x7a9357b2,0x7a9357d4,0x7a935809,0x7a93585a,0x7a935877,0x7a9359db,0x7a935a06,0x7a935a65,0x7a935a75,0x7a935ae7,0x7a936f08,0x7a936f1f,0x7a936f3e,0x7a936fae,0x7a93a180,0x7a93a1d8,0x7a93a237,0x7a93a246,0x7a926330,0x7a92638d,0x7a9263c7,0x7a9263d9,0x7a926423,0x7a90ab70,0x7a909094,0x7a9090dc,0x7a9090f5,0x7a9263d3,0x7a926460,0x7bf904f0,0x7bf904f3
#ifdef MCM_CAPTURE_HUD_LINE_STORES
,0x7b94240d,0x7b942f84,0x7b942f8e
#endif

#ifdef MCM_CAPTURE_RENDER_BINDING
,0x7a925d50,0x7a7d12e0,0x7a925d98
#endif
#ifdef MCM_CAPTURE_BINDING_GATES
,0x7a935050
#endif
#ifdef MCM_CAPTURE_UPLOAD_COPY
,0x7a912838,0x7a91285b
#endif
#ifdef MCM_CAPTURE_INDEXED_SUBMIT
,0x7a7d2400,0x7a7d2481,0x7a7d24cc,0x7a7d254d,0x7a7d2562,0x7a7d25c2,0x7a7d2632,0x7a7d273b,0x7a7d274b,0x7a7d276f,0x7a7d27a5,0x7a7d27cc,0x7a7d27ee,0x7a7d2804,0x7a7d2814,0x7a7d286f,0x7a7d289e,0x7a7d28ef,0x7a7d29ed,0x7a7d2a32,0x7a7d2a52,0x7a7d2a9c,0x7a7d2aa8,0x7a7d2b04,0x7a7d2b48,0x7a7d2b85,0x7a7d2bb9,0x7a7d2be9,0x7a7d2c01,0x7a7d2c38,0x7a7d2c6e,0x7a9241c0,0x7a9242f3,0x7a924304,0x7a933f54,0x7a934551,0x7a93459a
#endif
#ifdef MCM_CAPTURE_SHADER_APPLY
,0x7a84c4c0,0x7a84c534,0x7a84c55e,0x7a84c59b,0x7a84c5cb,0x7a84c5d7,0x7a84c601,0x7a84c663,0x7a84c6a3,0x7a84c6d2,0x7a84c6f5,0x7a84c71f,0x7a84c766,0x7a84c7a6,0x7a84c7dc,0x7a84c818,0x7a84c847,0x7a84c886,0x7a859d00
#endif
#ifdef MCM_CAPTURE_SHADER_CACHE
,0x7a843526,0x7a84355b,0x7a84355f,0x7a843567,0x7a8438c0,0x7a845a98,0x7a85c5e0,0x7a85c65b,0x7a85c6cf,0x7a8a8260
#endif
};
static BYTE expected[][6] = {{0xd9, 0x86, 0xc8, 0x08, 0, 0},
                                  {0x8b, 0x86, 0xf8, 0x04, 0, 0}, {0x85, 0xc0}, {0x8b, 0x48, 0x14}, {0x8b,0x44,0x24,0x04}, {0x8b,0x44,0xbe,0x08}, {0x8d,0x86,0x10,0x05,0,0}, {0x8b,0xf8}, {0xb8,1,0,0,0}, {0x85,0xc0},{0x83,0xec,0x1c},{0xb8,1,0,0,0},{0xb8,1,0,0,0},{0x81,0xec,0xd8,0,0,0},{0x0f,0x17,0x60,0x08},{0x8b,0xd,0xb4,0x4f,0x4e,0x0},{0x8d,0x7c,0x24,0x2c},{0x4b},{0xb8,0x1,0x0,0x0,0x0},{0xd9,0x86,0x0,0x1,0x0,0x0},{0x33,0xc0},{0x81,0xec,0xe8,0xb,0x0,0x0},{0x5d},{0x85,0xc0},{0x8b,0xce},{0x8b,0x4e,0x8},{0x8b,0x86,0x64,0x4,0x0,0x0},{0x85,0xc0},{0x83,0xec,0x4},{0x8b,0x4b,0x8},{0x85,0xc0},{0x8b,0x8b,0x30,0x4,0x0,0x0},{0x8b,0x8b,0xe4,0x2,0x0,0x0},{0x8b,0x43,0x8},{0xb8,0x1,0x0,0x0,0x0},{0x8b,0x06},{0x85,0xc0},{0x33,0xd2},{0xc7,0x46,0x34,0x0,0x0,0x0},{0x8b,0x46,0x34},{0x6a,0x0},{0x8b,0x46,0x1c},{0x8b,0x8e,0x84,0x1f,0x0,0x0},{0xb8,0x1,0x0,0x0,0x0},{0x89,0x45,0xe8},{0xf,0xb7,0x4d,0xd8},{0x85,0xc0},{0x85,0xc0},{0x85,0xc0},{0x8b,0x45,0xe0},{0x89,0x44,0x24,0x4},{0x8b,0x45,0xe4},{0x8b,0x46,0x30},{0x8b,0x46,0x30},{0x89,0x34,0x24},{0x8b,0x45,0x14},{0x83,0xc4,0x4c},{0x55},{0x8b,0x45,0xc},{0x85,0xc0},{0x80,0x7c,0x24,0x3c,0x0},{0x8b,0x53,0x4},{0x8b,0x53,0x8},{0x89,0x84,0x24,0xa8,0x0,0x0},{0x85,0xc0},{0x83,0x44,0x24,0x50,0x1},{0x8b,0x54,0x24,0x28},{0x8b,0x45,0x8},{0x8b,0x54,0x24,0x30},{0x8b,0x54,0x24,0x30},{0x8b,0x54,0x24,0x30},{0x8b,0x54,0x24,0x30},{0x39,0xfe},{0x39,0xfe},{0x39,0xfe},{0x39,0xfe},{0x8b,0x44,0x24,0x38},{0x8b,0x44,0x24,0x38},{0xa8,0x8},{0x89,0x5c,0x24,0x10},{0x39,0xde},{0x8b,0x4c,0x24,0x3c},{0x39,0x5c,0x24,0x50},{0xa8,0x8},{0x89,0x74,0x24,0x10},{0x39,0x74,0x24,0x50},{0x8b,0x4c,0x24,0x3c},{0x39,0x5c,0x24,0x50},{0xa8,0x8},{0x89,0x74,0x24,0x10},{0x39,0x74,0x24,0x50},{0xa8,0x8},{0x89,0x5c,0x24,0x10},{0x39,0xde},{0x8b,0x43,0x18},{0x85,0xc0},{0x8b,0x43,0x14},{0x8b,0x43,0x10},{0x85,0xc0},{0x8b,0x45,0x8},{0x85,0xc0},{0x89,0x74,0x24,0x1c},{0x8b,0x45,0x8},{0x39,0xfb},{0x8b,0x54,0x24,0x3c},{0x8b,0x4c,0x24,0x2c},{0x8b,0x44,0x24,0x3c},{0x85,0xdb},{0x8b,0x45,0xc},{0x39,0xf7},{0x8b,0x44,0x24,0x48},{0x8b,0x4c,0x24,0x34},{0x39,0xfe},{0x8b,0x44,0x24,0x50},{0x85,0xc0},{0x8b,0x4c,0x24,0x40},{0x85,0xc0},{0x84,0xc0},{0x8b,0xbb,0x90,0x18,0x0,0x0},{0x8b,0x45,0x8},{0x85,0xc0},{0x85,0xc0},{0x8b,0x45,0xc},{0x83,0xff,0x8},{0x8b,0x45,0xc},{0x8b,0x45,0xc},{0x8b,0x45,0xc},{0x8b,0x45,0xc},{0x8b,0x45,0xc},{0x8b,0x45,0x8},{0x8b,0x45,0xc},{0x55},{0x8d,0x4c,0x24,0x4},{0x89,0x4,0x24},{0x84,0xc0},{0x8d,0x75,0xcc},{0x8b,0x45,0xc4},{0x8d,0x65,0xf0},{0x89,0xc2},{0xc7,0x44,0x24,0x8,0x0,0x0},{0x8b,0x4b,0xc},{0x8b,0x83,0x8c,0x1c,0x0,0x0},{0x8b,0x75,0xbc},{0x8b,0x7},{0x8d,0x65,0xf0},{0x8b,0x43,0x4},{0x8b,0x3},{0x8b,0x55,0x10},{0x8d,0x65,0xf4},{0x85,0xc0},{0x55},{0x8b,0x4c,0x24,0x4c},{0x8b,0x3},{0x8d,0x65,0xf4},{0x55},{0x8b,0x55,0xf0},{0x8b,0x46,0x3c},{0xf6,0x43,0x2c,0x4},{0xeb,0xa2},{0x55},{0x8b,0x4b,0x3c},{0x8b,0x44,0x24,0x1c},{0x8d,0x65,0xf4},{0x89,0x34,0x24},{0x8b,0x43,0x28},{0x89,0x45,0xec},{0xf6,0xc2,0x1}
#ifdef MCM_CAPTURE_HUD_LINE_STORES
,{0x8b,0xb5,0xa0,0xf7,0xff,0xff},{0xc7,0x85,0x48,0xf7,0xff,0xff},{0xe9,0xcd,0xf6,0xff,0xff}
#endif

#ifdef MCM_CAPTURE_RENDER_BINDING
,{0x55,0x89,0xe5,0x56,0x53},{0x55,0x89,0xe5,0x57,0x56},{0x83,0x7b,0x04,0x05}
#endif
#ifdef MCM_CAPTURE_BINDING_GATES
,{0x55,0x89,0xe5,0x56,0x53}
#endif
#ifdef MCM_CAPTURE_UPLOAD_COPY
,{0x8b,0x03},{0x39,0xde}
#endif
#ifdef MCM_CAPTURE_INDEXED_SUBMIT
,{0x55},{0x89,0xc2},{0x89,0xc6},{0x8b,0x53,0x4},{0x8b,0x85,0x5c,0xff,0xff,0xff},{0x8b,0x85,0x5c,0xff,0xff,0xff},{0x8b,0x85,0x54,0xff,0xff,0xff},{0xc7,0x44,0x24,0x4,0x6c,0x1},{0x8b,0x85,0x60,0xff,0xff,0xff},{0x39,0xdf},{0x8b,0x87,0xb4,0x1,0x0,0x0},{0x31,0xff},{0x89,0x5c,0x24,0x8},{0xc7,0x44,0x24,0x4,0xf7,0xff},{0x8b,0x93,0xbc,0x0,0x0,0x0},{0x8b,0xbe,0xf0,0x3,0x0,0x0},{0x39,0xde},{0x39,0xde},{0x39,0xfe},{0x8b,0x95,0x58,0xff,0xff,0xff},{0x8b,0xbd,0x50,0xff,0xff,0xff},{0x89,0x5c,0x24,0x4},{0x8b,0x85,0x54,0xff,0xff,0xff},{0xf6,0x5,0xa8,0x60,0x98,0x7a},{0xf6,0x5,0xa8,0x60,0x98,0x7a},{0x8b,0xbe,0xfc,0x3,0x0,0x0},{0x8b,0x85,0x6c,0xff,0xff,0xff},{0x83,0xec,0x8},{0x8b,0x46,0x3c},{0xa8,0x2},{0xe9,0x3e,0x4,0x0,0x0},{0x55},{0x89,0x7c,0x24,0x8},{0x83,0xc4,0x10},{0x8b,0x43,0x4},{0xf,0xb6,0x54,0x24,0x18},{0x8b,0x3}
#endif
#ifdef MCM_CAPTURE_SHADER_APPLY
,{0x55},{0x8b,0x93,0xfc,0x3,0x0,0x0},{0xf6,0x43,0x5d,0x8},{0xf,0xb6,0x43,0x50},{0x8b,0x47,0x54},{0x8b,0x45,0xf0},{0x8b,0x45,0xf0},{0x8b,0x55,0xf0},{0x8b,0x55,0xf0},{0x89,0xf1},{0xe9,0x6e,0xfe,0xff,0xff},{0x8b,0x55,0xe0},{0x8b,0x55,0xf0},{0xf,0xb6,0x5,0xe0,0x61,0x98},{0x8b,0x55,0xf0},{0x8b,0x55,0xf0},{0x8b,0x55,0xf0},{0xf,0xb6,0x5,0xe0,0x61,0x98},{0x57}
#endif
#ifdef MCM_CAPTURE_SHADER_CACHE
,{0x8b,0xbd,0x2c,0xff,0xff,0xff},{0x85,0xc0},{0x8b,0x85,0x18,0xff,0xff,0xff},{0x8d,0x65,0xf4},{0x8b,0x85,0x40,0xff,0xff,0xff},{0xe9,0x11,0xf3,0xff,0xff},{0x55},{0x8d,0x4b,0x18},{0x8b,0x47,0x8},{0x55}
#endif
};
static unsigned lengths[] = {6, 6, 2, 3, 4, 4, 6, 2, 5, 2, 3, 5, 5, 6, 4,6,4,1,5,6,2,6,1,2,2,3,6,2,3,3,2,6,6,3,5,2,2,2,6,3,2,3,6,5,3,4,2,2,2,3,4,3,3,3,3,3,3,1,3,2,5,3,3,6,2,5,4,3,4,4,4,4,2,2,2,2,4,4,2,4,2,4,4,2,4,4,4,4,2,4,4,2,4,2,3,2,3,3,2,3,2,4,3,2,4,4,4,2,3,2,4,4,2,4,2,4,2,2,6,3,2,2,3,3,3,3,3,3,3,3,3,1,4,3,2,3,3,3,2,6,3,6,3,2,3,3,2,3,3,2,1,4,2,3,1,3,3,4,2,1,3,4,3,3,3,3,3
#ifdef MCM_CAPTURE_HUD_LINE_STORES
,6,6,5
#endif

#ifdef MCM_CAPTURE_RENDER_BINDING
,5,5,4
#endif
#ifdef MCM_CAPTURE_BINDING_GATES
,5
#endif
#ifdef MCM_CAPTURE_UPLOAD_COPY
,2,2
#endif
#ifdef MCM_CAPTURE_INDEXED_SUBMIT
,1,2,2,3,6,6,6,6,6,2,6,2,4,6,6,6,2,2,2,6,6,4,6,6,6,6,6,3,3,2,5,1,4,3,3,5,2
#endif
#ifdef MCM_CAPTURE_SHADER_APPLY
,1,6,4,4,3,3,3,3,3,2,5,3,3,6,3,3,3,6,1
#endif
#ifdef MCM_CAPTURE_SHADER_CACHE
,6,2,6,3,6,5,1,3,3,1
#endif
};
#if defined(MCM_CAPTURE_SHADER_CACHE)
#define MCM_RENDER_HOOK_COUNT 242
#elif defined(MCM_CAPTURE_SHADER_APPLY)
#define MCM_RENDER_HOOK_COUNT 232
#elif defined(MCM_CAPTURE_INDEXED_SUBMIT)
#define MCM_RENDER_HOOK_COUNT 213
#elif defined(MCM_CAPTURE_UPLOAD_COPY)
#define MCM_RENDER_HOOK_COUNT 176
#elif defined(MCM_CAPTURE_BINDING_GATES)
#define MCM_RENDER_HOOK_COUNT 174
#elif defined(MCM_CAPTURE_RENDER_BINDING) && defined(MCM_CAPTURE_HUD_LINE_STORES)
#define MCM_RENDER_HOOK_COUNT 173
#elif defined(MCM_CAPTURE_HUD_LINE_STORES)
#define MCM_RENDER_HOOK_COUNT 170
#else
#define MCM_RENDER_HOOK_COUNT 167
#endif
static BYTE saved[MCM_RENDER_HOOK_COUNT];
static int armed[MCM_RENDER_HOOK_COUNT];
_Static_assert(sizeof(addresses)/sizeof(addresses[0])==MCM_RENDER_HOOK_COUNT,"hook addresses");
_Static_assert(sizeof(lengths)/sizeof(lengths[0])==MCM_RENDER_HOOK_COUNT,"hook lengths");
_Static_assert(sizeof(expected)/sizeof(expected[0])==MCM_RENDER_HOOK_COUNT,"hook instructions");
static HANDLE process;
static int capture_effects,capture_filter,capture_frame_rider,capture_return;
static DWORD effect_query_count,effect_query_result;
static BYTE effect_query_start[12],effect_query_output[12];
static int capture_tires,capture_motion,capture_controls,capture_loop_rider,capture_finish;
static char frame_capture_id[17];
static int scripted, capture_stack, capture_rider_timing, fixed_rider, capture_collision, checkpoint_collision_callbacks, checkpoint_collision_pairs;
static unsigned hook_count=4;
static DWORD rider_update_count, rider_dt_bits, rider_observed_dt_bits;
static int capture_contact,contact_exported;
static const char*export_boundary="player-frame-entry";
static DWORD capture_frame;
static DWORD player_frame, requested_throttle, requested_brake, requested_steer_bits, pass, random_state=12345;
static int player_active;
static FILE *render_out;static DWORD observed_player,scratch_address;static int store_pending;static DWORD draw_actors[64],draw_depth;

static int read_memory(DWORD address, void *buffer, SIZE_T size) {
    SIZE_T count;
    return ReadProcessMemory(process, (void *)(uintptr_t)address, buffer, size, &count) && count == size;
}
#include "capture-register-heap.c"


typedef struct {DWORD address, size; BYTE bytes[0xcc8];} Block;
static Block blocks[256]; static unsigned block_count;
static int save_block(DWORD address, DWORD size) {
    if(!address || size>sizeof blocks[0].bytes || block_count>=256)return 0;
    for(unsigned i=0;i<block_count;i++)if(blocks[i].address==address)return blocks[i].size==size;
    Block *b=&blocks[block_count++];b->address=address;b->size=size;
    return read_memory(address,b->bytes,size);
}
static int save_tree(DWORD address) {
    if(!address)return 1;
    for(unsigned i=0;i<block_count;i++)if(blocks[i].address==address)return 1;
    DWORD child,sibling;
    return save_block(address,0x114)&&read_memory(address+0x10c,&child,4)&&read_memory(address+0x110,&sibling,4)&&save_tree(child)&&save_tree(sibling);
}
// Shared object prefix used by animation dispatch: count/table +230/+234,
// root +434, 0x40-byte components with node +34 and position flag +38.
static int save_components(DWORD object) {
    DWORD count,table,root;
    if(!read_memory(object+0x230,&count,4)||count<1||count>32||
       !read_memory(object+0x234,&table,4)||!save_block(table,count*0x40)||
       !read_memory(object+0x434,&root,4)||!save_tree(root))return 0;
    for(DWORD i=0;i<count;i++){DWORD node;if(!read_memory(table+i*0x40+0x34,&node,4)||!node||!save_tree(node))return 0;}
    return 1;
}
static int checkpoint(DWORD bike,int restore) {
    if(restore){for(unsigned i=0;i<block_count;i++){SIZE_T n;Block*b=&blocks[i];if(!WriteProcessMemory(process,(void*)(uintptr_t)b->address,b->bytes,b->size,&n)||n!=b->size)return 0;}return 1;}
    // Rider allocation: 0x4a3a6b..0x4a3aa9, constructor 0x40d400.
    static const DWORD slots[][2]={{0x874,0x3ac},{0x8d8,0x44},{0x8dc,0x50},{0x8e0,0x50},{0x8e4,0x60},{0x8e8,0x60},{0x8ec,0x60},{0x8f0,0x1f0},{0x8f8,0x10},{0x8fc,0x10},{0x900,0x10},{0x904,0x10}};
    if(!save_block(bike,0xcc8))return 0;
    for(unsigned i=0;i<sizeof slots/sizeof slots[0];i++){DWORD ptr;if(!read_memory(bike+slots[i][0],&ptr,4))return 0;if(ptr&&!save_block(ptr,slots[i][1]))return 0;}
    if(checkpoint_collision_callbacks){DWORD rider,collider;
        if(!read_memory(bike+0x874,&rider,4)||!read_memory(rider+0x34,&collider,4)||!collider||!save_block(collider+0x108,8))return 0;
        if(checkpoint_collision_pairs){DWORD manager,id;
            if(!read_memory(collider+0x98,&manager,4)||!read_memory(collider,&id,4)||!manager||id>=60||!save_block(manager+0xf8+id*240,240))return 0;
            for(unsigned i=0;i<60;i++)if(i!=id&&!save_block(manager+0xf8+(i*60+id)*4,4))return 0;
        }
    }
    DWORD proxy,vtable,engine,filter,contact_component,contact_node;
    return save_components(bike)&&read_memory(bike+0x8ec,&contact_component,4)&&
        read_memory(contact_component+0x50,&contact_node,4)&&contact_node&&save_tree(contact_node)&&
        read_memory(bike+0xc8c,&proxy,4)&&
        read_memory(proxy,&vtable,4)&&vtable==0x4d7b14&&save_block(proxy,0x438)&&save_components(proxy)&&
        read_memory(bike+0x8f0,&engine,4)&&read_memory(engine+4,&filter,4)&&save_block(filter,0x10);
}

// Same-process local checkpoint import. Discover the live block layout first,
// then validate the whole file before any process write. No allocation/remapping.
static int import_checkpoint(DWORD bike) {
    const char *path=getenv("MCM_INITIAL_CHECKPOINT");
    if(!path||!*path)return 1;
    FILE *in=fopen(path,"rb");if(!in)return 0;
    BYTE magic[8];DWORD owner,count;static Block incoming[256];int ok=0;
    if(fread(magic,1,8,in)!=8||memcmp(magic,"MCMCP01",8)||
       fread(&owner,4,1,in)!=1||owner!=bike||fread(&count,4,1,in)!=1||count!=block_count)goto end;
    for(unsigned i=0;i<count;i++){
        Block *b=&incoming[i];
        if(fread(&b->address,4,1,in)!=1||fread(&b->size,4,1,in)!=1||
           b->address!=blocks[i].address||b->size!=blocks[i].size||
           fread(b->bytes,1,b->size,in)!=b->size)goto end;
    }
    if(fgetc(in)!=EOF||ferror(in)||incoming[0].address!=bike||
       memcmp(incoming[0].bytes,blocks[0].bytes,4))goto end;
    memcpy(blocks,incoming,count*sizeof(Block));ok=1;
end:
    fclose(in);
    if(!ok){fprintf(stderr,"Initial checkpoint layout or data invalid; no imported memory written.\n");return 0;}
    return checkpoint(bike,1);
}


#include "capture-particle-pool.c"
static FILE*retained_trace_out;
static DWORD retained_event_sequence,pool_delta_bits,pool_tick_active;
static int trace_retained_pool(const char*phase,DWORD pool){
 if(!retained_trace_out||!player_frame||pool!=retained_pool_address)return 1;
 DWORD world,paused;if(!read_memory(0x4e4fb4,&world,4)||!read_memory(world+0x132c,&paused,4))return 0;
 fprintf(retained_trace_out,"{\"phase\":\"%s\",\"eventSequence\":%lu,\"frame\":%lu,\"playerActive\":%d,\"paused\":%lu,\"dtBits\":%lu",phase,retained_event_sequence++,player_frame-1,player_active,paused,pool_delta_bits);
 if(!capture_retained_particle_pool(retained_trace_out,pool))return 0;
 fprintf(retained_trace_out,"}\n");fflush(retained_trace_out);return 1;
}
static int trace_retained_rider(const char*phase,DWORD rider){
 DWORD bike,ai,child,world,paused,globalDt,link,owner,gate=0,vtable,update;BYTE r[0x3ac],bytes[0x618];
 if(!read_memory(rider+0x15c,&bike,4)||!read_memory(bike+0x614,&ai,4))return 0;
 if(ai||(!player_frame&&strcmp(phase,"initial-rider")))return 1;
 if(!fixed_rider||!read_memory(rider,r,sizeof r)||!read_memory(rider+0x14,&child,4)||!child||!read_memory(child,bytes,sizeof bytes)||!read_memory(0x4e4fb4,&world,4)||!read_memory(world+0x132c,&paused,4)||!read_memory(0x4edec4,&globalDt,4)||!read_memory(rider+0x1c,&link,4)||!read_memory(child,&vtable,4)||!read_memory(vtable+0x2c,&update,4))return 0;
 if(link&&(!read_memory(link,&owner,4)||!read_memory(owner+0x35c,&gate,4)))return 0;
 FILE*out=retained_trace_out;if(!out){out=fopen(getenv("MCM_RETAINED_RIDER_TRACE"),"wx");if(!out)return 0;retained_trace_out=out;}
 fprintf(out,"{\"eventSequence\":%lu,\"phase\":\"%s\",\"frame\":%lu,\"bike\":%lu,\"rider\":%lu,\"playerActive\":%d,\"address\":%lu,\"paused\":%lu,\"globalDtBits\":%lu,\"ownerGate\":%lu,\"updateAddress\":%lu,\"dtBits\":1017370378,\"hex\":\"",retained_event_sequence++,phase,player_frame?player_frame-1:0,bike,rider,player_active,child,paused,globalDt,gate,update);
 for(unsigned i=0;i<sizeof bytes;i++){fprintf(out,"%02x",bytes[i]);}fprintf(out,"\",\"riderHex\":\"");
 for(unsigned i=0;i<sizeof r;i++){fprintf(out,"%02x",r[i]);}
 DWORD pool;if(!read_memory(child+0x34,&pool,4))return 0;
 fprintf(out,"\"");if(!capture_retained_particle_pool(out,pool))return 0;
 fprintf(out,"}\n");fflush(out);return 1;
}

// Export only blocks already read by the existing partial checkpoint. This does
// not expand the set of objects restored between controlled passes.
static int export_checkpoint(DWORD bike) {
    const char *path=getenv("MCM_CHECKPOINT");
    const char *animations=getenv("MCM_ANIMATIONS");
    const char *world=getenv("MCM_COLLISION_WORLD");
    const char *environment=getenv("MCM_FRAME_ENVIRONMENT");
    if(getenv("MCM_COLLISION_ACTORS")&&!(world&&*world))return 0;
    if(getenv("MCM_FRAME_INPUT")&&!(environment&&*environment))return 0;
    if(!path||!*path)return !(animations&&*animations)&&!(world&&*world)&&!(environment&&*environment);
    char capture_id[17]={0};
    if((animations&&*animations)||(world&&*world)||(environment&&*environment)){
        LARGE_INTEGER stamp;if(!QueryPerformanceCounter(&stamp))return 0;
        snprintf(capture_id,sizeof capture_id,"%08lx%08lx",(DWORD)stamp.HighPart,stamp.LowPart);
        if(environment&&*environment&&!capture_mcm_frame_environment(process,bike,environment,capture_id,player_frame,export_boundary))return 0;
        if(animations&&*animations&&!capture_mcm_animation_assets(process,bike,animations,capture_id))return 0;
        if(world&&*world&&!capture_mcm_collision_world(process,bike,world,capture_id,player_frame,export_boundary))return 0;
    }
    DWORD rider;if(!read_memory(bike+0x874,&rider,4)||!trace_retained_rider("initial-rider",rider))return 0;
    memcpy(frame_capture_id,capture_id,sizeof frame_capture_id);
    FILE *out=fopen(path,"wx");if(!out)return 0;
    fprintf(out,"{\"schemaVersion\":1,\"kind\":\"mcm-partial-local-checkpoint\",\"bikeAddress\":%lu,\"playerFrame\":%lu,\"blockCount\":%u,\"blocks\":[",bike,player_frame,block_count);
    for(unsigned i=0;i<block_count;i++){
        const Block*b=&blocks[i];
        fprintf(out,"%s{\"address\":%lu,\"size\":%lu,\"hex\":\"",i?",":"",b->address,b->size);
        for(DWORD j=0;j<b->size;j++)fprintf(out,"%02x",b->bytes[j]);
        fprintf(out,"\"}");
    }
    fprintf(out,"]");if(capture_id[0])fprintf(out,",\"captureId\":\"%s\",\"captureBoundary\":\"%s\"",capture_id,export_boundary);
    fprintf(out,"}\n");const int failed=ferror(out);return fclose(out)==0&&!failed;
}

// Export a later observed boundary without replacing the initial replay state.
static int export_current_checkpoint(DWORD bike){
 Block*saved_blocks=malloc(sizeof blocks);if(!saved_blocks)return 0;
 const unsigned saved_count=block_count;memcpy(saved_blocks,blocks,sizeof blocks);block_count=0;
 const int ok=checkpoint(bike,0)&&export_checkpoint(bike);
 memcpy(blocks,saved_blocks,sizeof blocks);block_count=saved_count;free(saved_blocks);return ok;
}

static void write_byte(DWORD address, BYTE value) {
    SIZE_T count;
    if (!WriteProcessMemory(process, (void *)(uintptr_t)address, &value, 1, &count) || count != 1 ||
        !FlushInstructionCache(process, (void *)(uintptr_t)address, 1)) {
        // Do not resume a process with an uncertain instruction stream.
        fprintf(stderr, "Cannot restore debugger instruction; terminating attached game.\n");
        TerminateProcess(process, 5);
        exit(5);
    }
}

// Observation only: entries link into a shared world grid. Do not restore a
// detached subset of that graph as if it were an independent allocation.
static int observe_rider_collision(FILE *out,DWORD rider) {
    DWORD address,entries,count,manager,id,enabled;BYTE object[0x110],entry_bytes[128*0x18],row[60*4],column[60*4];
    if(!read_memory(rider+0x34,&address,4)||!address||!read_memory(address,object,sizeof object))return 0;
    memcpy(&entries,object+0x8c,4);memcpy(&count,object+0x90,4);memcpy(&manager,object+0x98,4);memcpy(&id,object,4);
    DWORD owner;memcpy(&owner,object+0x94,4);
    if(owner!=rider||id>=60||count>128||!manager||(!entries&&count)||
       (count&&!read_memory(entries,entry_bytes,count*0x18))||
       !read_memory(manager+0xf8+id*60*4,row,sizeof row)||!read_memory(0x4e3754,&enabled,4))return 0;
    for(unsigned i=0;i<60;i++)if(!read_memory(manager+0xf8+(i*60+id)*4,column+i*4,4))return 0;
    fprintf(out,",\"riderCollision\":{\"address\":%lu,\"entriesAddress\":%lu,\"managerAddress\":%lu,\"enabled\":%lu,\"stateHex\":\"",address,entries,manager,enabled);
    for(unsigned i=0;i<sizeof object;i++)fprintf(out,"%02x",object[i]);
    fprintf(out,"\",\"entriesHex\":\"");for(unsigned i=0;i<count*0x18;i++)fprintf(out,"%02x",entry_bytes[i]);
    fprintf(out,"\",\"pairRowHex\":\"");for(unsigned i=0;i<sizeof row;i++)fprintf(out,"%02x",row[i]);
    fprintf(out,"\",\"pairColumnHex\":\"");for(unsigned i=0;i<sizeof column;i++)fprintf(out,"%02x",column[i]);
    fprintf(out,"\"}");return !ferror(out);
}

static int snapshot(FILE *out, unsigned phase, DWORD sequence, DWORD thread, CONTEXT *context) {
    // At 0x4ad078 the rider delta has been pushed. Normalize only the observation.
    CONTEXT observed=*context;
    if(capture_return&&phase==6){observed.Esi-=0x56c;observed.Esp-=8;context=&observed;}
    if(capture_filter&&!capture_frame_rider&&phase==6){observed.Esp+=4;context=&observed;}
    DWORD frame, carry, nominal, cap, dt, steps, engine, transform, rider;
    unsigned char matrix[64], rider_state[0x3ac], frame_stack[0xc00];
    unsigned char engine_state[0x16c];
    unsigned char object[0xcc8];
    if (!read_memory(context->Esi, object, sizeof object) ||
        !read_memory(context->Esi+0x874,&rider,4) ||
        !read_memory(rider,rider_state,sizeof rider_state) ||
        !read_memory(context->Esp + 0xbfc, &frame, 4) ||
        !read_memory(context->Esi + 0x8c8, &carry, 4) ||
        !read_memory(context->Esi + 0x8cc, &nominal, 4) ||
        !read_memory(context->Esi + 0x8d4, &cap, 4) ||
        !read_memory(context->Esp + 0x10, &dt, 4) ||
        !read_memory(context->Esp + 0x20, &steps, 4) ||
        !read_memory(context->Esi + 0x8f0, &engine, 4) ||
        !read_memory(engine, engine_state, sizeof engine_state) ||
        !read_memory(context->Esi + 0x434, &transform, 4) ||
        !read_memory(transform + 0x84, matrix, sizeof matrix)) return 0;
    if(capture_stack&&!read_memory(context->Esp,frame_stack,sizeof frame_stack))return 0;
    fprintf(out, "{\"phase\":\"%s\",\"sequence\":%lu,\"bike\":\"%08lx\","
                 "\"thread\":%lu,\"cw\":%lu,\"frameBits\":%lu,\"carryBits\":%lu,"
                 "\"nominalBits\":%lu,\"cap\":%lu,\"dtBits\":%lu,\"steps\":%lu,\"stateHex\":\"",
            capture_effects?(phase==6?(capture_return?"after-return":capture_frame_rider?"after-frame-rider":capture_filter?"after-filter":"after-frame-effects"):phase?"before-frame-effects":"before-update"):phase ? (capture_tires?"after-tires":capture_motion?"after-motion":capture_controls?"after-controls":capture_loop_rider?"after-loop-rider":capture_finish?"after-finish":"after-update") : "before-update", sequence, context->Esi,
            thread, context->FloatSave.ControlWord, frame, carry, nominal, cap, dt, steps);
    for (unsigned i = 0; i < sizeof object; i++) fprintf(out, "%02x", object[i]);
    fprintf(out, "\",\"engineAddress\":\"%08lx\",\"engineHex\":\"", engine);
    for (unsigned i = 0; i < sizeof engine_state; i++) fprintf(out, "%02x", engine_state[i]);
    fprintf(out, "\",\"transformAddress\":\"%08lx\",\"matrixHex\":\"", transform);
    for (unsigned i = 0; i < sizeof matrix; i++) fprintf(out, "%02x", matrix[i]);
    fprintf(out,"\",\"riderAddress\":\"%08lx\",\"riderHex\":\"",rider);
    for(unsigned i=0;i<sizeof rider_state;i++)fprintf(out,"%02x",rider_state[i]);
    fprintf(out,"\"");
    if(capture_loop_rider||capture_finish||capture_effects){
        DWORD effect;BYTE bytes[16];if(!read_memory(context->Esi+0x904,&effect,4)||!read_memory(effect,bytes,16))return 0;
        fprintf(out,",\"effectAddress\":%lu,\"effectHex\":\"",effect);for(unsigned i=0;i<16;i++)fprintf(out,"%02x",bytes[i]);fprintf(out,"\"");
    }
    if(capture_finish&&phase&&!capture_mcm_collision_world(process,context->Esi,getenv("MCM_FINISH_WORLD"),frame_capture_id,0,"player-substep-finish"))return 0;
    if(capture_frame_rider){
        DWORD proxy;if(!read_memory(context->Esi+0xc8c,&proxy,4))return 0;
        DWORD actors[2]={context->Esi,proxy};fprintf(out,",\"renderSources\":[");
        for(unsigned k=0;k<2;k++){
            DWORD node,words[22];
            if(!read_memory(actors[k]+0x434,&node,4)||!read_memory(node+0x84,words,64)||!read_memory(actors[k]+0x218,words+16,24))return 0;
            fprintf(out,"%s{\"actor\":%lu,\"node\":%lu,\"words\":[",k?",":"",actors[k],node);
            for(unsigned j=0;j<22;j++)fprintf(out,"%s%lu",j?",":"",words[j]);
            fprintf(out,"]}");
        }
        fprintf(out,"]");
    }
    if(capture_frame_rider&&player_frame==1){
        DWORD proxy;if(!read_memory(context->Esi+0xc8c,&proxy,4))return 0;
        fprintf(out,",\"visualState\":[");unsigned emitted=0;
        for(unsigned k=0;k<block_count;k++){
            const Block*b=&blocks[k];if(b->size!=0x114&&b->address!=proxy)continue;
            BYTE bytes[0x438];if(b->size>sizeof bytes||!read_memory(b->address,bytes,b->size))return 0;
            fprintf(out,"%s{\"address\":%lu,\"size\":%lu,\"hex\":\"",emitted++?",":"",b->address,b->size);
            for(DWORD i=0;i<b->size;i++){fprintf(out,"%02x",bytes[i]);}fprintf(out,"\"}");
        }
        fprintf(out,"],\"animationState\":[");
        for(unsigned k=0;k<animation_count;k++){
            const AnimationBlock*b=&animation_blocks[k];BYTE bytes[0x78];
            if(!read_memory(b->address,bytes,b->size))return 0;
            fprintf(out,"%s{\"address\":%lu,\"size\":%lu,\"hex\":\"",k?",":"",b->address,b->size);
            for(DWORD i=0;i<b->size;i++){fprintf(out,"%02x",bytes[i]);}fprintf(out,"\"}");
        }
        fprintf(out,"]");
    }
    if(capture_filter){
        DWORD address;BYTE bytes[8];if(!read_memory(context->Esi+0x900,&address,4)||!read_memory(address,bytes,8))return 0;
        fprintf(out,",\"accelerationFilterAddress\":%lu,\"accelerationFilterHex\":\"",address);
        for(unsigned i=0;i<8;i++){fprintf(out,"%02x",bytes[i]);}fprintf(out,"\"");
    }
    if(capture_effects){
    fprintf(out,",\"visualEffects\":[");
    for(unsigned k=0;k<3;k++){
        DWORD address,offsets[]={0xc94,0xc98,0xca0},sizes[]={0x84,0x84,0x480};BYTE bytes[0x480];
        if(!read_memory(context->Esi+offsets[k],&address,4)||!read_memory(address,bytes,sizes[k]))return 0;
        fprintf(out,"%s{\"address\":%lu,\"size\":%lu,\"hex\":\"",k?",":"",address,sizes[k]);
        for(DWORD i=0;i<sizes[k];i++){fprintf(out,"%02x",bytes[i]);}fprintf(out,"\"}");
    }
    fprintf(out,"]");

    {DWORD world,owner,event,settings,shape,enabled,occlusion,selected,state,disabled;BYTE target[12];
     if(!read_memory(0x4e4fb4,&world,4)||!read_memory(world+0x718,&enabled,4)||!read_memory(world+0x714,&occlusion,4)||
        !read_memory(context->Esi+0xc84,&owner,4)||!read_memory(owner+0x44,&event,4)||!read_memory(owner+0x48,&settings,4)||
        !read_memory(event+0x1ec,&selected,4)||!read_memory(event+0x1f4,&state,4)||!read_memory(settings+0x20,&disabled,4)||
        !read_memory(context->Esi+0xca8,&shape,4)||!shape||!read_memory(shape+0x34,target,12))return 0;
     fprintf(out,",\"effectsEnvironment\":{\"world\":%lu,\"enabled\":%lu,\"occlusion\":%lu,\"selectedBike\":%lu,\"eventState\":%lu,\"disabled\":%lu,\"shape\":%lu,\"targetHex\":\"",world,enabled,occlusion,selected,state,disabled,shape);
     for(unsigned i=0;i<12;i++)fprintf(out,"%02x",target[i]);
     fprintf(out,"\"},\"effectQueryCount\":%lu,\"effectQueryResult\":%lu",effect_query_count,effect_query_result);
    }

    {DWORD owner,terrain,root;BYTE scale[4],node[0x38];
     if(!read_memory(context->Esi+0xc84,&owner,4)||!read_memory(owner+0x40,&terrain,4)||
        !read_memory(terrain+0x40,scale,4)||!read_memory(terrain+0x44,&root,4)||!read_memory(root,node,sizeof node))return 0;
     fprintf(out,",\"terrainQuery\":{\"terrain\":%lu,\"root\":%lu,\"scaleHex\":\"",terrain,root);
     for(unsigned i=0;i<4;i++)fprintf(out,"%02x",scale[i]);
     fprintf(out,"\",\"rootHex\":\"");for(unsigned i=0;i<sizeof node;i++)fprintf(out,"%02x",node[i]);
     fprintf(out,"\",\"startHex\":\"");for(unsigned i=0;i<12;i++)fprintf(out,"%02x",effect_query_start[i]);
     fprintf(out,"\",\"outputHex\":\"");for(unsigned i=0;i<12;i++)fprintf(out,"%02x",effect_query_output[i]);fprintf(out,"\"}");
    }
    }
    if(capture_collision&&!observe_rider_collision(out,rider))return 0;
    if(capture_stack){
        fprintf(out,",\"stackAddress\":\"%08lx\",\"stackHex\":\"",context->Esp);
        for(unsigned i=0;i<sizeof frame_stack;i++)fprintf(out,"%02x",frame_stack[i]);
        fprintf(out,"\"");
    }
    if(capture_rider_timing)fprintf(out,",\"riderUpdateCount\":%lu,\"riderDtBits\":%lu",rider_update_count,rider_dt_bits);
    if(capture_rider_timing)fprintf(out,",\"riderObservedDtBits\":%lu,\"fixedRider\":%s",rider_observed_dt_bits,fixed_rider?"true":"false");
    fprintf(out, ",\"requestedBrake\":%lu,\"requestedSteerBits\":%lu",requested_brake,requested_steer_bits);
    fprintf(out, ",\"scripted\":%s,\"playerFrame\":%lu,\"requestedThrottle\":%lu,\"pass\":%lu,\"randomState\":%lu}\n", scripted ? "true" : "false", player_frame - 1, requested_throttle,pass,random_state);
    return !ferror(out);
}

int main(int argc, char **argv) {
    if (argc != 4) {
        fprintf(stderr, "Usage: capture-live.exe WINDOWS_PID output.jsonl record-count\n");
        return 2;
    }
    scripted = getenv("MCM_SCRIPTED") != NULL;
    capture_stack = getenv("MCM_STACK") != NULL;
    capture_collision = getenv("MCM_COLLISION") != NULL;
    checkpoint_collision_callbacks = getenv("MCM_COLLISION_CALLBACKS") != NULL;
    checkpoint_collision_pairs = getenv("MCM_COLLISION_PAIRS") != NULL;
    if(checkpoint_collision_pairs)checkpoint_collision_callbacks=1;
    if(checkpoint_collision_callbacks&&!scripted){fprintf(stderr,"Collision checkpoint options require MCM_SCRIPTED.\n");return 2;}
    if(checkpoint_collision_callbacks)capture_collision=1;
    capture_rider_timing = getenv("MCM_RIDER_TIMING") != NULL;
    fixed_rider = getenv("MCM_FIXED_RIDER") != NULL;
    if(getenv("MCM_INITIAL_CHECKPOINT")&&!scripted){fprintf(stderr,"Initial checkpoint requires MCM_SCRIPTED.\n");return 2;}
    if(fixed_rider&&!scripted){fprintf(stderr,"MCM_FIXED_RIDER requires MCM_SCRIPTED.\n");return 2;}
    if(fixed_rider)capture_rider_timing=1;
    if(capture_rider_timing)hook_count=5;
    capture_contact=getenv("MCM_CAPTURE_CONTACT")!=NULL;
    if(capture_contact){if(!scripted||!getenv("MCM_COLLISION_WORLD")||!getenv("MCM_CHECKPOINT")||getenv("MCM_ANIMATIONS")){fprintf(stderr,"Contact capture requires scripted world/checkpoint output and excludes animation export.\n");return 2;}hook_count=6;capture_rider_timing=1;}
    DWORD pid = strtoul(argv[1], NULL, 0), limit = strtoul(argv[3], NULL, 0);
    capture_tires=getenv("MCM_CAPTURE_TIRES")!=NULL;
    if(capture_tires){
        if(!scripted||limit!=2||capture_contact||getenv("MCM_CAPTURE_FRAME")){fprintf(stderr,"Tire boundary capture requires scripted first frame and exactly two records.\n");return 2;}
        addresses[1]=0x4a8be0;lengths[1]=4;const BYTE bytes[]={0xd9,0x44,0x24,0x74};memcpy(expected[1],bytes,4);
    }
    capture_motion=getenv("MCM_CAPTURE_MOTION")!=NULL;
    if(capture_motion){
        if(!scripted||limit!=2||capture_contact||capture_tires||getenv("MCM_CAPTURE_FRAME")){fprintf(stderr,"Motion boundary capture requires scripted first frame and exactly two records.\n");return 2;}
        addresses[1]=0x4ab7fd;lengths[1]=6;const BYTE bytes[]={0x8b,0x86,0x44,0x08,0,0};memcpy(expected[1],bytes,6);
    }
    capture_controls=getenv("MCM_CAPTURE_CONTROLS")!=NULL;
    if(capture_controls){
        if(!scripted||limit!=2||capture_contact||capture_tires||capture_motion||getenv("MCM_CAPTURE_FRAME")){fprintf(stderr,"Controls capture requires scripted first frame and exactly two records.\n");return 2;}
        addresses[1]=0x4ac5c5;lengths[1]=4;const BYTE bytes[]={0x8b,0x44,0x24,0x10};memcpy(expected[1],bytes,4);
    }
    capture_loop_rider=getenv("MCM_CAPTURE_LOOP_RIDER")!=NULL;
    if(capture_loop_rider){
        if(!scripted||limit!=2||capture_contact||capture_tires||capture_motion||capture_controls||getenv("MCM_CAPTURE_FRAME")){fprintf(stderr,"Loop rider capture requires scripted first frame and exactly two records.\n");return 2;}
        addresses[1]=0x4ac6cd;lengths[1]=6;const BYTE bytes[]={0x8d,0x86,0xf8,0x04,0,0};memcpy(expected[1],bytes,6);
    }
    capture_finish=getenv("MCM_CAPTURE_FINISH")!=NULL;
    if(capture_finish){
        if(!scripted||limit!=2||capture_contact||capture_tires||capture_motion||capture_controls||capture_loop_rider||getenv("MCM_CAPTURE_FRAME")||!getenv("MCM_FINISH_WORLD")||!getenv("MCM_CHECKPOINT")||!getenv("MCM_COLLISION_WORLD")){fprintf(stderr,"Finish capture requires scripted first frame, two records and world output.\n");return 2;}
        addresses[1]=0x4ac95a;lengths[1]=2;const BYTE bytes[]={0x33,0xff};memcpy(expected[1],bytes,2);
    }
    capture_return=getenv("MCM_CAPTURE_RETURN")!=NULL;
    capture_frame_rider=capture_return||getenv("MCM_CAPTURE_FRAME_RIDER")!=NULL;
    capture_filter=capture_frame_rider||getenv("MCM_CAPTURE_FILTER")!=NULL;
    capture_effects=capture_filter||getenv("MCM_CAPTURE_EFFECTS")!=NULL;
    if(capture_effects){
        if(!scripted||!capture_stack||limit!=MCM_RENDER_RECORD_COUNT||capture_tires||capture_motion||capture_controls||capture_loop_rider||capture_finish||capture_contact||getenv("MCM_CAPTURE_FRAME")||!getenv("MCM_CHECKPOINT")||!getenv("MCM_FRAME_ENVIRONMENT")||!getenv("MCM_ANIMATIONS")||!getenv("MCM_COLLISION_WORLD")){
            fprintf(stderr,"Heap capture requires scripted first frame, stack, %u records and checkpoint/environment/animation/world outputs.\n",MCM_RENDER_RECORD_COUNT);return 2;
        }
        hook_count=MCM_RENDER_HOOK_COUNT;addresses[1]=0x4ac95a;lengths[1]=2;expected[1][0]=0x33;expected[1][1]=0xff;
    }
    if(capture_filter){addresses[6]=0x4ad078;lengths[6]=2;expected[6][0]=0x8b;expected[6][1]=0xce;}
    if(capture_frame_rider){addresses[6]=0x4ad07f;lengths[6]=6;const BYTE bytes[]={0x8b,0x86,0x84,0x0c,0,0};memcpy(expected[6],bytes,6);}
    if(capture_return){addresses[6]=0x4ad10d;lengths[6]=6;const BYTE bytes[]={0x5e,0x5b,0x81,0xc4,0xe8,0x0b};memcpy(expected[6],bytes,6);}
    const char*frame_arg=getenv("MCM_CAPTURE_FRAME");
    if(frame_arg&&capture_contact){fprintf(stderr,"Choose frame or contact capture, not both.\n");return 2;}
    if(frame_arg){char*end;capture_frame=strtoul(frame_arg,&end,10);if(!*frame_arg||*end||!scripted||capture_frame>399||limit<2*(capture_frame+1)){fprintf(stderr,"Invalid requested capture frame.\n");return 2;}}
    if (!pid || limit < 2 || limit > 10000 || (!capture_effects && (limit & 1))) return 2;
    FILE *out = fopen(argv[2], "wx");
    if (!out) return 2;
    setbuf(out, NULL);
    const char *render_path=getenv("MCM_RENDER_TRACE");if(!render_path||!*render_path){fclose(out);return 2;}
    render_out=fopen(render_path,"wx");if(!render_out){fclose(out);return 2;}setbuf(render_out,NULL);
    process = OpenProcess(PROCESS_ALL_ACCESS, FALSE, pid);
    // This instruction guard prevents attaching to another executable version.
    // The caller must also verify mcm.exe's SHA-256 as documented in README.
    for (unsigned i = 0; i < hook_count; i++) {
        BYTE instruction[6];
        if (!process || !read_memory(addresses[i], instruction, lengths[i]) ||
            memcmp(instruction, expected[i], lengths[i])) {
            fprintf(stderr, "Unexpected executable or unreadable process.\n");
            fclose(out);
            if (process) CloseHandle(process);
            return 2;
        }
        saved[i] = instruction[0];
    }
    if (!DebugActiveProcess(pid)) {
        fprintf(stderr, "Attach failed: %lu\n", GetLastError());
        fclose(out);
        CloseHandle(process);
        return 2;
    }
    DebugSetProcessKillOnExit(FALSE);
    int installed = 0, done = 0;
    int pending_steps[64]; DWORD step_threads[64]={0};
    for(unsigned i=0;i<64;i++)pending_steps[i]=-1;
    DWORD count = 0, start = GetTickCount();
    while (!done) {
        DEBUG_EVENT event;
        DWORD status = DBG_CONTINUE;
        if (!WaitForDebugEvent(&event, 500)) {
            if (GetTickCount() - start < 30000) continue;
            fprintf(stderr, "No player-bike records or renderer progress for 30 seconds.\n");
            if (!DebugBreakProcess(process) || !WaitForDebugEvent(&event, 5000)) {
                fprintf(stderr, "Cannot stop game for breakpoint cleanup.\n");
                TerminateProcess(process, 5);
                done = 2;
                break;
            }
            done = 2;
        }
        if (event.dwDebugEventCode == CREATE_PROCESS_DEBUG_EVENT && event.u.CreateProcessInfo.hFile)
            CloseHandle(event.u.CreateProcessInfo.hFile);
        if (event.dwDebugEventCode == LOAD_DLL_DEBUG_EVENT && event.u.LoadDll.hFile)
            CloseHandle(event.u.LoadDll.hFile);
        if (event.dwDebugEventCode == EXIT_PROCESS_DEBUG_EVENT) {
            done = 2;
            ContinueDebugEvent(event.dwProcessId, event.dwThreadId, status);
            break;
        }
        if (event.dwDebugEventCode == EXCEPTION_DEBUG_EVENT) {
            DWORD code = event.u.Exception.ExceptionRecord.ExceptionCode;
            DWORD address = (DWORD)(uintptr_t)event.u.Exception.ExceptionRecord.ExceptionAddress;
            unsigned slot=0;
            while(slot<64 && step_threads[slot] && step_threads[slot]!=event.dwThreadId)slot++;
            if(slot==64){fprintf(stderr,"Too many capture threads\n");TerminateProcess(process,5);done=2;ContinueDebugEvent(event.dwProcessId,event.dwThreadId,status);break;}
            step_threads[slot]=event.dwThreadId;
            int pending=pending_steps[slot];
            DWORD pending_thread=event.dwThreadId;
            if(getenv("MCM_DEBUG_EVENTS"))fprintf(stderr,"exception code=%08lx address=%08lx thread=%lu pending=%d first=%lu\n",code,address,event.dwThreadId,pending,event.u.Exception.dwFirstChance);
            int matched = -1;
            for (unsigned i = 0; i < hook_count; i++) if (address == addresses[i]) matched = i;
            if (code == EXCEPTION_BREAKPOINT && !installed && !done) {
                for (unsigned i = 0; i < hook_count; i++) {
                    write_byte(addresses[i], 0xcc);
                    armed[i] = 1;
                }
                installed = 1;
            } else if (code == EXCEPTION_BREAKPOINT && matched >= 0) {
                HANDLE thread = OpenThread(THREAD_GET_CONTEXT | THREAD_SET_CONTEXT, FALSE, event.dwThreadId);
                CONTEXT context = {.ContextFlags = CONTEXT_ALL};
                if (!thread || !GetThreadContext(thread, &context)) {
                    TerminateProcess(process, 5);
                    done = 2;
                } else {
                    if(matched==13){
 if(observed_player){
  DWORD actor=context.Ecx-0x404,node,owner,camera,words[58],hidden;
  if(draw_depth>=64)done=2;else{draw_actors[draw_depth++]=actor;
   if(!read_memory(context.Ecx+0x30,&node,4)||!read_memory(context.Ecx+0x1c,&owner,4)||!read_memory(owner+0x2c,&camera,4)||!read_memory(node+0x84,words,64)||!read_memory(camera+0xb0,words+16,64)||!read_memory(actor+0x218,words+32,24)||!read_memory(camera+0x178,words+38,16)||!read_memory(camera+0x70,words+42,64)||!read_memory(node+0x12c,&hidden,4))done=2;
   else{fprintf(render_out,"{\"phase\":\"wrapper\",\"frame\":%lu,\"actor\":%lu,\"node\":%lu,\"camera\":%lu,\"esp\":%lu,\"words\":[",player_frame-1,actor,node,camera,context.Esp);for(unsigned j=0;j<58;j++)fprintf(render_out,"%s%lu",j?",":"",words[j]);fprintf(render_out,"],\"hidden\":%lu}\n",hidden);}
  }
 }
}else if(matched>=15){
 if(observed_player&&scratch_address){
  // Guarded renderer boundaries are progress even when one instrumented draw is slow.
  start=GetTickCount();
  static const char*names[]={"hud-configured","hud-row-formatted","hud-row-drawn","hud-returned","clock-before","clock-after","bike-function-entry","wrapper-exit","wrapper-cull","root-draw-return","root-post-return","root-counter-return","world-return","world-entry","scene-draw-return","end-scene-return","stats-return","scene-post-return","overlay-return","camera-post-return","child-before","child-after","particle-identity-return","particle-transform-return","particle-cull-return","particle-texture-return","particle-before-draw","particle-draw-return","particle-state-restored","ddraw-ea3f","ddraw-eaa5","ddraw-eae1","ddraw-eb19","ddraw-eb4f","ddraw-eb76","ddraw-eb88","ddraw-eb9a","ddraw-ebb4","ddraw-ebd8","ddraw-ebf6","ddraw-ebfe","ddraw-ec3d","state-1bd500","state-1bd547","state-1bda0e","state-1bda41","state-1bdb2b","state-1bdb3c","state-1bdb4d","state-1bdd4e","state-1bdd88","state-1bdfaf","state-1bdff3","state-1be070","state-1be15c","state-1be3a5","state-1be402","state-1be6d1","state-1be79e","state-1be86e","state-1be931","state-1be9fd","state-1beacd","state-1bec30","state-1bec7e","state-1becad","state-1bed1c","state-1beda4","state-1bee18","state-1bee60","state-1bee8f","state-1bef04","state-1bef84","state-1beff8","state-1bf040","state-1bf06f","state-1bf0e0","state-1bf13e","state-1bf16d","state-1bf1d0","state-1bf3e6","state-1bf468","state-1bf4a8","state-1bf58b","state-1bf5b7","state-1bf602","state-1bf640","state-1bf677","state-1bf7f5","state-1bf830","state-1bf895","state-1bf8ba","state-1bf8ca","state-1bf994","state-1bfa12","state-1bfa7a","state-1bfaaa","state-1bfb61","state-1bfba4","state-1bfd96","state-1bfdad","state-1bfe06","state-1bfe3c","state-1bfeca","state-1bff0d","state-1bff42","state-1bff7e","state-1bffd9","state-1c001a","state-1c004f","state-1c0104","state-1c0179","state-1c0249","state-1c0374","state-1c044b","state-1c04b4","upload-1c6e00","upload-1c56c0","upload-1bf98c","upload-1c572a","upload-1c578e","upload-1c57b2","upload-1c57d4","upload-1c5809","upload-1c585a","upload-1c5877","upload-1c59db","upload-1c5a06","upload-1c5a65","upload-1c5a75","upload-1c5ae7","upload-1c6f08","upload-1c6f1f","upload-1c6f3e","upload-1c6fae","command-1ca180","command-1ca1d8","command-1ca237","command-1ca246","handler-1b6330","handler-1b638d","handler-1b63c7","handler-1b63d9","handler-1b6423","handler-19ab70","handler-199094","handler-1990dc","handler-1990f5","handler-1b63d3","handler-1b6460","heap-504f0","heap-504f3"
#ifdef MCM_CAPTURE_HUD_LINE_STORES
,"hud-line-measured","hud-line-clear-before","hud-line-clear-after"
#endif
#ifdef MCM_CAPTURE_RENDER_BINDING
,"binding-handler","binding-callback","binding-return"
#endif
#ifdef MCM_CAPTURE_BINDING_GATES
,"binding-producer"
#endif
#ifdef MCM_CAPTURE_UPLOAD_COPY
,"upload-copy-before","upload-copy-after"
#endif
#ifdef MCM_CAPTURE_INDEXED_SUBMIT
,"indexed-62400","indexed-62481","indexed-624cc","indexed-6254d","indexed-62562","indexed-625c2","indexed-62632","indexed-6273b","indexed-6274b","indexed-6276f","indexed-627a5","indexed-627cc","indexed-627ee","indexed-62804","indexed-62814","indexed-6286f","indexed-6289e","indexed-628ef","indexed-629ed","indexed-62a32","indexed-62a52","indexed-62a9c","indexed-62aa8","indexed-62b04","indexed-62b48","indexed-62b85","indexed-62bb9","indexed-62be9","indexed-62c01","indexed-62c38","indexed-62c6e","indexed-1b41c0","indexed-1b42f3","indexed-1b4304","indexed-1c3f54","indexed-1c4551","indexed-1c459a"
#endif
#ifdef MCM_CAPTURE_SHADER_APPLY
,"shader-dc4c0","shader-dc534","shader-dc55e","shader-dc59b","shader-dc5cb","shader-dc5d7","shader-dc601","shader-dc663","shader-dc6a3","shader-dc6d2","shader-dc6f5","shader-dc71f","shader-dc766","shader-dc7a6","shader-dc7dc","shader-dc818","shader-dc847","shader-dc886","shader-e9d00"
#endif
#ifdef MCM_CAPTURE_SHADER_CACHE
,"shader-d3526","shader-d355b","shader-d355f","shader-d3567","shader-d38c0","shader-d5a98","shader-ec5e0","shader-ec65b","shader-ec6cf","shader-138260"
#endif
};
  DWORD word,actor=draw_depth?draw_actors[draw_depth-1]:0;
  if(!read_memory(scratch_address,&word,4))done=2;
  else fprintf(render_out,"{\"phase\":\"%s\",\"frame\":%lu,\"esp\":%lu,\"ecx\":%lu,\"actor\":%lu,\"result\":%lu,\"scratch\":%lu,\"value\":%lu}\n",names[matched-15],player_frame-1,context.Esp,context.Ecx,actor,context.Eax,scratch_address,word);
  if(matched==24){DWORD target;if(!read_memory(context.Edi+0x2c,&target,4))done=2;else fprintf(render_out,"{\"phase\":\"root-post-target\",\"frame\":%lu,\"target\":%lu}\n",player_frame-1,target);}
  if(matched==29){DWORD manager,device,table,target;if(!read_memory(context.Ebx+8,&manager,4)||!read_memory(manager+0xc,&device,4)||!read_memory(device,&table,4)||!read_memory(table+0x2c,&target,4))done=2;else fprintf(render_out,"{\"phase\":\"end-scene-target\",\"frame\":%lu,\"target\":%lu}\n",player_frame-1,target);}
  if(matched==35||matched==36){DWORD table,target;if(!read_memory(context.Esi,&table,4)||!read_memory(table+0x24,&target,4))done=2;else fprintf(render_out,"{\"phase\":\"child-target\",\"frame\":%lu,\"after\":%d,\"child\":%lu,\"target\":%lu}\n",player_frame-1,matched==36,context.Esi,target);}
  if(matched>=37&&matched<44){DWORD total,visible;if(!read_memory(context.Esi+0x30,&total,4)||!read_memory(context.Esi+0x34,&visible,4))done=2;else fprintf(render_out,"{\"phase\":\"particle-counts\",\"frame\":%lu,\"stage\":%d,\"pool\":%lu,\"total\":%lu,\"visible\":%lu}\n",player_frame-1,matched,context.Esi,total,visible);}
  if(matched==153){fprintf(render_out,"{\"phase\":\"command-submit-target\",\"frame\":%lu,\"target\":%lu}\n",player_frame-1,context.Eax); }
#ifdef MCM_CAPTURE_UPLOAD_COPY
  if(matched==160){DWORD a,b,ops,target,dst[2],srcptr,src[2];if(!read_memory(context.Ebx+0x3c,&a,4)||!read_memory(a+0xc,&b,4)||!read_memory(b+0x2f0,&ops,4)||!read_memory(ops+0x2c,&target,4)||!read_memory(context.Esi,dst,8)||!read_memory(context.Ebp+0x14,&srcptr,4)||!read_memory(srcptr,src,8))done=2;else fprintf(render_out,"{\"phase\":\"resource-upload-callback\",\"frame\":%lu,\"esp\":%lu,\"target\":%lu,\"destination\":%lu,\"source\":%lu,\"destinationBuffer\":%lu,\"sourceBuffer\":%lu}\n",player_frame-1,context.Esp,target,context.Esi,srcptr,dst[0],src[0]);}
  if(matched==174||matched==175){DWORD saved;DWORD address=context.Esp-0xc;if(!read_memory(address,&saved,4))done=2;else fprintf(render_out,"{\"phase\":\"upload-copy-save\",\"frame\":%lu,\"after\":%d,\"esp\":%lu,\"address\":%lu,\"destination\":%lu,\"value\":%lu}\n",player_frame-1,matched==175,context.Esp,address,context.Edi,saved);}
#endif
#ifdef MCM_CAPTURE_INDEXED_SUBMIT
  if(matched==208){DWORD target;if(!read_memory(context.Edx+0x88,&target,4))done=2;else fprintf(render_out,"{\"phase\":\"indexed-backend-target\",\"frame\":%lu,\"target\":%lu}\n",player_frame-1,target);}
#endif
#ifdef MCM_CAPTURE_SHADER_APPLY
  if(matched==213){DWORD args[4],dirty,select;BYTE flags;if(!read_memory(context.Esp,args,sizeof(args))||!read_memory(args[2]+0x5c,&dirty,4)||!read_memory(args[2]+0x50,&flags,1)||!read_memory(args[2]+0x64,&select,4))done=2;else fprintf(render_out,"{\"phase\":\"shader-apply-input\",\"frame\":%lu,\"esp\":%lu,\"backend\":%lu,\"context\":%lu,\"state\":%lu,\"flags50\":%u,\"dirty5c\":%lu,\"select\":%lu}\n",player_frame-1,context.Esp,args[1],args[2],args[3],flags,dirty,select);}
#endif
#ifdef MCM_CAPTURE_SHADER_CACHE
  static DWORD cache_backend=0,cache_root=0;static int cache_refresh=1;
  if(addresses[matched]==0x7a843526){
   DWORD backend,root,compare,key[6];static DWORD nodes[8192],entries[8192][9];unsigned total=0;int snapshot=0;const DWORD offsets[6]={0x18,0x69c,0x6a8,0x6b8,0x6c8,0xb74};
   if(!read_memory(context.Ebp-0xd4,&backend,4)||!read_memory(backend+0x24,&root,4)||!read_memory(backend+0x20,&compare,4)||!read_memory(context.Ebp-0xa8,key,24))done=2;
   else{
    snapshot=cache_refresh||cache_backend!=backend||cache_root!=root;
    if(snapshot&&root)nodes[total++]=root;
    for(unsigned j=0;j<total&&!done;j++){
     entries[j][0]=nodes[j];if(!read_memory(nodes[j]+4,entries[j]+1,8)){done=2;break;}
     for(unsigned k=0;k<6;k++)if(!read_memory(nodes[j]+offsets[k],entries[j]+3+k,4)){done=2;break;}
     for(unsigned k=1;k<=2&&!done;k++)if(entries[j][k]){
      int seen=0;for(unsigned q=0;q<total;q++)if(nodes[q]==entries[j][k])seen=1;
      if(seen||total>=8192){fprintf(stderr,"Invalid cache tree: duplicate=%d total=%u\n",seen,total);done=2;break;}nodes[total++]=entries[j][k];
     }
    }
    if(!done){
     cache_backend=backend;cache_root=root;cache_refresh=0;
     fprintf(render_out,"{\"phase\":\"program-cache-input\",\"frame\":%lu,\"esp\":%lu,\"backend\":%lu,\"root\":%lu,\"compare\":%lu,\"key\":[",player_frame-1,context.Esp,backend,root,compare);
     for(unsigned k=0;k<6;k++)fprintf(render_out,"%s%lu",k?",":"",key[k]);fprintf(render_out,"],\"nodes\":%s",snapshot?"[":"null");
     for(unsigned j=0;j<total;j++){fprintf(render_out,"%s{\"id\":%lu,\"left\":%lu,\"right\":%lu,\"key\":[",j?",":"",entries[j][0],entries[j][1],entries[j][2]);for(unsigned k=0;k<6;k++)fprintf(render_out,"%s%lu",k?",":"",entries[j][3+k]);fprintf(render_out,"]}");}fprintf(render_out,"%s}\n",snapshot?"]":"");
    }
   }
  }
  if(addresses[matched]==0x7a84355b)fprintf(render_out,"{\"phase\":\"program-cache-compare\",\"frame\":%lu,\"esp\":%lu,\"node\":%lu,\"result\":%ld}\n",player_frame-1,context.Esp,context.Ebx,(LONG)context.Eax);
  if(addresses[matched]==0x7a8438c0)cache_refresh=1;
  if(addresses[matched]==0x7a84355f||addresses[matched]==0x7a8438c0)fprintf(render_out,"{\"phase\":\"program-cache-result\",\"frame\":%lu,\"esp\":%lu,\"miss\":%d,\"node\":%lu}\n",player_frame-1,context.Esp,addresses[matched]==0x7a8438c0,context.Ebx);
  if(addresses[matched]==0x7a843567){DWORD slot,value;if(!read_memory(context.Ebp-0xe8,&slot,4)||!read_memory(slot,&value,4))done=2;else fprintf(render_out,"{\"phase\":\"program-cache-return\",\"frame\":%lu,\"esp\":%lu,\"slot\":%lu,\"value\":%lu}\n",player_frame-1,context.Esp,slot,value);}
#endif
  if(matched==163){DWORD target;if(!read_memory(context.Eax+0x10,&target,4))done=2;else fprintf(render_out,"{\"phase\":\"release-target\",\"frame\":%lu,\"target\":%lu}\n",player_frame-1,target);}
  if(matched==165){fprintf(render_out,"{\"phase\":\"heap-store-source\",\"frame\":%lu,\"address\":%lu,\"value\":%lu}\n",player_frame-1,context.Ebp-0x14,context.Eax); }
  if(matched==57){DWORD args[3],dirty[3],flags;if(!read_memory(context.Esp,args,sizeof(args))||!read_memory(args[2]+0x100,dirty,sizeof(dirty))||!read_memory(args[2]+0x58,&flags,4))done=2;else fprintf(render_out,"{\"phase\":\"state-input\",\"frame\":%lu,\"block\":%lu,\"flags58\":%lu,\"dirty\":[%lu,%lu,%lu]}\n",player_frame-1,args[2],flags,dirty[0],dirty[1],dirty[2]);}
  if(matched==131){DWORD args[7];if(!read_memory(context.Esp,args,sizeof(args)))done=2;else fprintf(render_out,"{\"phase\":\"upload-input\",\"frame\":%lu,\"caller\":%lu,\"cs\":%lu,\"kind\":%lu,\"flags\":%lu,\"offset\":%lu,\"count\":%lu,\"data\":%lu}\n",player_frame-1,args[0],args[1],args[2],args[3],args[4],args[5],args[6]);}
  if(matched==58){DWORD block,dirty[3],flags;if(!read_memory(context.Ebp+0xc,&block,4)||!read_memory(block+0x100,dirty,sizeof(dirty))||!read_memory(block+0x58,&flags,4))done=2;else fprintf(render_out,"{\"phase\":\"state-prepared\",\"frame\":%lu,\"block\":%lu,\"flags58\":%lu,\"dirty\":[%lu,%lu,%lu]}\n",player_frame-1,block,flags,dirty[0],dirty[1],dirty[2]);}
  if(matched==57){DWORD args[3],decl,viewport[6];BYTE transformed=0;if(!read_memory(context.Esp,args,sizeof(args))||!read_memory(args[2]+0x10c,&decl,4)||(decl&&!read_memory(decl+0x18,&transformed,1))||!read_memory(args[2]+0xade4,viewport,sizeof(viewport)))done=2;else fprintf(render_out,"{\"phase\":\"state-declaration\",\"frame\":%lu,\"block\":%lu,\"declaration\":%lu,\"transformed\":%u,\"viewport\":[%lu,%lu,%lu,%lu,%lu,%lu]}\n",player_frame-1,args[2],decl,transformed,viewport[0],viewport[1],viewport[2],viewport[3],viewport[4],viewport[5]);}
  if(matched==57){DWORD args[3],cs,device,state2300,device28;if(!read_memory(context.Esp,args,sizeof(args))||!read_memory(args[1]+0x12d0,&cs,4)||!read_memory(cs+8,&device,4)||!read_memory(args[2]+0x2300,&state2300,4)||!read_memory(device+0x28,&device28,4))done=2;else fprintf(render_out,"{\"phase\":\"viewport-input\",\"frame\":%lu,\"block\":%lu,\"cs\":%lu,\"state2300\":%lu,\"device28\":%lu}\n",player_frame-1,args[2],cs,state2300,device28);}
  if(matched==131){DWORD args[7],words[16];if(!read_memory(context.Esp,args,sizeof(args)))done=2;else if(args[0]==0x7a92f994){if(args[5]!=64||!read_memory(args[6],words,sizeof(words)))done=2;else{fprintf(render_out,"{\"phase\":\"viewport-payload\",\"frame\":%lu,\"data\":%lu,\"words\":[",player_frame-1,args[6]);for(unsigned j=0;j<16;j++)fprintf(render_out,"%s%lu",j?",":"",words[j]);fprintf(render_out,"]}\n");}}}
  if(matched==57){DWORD args[3],state2540;if(!read_memory(context.Esp,args,sizeof(args))||!read_memory(args[2]+0x2540,&state2540,4))done=2;else fprintf(render_out,"{\"phase\":\"upload-config\",\"frame\":%lu,\"block\":%lu,\"state2540\":%lu}\n",player_frame-1,args[2],state2540);}
  if(matched==154||matched==157){DWORD command=context.Ebx,words[3];if(matched==154&&!read_memory(context.Esp+8,&command,4))done=2;else if(!read_memory(command+0x24,words,sizeof(words)))done=2;else fprintf(render_out,"{\"phase\":\"command-free-input\",\"frame\":%lu,\"stage\":%d,\"command\":%lu,\"buffer\":%lu,\"pointer\":%lu,\"flags\":%lu}\n",player_frame-1,matched,command,words[0],words[1],words[2]);}
  if(matched==150){DWORD args[5],box[6],upload[3];if(!read_memory(context.Esp,args,sizeof(args))||!read_memory(args[1],box,sizeof(box))||!read_memory(args[2],upload,sizeof(upload)))done=2;else{fprintf(render_out,"{\"phase\":\"command-producer\",\"frame\":%lu,\"cs\":%lu,\"resource\":%lu,\"subresource\":%lu,\"rowPitch\":%lu,\"slicePitch\":%lu,\"box\":[",player_frame-1,context.Eax,context.Edx,context.Ecx,args[3],args[4]);for(unsigned j=0;j<6;j++)fprintf(render_out,"%s%lu",j?",":"",box[j]);fprintf(render_out,"],\"upload\":[%lu,%lu,%lu]}\n",upload[0],upload[1],upload[2]);}}
  if(matched==154){DWORD command,words[14];if(!read_memory(context.Esp+8,&command,4)||!read_memory(command,words,sizeof(words)))done=2;else{fprintf(render_out,"{\"phase\":\"command-bytes\",\"frame\":%lu,\"command\":%lu,\"words\":[",player_frame-1,command);for(unsigned j=0;j<14;j++)fprintf(render_out,"%s%lu",j?",":"",words[j]);fprintf(render_out,"]}\n");}}
  if(matched==132){DWORD args[8],box[6],format,words[33],table,targets[8];if(!read_memory(context.Esp,args,sizeof(args))||!read_memory(args[4],box,sizeof(box))||!read_memory(args[2]+0x1c,&format,4)||!read_memory(format,words,sizeof(words))||!read_memory(args[1],&table,4)||!read_memory(table,targets,sizeof(targets)))done=2;else{fprintf(render_out,"{\"phase\":\"resource-input\",\"frame\":%lu,\"cs\":%lu,\"resource\":%lu,\"subresource\":%lu,\"source\":%lu,\"rowPitch\":%lu,\"slicePitch\":%lu,\"mapTarget\":%lu,\"unmapTarget\":%lu,\"box\":[",player_frame-1,args[1],args[2],args[3],args[5],args[6],args[7],targets[3],targets[4]);for(unsigned j=0;j<6;j++)fprintf(render_out,"%s%lu",j?",":"",box[j]);fprintf(render_out,"],\"format\":[");for(unsigned j=0;j<33;j++)fprintf(render_out,"%s%lu",j?",":"",words[j]);fprintf(render_out,"]}\n");}}
  if(matched==134||matched==136){DWORD resource,state[9],mapped[3],upload[3],box[6];if(!read_memory(context.Ebp-0x44,&resource,4)||!read_memory(resource+0x68,state,sizeof(state))||!read_memory(context.Ebp-0x40,mapped,sizeof(mapped))||!read_memory(context.Ebp-0x34,upload,sizeof(upload))||!read_memory(context.Ebp-0x28,box,sizeof(box)))done=2;else{fprintf(render_out,"{\"phase\":\"resource-stage\",\"frame\":%lu,\"stage\":%d,\"resource\":%lu,\"result\":%lu,\"mapped\":[%lu,%lu,%lu],\"upload\":[%lu,%lu,%lu],\"box\":[",player_frame-1,matched,resource,context.Eax,mapped[0],mapped[1],mapped[2],upload[0],upload[1],upload[2]);for(unsigned j=0;j<6;j++)fprintf(render_out,"%s%lu",j?",":"",box[j]);fprintf(render_out,"],\"state\":[");for(unsigned j=0;j<9;j++)fprintf(render_out,"%s%lu",j?",":"",state[j]);fprintf(render_out,"]}\n");}}
  if(matched==166){DWORD word;if(!read_memory(context.Ebp-0x14,&word,4))done=2;else fprintf(render_out,"{\"phase\":\"heap-store-value\",\"frame\":%lu,\"address\":%lu,\"value\":%lu}\n",player_frame-1,context.Ebp-0x14,word);}
#ifdef MCM_CAPTURE_HUD_LINE_STORES
  if(matched>=167&&matched<=169){DWORD fit,format,value;
   if(!read_memory(context.Ebp-0x860,&fit,4)||!read_memory(context.Ebp-0x8a4,&format,4)||!read_memory(context.Ebp-0x8b8,&value,4))done=2;
   else fprintf(render_out,"{\"phase\":\"hud-line-clear\",\"frame\":%lu,\"stage\":%d,\"ebp\":%lu,\"esp\":%lu,\"fit\":%lu,\"count\":%lu,\"format\":%lu,\"address\":%lu,\"value\":%lu}\n",player_frame-1,matched,context.Ebp,context.Esp,fit,context.Ebx,format,context.Ebp-0x8b8,value);
  }
#endif
#ifdef MCM_CAPTURE_RENDER_BINDING
  if(matched==170){DWORD args[3],command[3],old;
   if(!read_memory(context.Esp,args,12)||!read_memory(args[2],command,12)||command[1]>5||!read_memory(args[1]+0x1c0+command[1]*4,&old,4))done=2;
   else fprintf(render_out,"{\"phase\":\"binding-input\",\"frame\":%lu,\"esp\":%lu,\"cs\":%lu,\"opcode\":%lu,\"slot\":%lu,\"value\":%lu,\"previous\":%lu}\n",player_frame-1,context.Esp,args[1],command[0],command[1],command[2],old);
  }
  if(matched==171){DWORD args[3];if(!read_memory(context.Esp,args,12))done=2;else if(args[0]==0x7a925d98||args[0]==0x7a925dfc)fprintf(render_out,"{\"phase\":\"binding-call-store\",\"frame\":%lu,\"address\":%lu,\"value\":%lu,\"device\":%lu,\"state\":%lu}\n",player_frame-1,context.Esp,args[0],args[1],args[2]);}
  if(matched==172){DWORD word;if(!read_memory(context.Esp-4,&word,4))done=2;else fprintf(render_out,"{\"phase\":\"binding-call-return\",\"frame\":%lu,\"address\":%lu,\"value\":%lu}\n",player_frame-1,context.Esp-4,word);}
#endif
#ifdef MCM_CAPTURE_BINDING_GATES
  if(matched==58){DWORD state,device,adapter,ps,vs,decl;BYTE flags,transformed=0;
   if(!read_memory(context.Ebp+8,&device,4)||!read_memory(context.Ebp+12,&state,4)||!read_memory(device+12,&adapter,4)||!read_memory(adapter+0x5a,&flags,1)||!read_memory(state+0x25c,&ps,4)||!read_memory(state+0x13a0,&vs,4)||!read_memory(state+0x10c,&decl,4)||(decl&&!read_memory(decl+0x18,&transformed,1)))done=2;
   else fprintf(render_out,"{\"phase\":\"binding-gate-input\",\"frame\":%lu,\"block\":%lu,\"adapterFlags\":%u,\"pixelShader\":%lu,\"vertexShader\":%lu,\"declaration\":%lu,\"transformed\":%u}\n",player_frame-1,state,flags,ps,vs,decl,transformed);
  }
  if(matched==173){DWORD args[4];if(!read_memory(context.Esp,args,16))done=2;else fprintf(render_out,"{\"phase\":\"binding-producer-input\",\"frame\":%lu,\"esp\":%lu,\"caller\":%lu,\"cs\":%lu,\"slot\":%lu,\"value\":%lu}\n",player_frame-1,context.Esp,args[0],args[1],args[2],args[3]);}
#endif
#ifdef MCM_CAPTURE_WORLD_WRITERS
  if(matched==19||matched==20){DWORD elapsed,count,period,world,enabled,dt;
   if(!read_memory(context.Esi+0x100,&elapsed,4)||!read_memory(0x4e2ef4,&count,4)||!read_memory(0x4e2ef8,&period,4)||!read_memory(0x4e4fb4,&world,4)||!read_memory(world+0x6f4,&enabled,4)||!read_memory(context.Esp+0x24,&dt,4))done=2;
   else fprintf(render_out,"{\"phase\":\"hud-clock-input\",\"frame\":%lu,\"stage\":%d,\"owner\":%lu,\"elapsedBits\":%lu,\"frames\":%lu,\"frameMillisecondsBits\":%lu,\"dtBits\":%lu,\"enabled\":%lu}\n",player_frame-1,matched,context.Esi,elapsed,count,period,dt,enabled);
  }
#endif
#ifdef MCM_CAPTURE_APPLY_STACK
  if(matched==57&&draw_depth){DWORD words[32],fp=context.Ebp,pair[2];
   if(!read_memory(context.Esp,words,sizeof(words)))done=2;else{
    fprintf(render_out,"{\"phase\":\"apply-call-stack\",\"frame\":%lu,\"actor\":%lu,\"esp\":%lu,\"ebp\":%lu,\"words\":[",player_frame-1,draw_actors[draw_depth-1],context.Esp,context.Ebp);
    for(unsigned j=0;j<32;j++)fprintf(render_out,"%s%lu",j?",":"",words[j]);fprintf(render_out,"],\"chain\":[");
    // The original model draw uses EBP as a vertex pointer. Only the two
    // intervening Wine frames are EBP-based frames on this indexed-draw path.
    for(unsigned j=0;j<2&&fp>=context.Esp&&fp<context.Esp+0x1000;j++){if(!read_memory(fp,pair,8))break;fprintf(render_out,"%s[%lu,%lu,%lu]",j?",":"",fp,pair[0],pair[1]);if(pair[0]<=fp)break;fp=pair[0];}fprintf(render_out,"]}\n");
   }
  }
#endif
#ifdef MCM_CAPTURE_SCENE_TREE
  if(matched==28){DWORD root,table,target,nodes[1024];unsigned total=1;
   if(!read_memory(context.Ecx+0x430,&root,4)||!read_memory(root,&table,4)||!read_memory(table+0x24,&target,4))done=2;else{
    fprintf(render_out,"{\"phase\":\"scene-root-input\",\"frame\":%lu,\"owner\":%lu,\"root\":%lu,\"target\":%lu,\"esp\":%lu}\n",player_frame,context.Ecx,root,target,context.Esp);nodes[0]=root;
    for(unsigned j=0;j<total&&!done;j++){DWORD data[12],fn;
     if(!read_memory(nodes[j],data,sizeof(data))||!read_memory(data[0]+0x24,&fn,4)){done=2;break;}
     fprintf(render_out,"{\"phase\":\"scene-node-input\",\"frame\":%lu,\"address\":%lu,\"target\":%lu,\"next\":%lu,\"child\":%lu,\"enabled\":%lu,\"removed\":%lu}\n",player_frame,nodes[j],fn,data[4],data[5],data[8],data[11]);
     for(unsigned k=4;k<=5;k++)if(data[k]){unsigned q;for(q=0;q<total;q++)if(nodes[q]==data[k])break;if(q==total){if(total==1024){done=2;break;}nodes[total++]=data[k];}}
    }
   }
  }
#endif
  static DWORD upload_command_address;
  if(matched==131){DWORD args[7],device,adapter,cached;BYTE adapter_flags;if(!read_memory(context.Esp,args,sizeof(args))||args[2]>=8||!read_memory(args[1]+4,&device,4)||!read_memory(device+0xc,&adapter,4)||!read_memory(adapter+0x5a,&adapter_flags,1)||!read_memory(device+0x12d4+args[2]*4,&cached,4))done=2;else fprintf(render_out,"{\"phase\":\"upload-resource-input\",\"frame\":%lu,\"cs\":%lu,\"device\":%lu,\"kind\":%lu,\"cachedResource\":%lu,\"adapterFlags\":%u}\n",player_frame-1,args[1],device,args[2],cached,adapter_flags);}
  if(matched==147){if(!capture_register_heaps(render_out,context.Ebx,player_frame-1,147))done=2;upload_command_address=context.Eax;fprintf(render_out,"{\"phase\":\"upload-command-allocation\",\"frame\":%lu,\"address\":%lu}\n",player_frame-1,upload_command_address);}
  if(matched==148){if(!capture_register_heaps(render_out,context.Ebx,player_frame-1,148))done=2;DWORD words[5];if(!upload_command_address||!read_memory(upload_command_address,words,sizeof(words)))done=2;else fprintf(render_out,"{\"phase\":\"upload-command-bytes\",\"frame\":%lu,\"address\":%lu,\"words\":[%lu,%lu,%lu,%lu,%lu]}\n",player_frame-1,upload_command_address,words[0],words[1],words[2],words[3],words[4]);upload_command_address=0;}
  if(matched==22){if(!draw_depth)done=2;else draw_depth--;}
 }
}else if(matched==14){
 if(scratch_address&&context.Eax+8==scratch_address){DWORD before,value;memcpy(&value,context.ExtendedRegisters+232,4);if(!read_memory(scratch_address,&before,4))done=2;else{fprintf(render_out,"{\"phase\":\"store-before\",\"frame\":%lu,\"scratch\":%lu,\"before\":%lu,\"value\":%lu,\"actor\":%lu}\n",player_frame-1,scratch_address,before,value,draw_depth?draw_actors[draw_depth-1]:0);store_pending=1;}}
}else if(matched==10){
 if(player_frame&&context.Ecx==retained_pool_address){
  if(pool_tick_active||!read_memory(context.Esp+4,&pool_delta_bits,4)||!trace_retained_pool("before-pool",context.Ecx))done=2;
  pool_tick_active=1;
 }
}else if(matched==11||matched==12){
 if(pool_tick_active&&context.Ecx==retained_pool_address){if(!trace_retained_pool("after-pool",context.Ecx))done=2;pool_tick_active=0;}
}else if(matched==9){if(scripted&&player_active)context.Eax=requested_brake;}else if(matched==8){if(!trace_retained_rider("after-rider",context.Ebx))done=2;}else if(matched==7){if(player_active){effect_query_count++;effect_query_result=context.Eax;if(!read_memory(context.Esp+0x834,effect_query_start,12)||!read_memory(context.Esp+0xb88,effect_query_output,12))done=2;}} else if(matched==5){
                        if(capture_contact&&!contact_exported&&player_frame){DWORD collider,owner,kind,bike,ai;
                            if(!read_memory(context.Esi+8+context.Edi*4,&collider,4)||!read_memory(collider+0x94,&owner,4)||!read_memory(collider+0x104,&kind,4))done=2;
                            else if(kind<=1){bike=owner;if(kind==1&&!read_memory(owner+0x15c,&bike,4))done=2;
                                if(!done&&!read_memory(bike+0x614,&ai,4))done=2;
                                if(!done&&ai==0){export_boundary="collision-before-primary";if(!export_current_checkpoint(bike))done=2;else contact_exported=1;export_boundary="player-frame-entry";}
                            }
                        }
                    } else if(matched==4) {
                        DWORD owner,ai;
                        if(!read_memory(context.Ecx+0x15c,&owner,4)||!read_memory(owner+0x614,&ai,4))done=2;
                        else if(ai==0){
                            if(!read_memory(context.Esp+4,&rider_dt_bits,4))done=2;
                            rider_observed_dt_bits=rider_dt_bits;
                            if(fixed_rider){SIZE_T n;rider_dt_bits=0x3ca3d70a;if(!WriteProcessMemory(process,(void*)(uintptr_t)(context.Esp+4),&rider_dt_bits,4,&n)||n!=4)done=2;}
                            if(!trace_retained_rider("before-rider",context.Ecx))done=2;
                            rider_update_count++;
                        }
                    } else if(matched==3) {
                        if(scripted&&player_active){SIZE_T n;DWORD seed=random_state;if(!WriteProcessMemory(process,(void*)(uintptr_t)(context.Eax+0x14),&seed,4,&n)||n!=4)done=2;random_state=random_state*214013u+2531011u;}
                    } else {
                    DWORD bike = context.Esi, ai = 1;
                    if(capture_return&&matched==6)bike-=0x56c;
                    if (matched == 2 && !read_memory(context.Esi, &bike, 4)) done = 2;
                    if (!read_memory(bike + 0x614, &ai, 4)) done = 2;
                    if(matched==0){player_active=ai==0;if(player_active){observed_player=bike;scratch_address=context.Esp+0x54;}}
                    // Ignore an in-flight update when attaching: the first
                    // observed player boundary must be scheduler entry.
                    if (!done && ai == 0 && (matched == 0 || player_frame > 0)) {
                        if (matched == 2) {
                            if (scripted) context.Eax = requested_throttle;
                        } else {
                            if (matched == 0) {
                                if(scripted && player_frame==0 && (!checkpoint(bike,0)||!import_checkpoint(bike)||(!capture_contact&&capture_frame==0&&!export_checkpoint(bike))))done=2;
                                if(scripted && player_frame==400){if(!checkpoint(bike,1))done=2;player_frame=0;pass++;random_state=12345;}
                                if(scripted&&!capture_contact&&pass==0&&capture_frame>0&&player_frame==capture_frame&&!export_current_checkpoint(bike))done=2;
                                requested_throttle = player_frame < 40;requested_brake = 0;
                                requested_steer_bits = player_frame>=20 && player_frame<70 ? 0xbe800000 : 0;
                                DWORD input_world;SIZE_T steer_written;
                                if(!read_memory(0x4e4fb4,&input_world,4)||!WriteProcessMemory(process,(void*)(uintptr_t)(input_world+0x12d4),&requested_steer_bits,4,&steer_written)||steer_written!=4)done=2;
                                if (scripted) {
                                    DWORD dt_bits = 0x3ca3d70a;
                                    SIZE_T written;
                                    if (!WriteProcessMemory(process, (void *)(uintptr_t)(context.Esp + 0xbfc), &dt_bits, 4, &written) || written != 4) done = 2;
                                }
                                player_frame++;
                            }
                            if (!done && matched!=1) {
                                if (!snapshot(out, matched, count++, event.dwThreadId, &context)) done = 2;
                                else start = GetTickCount();
                            }
                        }
                    }
                    if(matched==(capture_effects?6:1))player_active=0;
                    }
                    write_byte(addresses[matched], saved[matched]);
                    armed[matched] = 0;
                    context.Eip = addresses[matched];
                    // An aborted observation resumes the restored instruction
                    // directly. Do not arm a single-step and then detach.
                    if(done)context.EFlags &= ~0x100u;
                    else context.EFlags |= 0x100;
                    context.ContextFlags=CONTEXT_CONTROL|CONTEXT_INTEGER;
                    if (!SetThreadContext(thread, &context)) {
                        TerminateProcess(process, 5);
                        done = 2;
                    }
                    pending = done ? -1 : matched;
                    pending_thread = event.dwThreadId;
                }
                if (thread) CloseHandle(thread);
            } else if (code == EXCEPTION_SINGLE_STEP && pending >= 0 && event.dwThreadId == pending_thread) {
                HANDLE thread = OpenThread(THREAD_GET_CONTEXT | THREAD_SET_CONTEXT, FALSE, event.dwThreadId);
                CONTEXT context = {.ContextFlags = CONTEXT_CONTROL};
                if (!thread || !GetThreadContext(thread, &context)) {
                    TerminateProcess(process, 5);
                    done = 2;
                } else {
                    context.EFlags &= ~0x100u;
                    if (!SetThreadContext(thread, &context)) {
                        TerminateProcess(process, 5);
                        done = 2;
                    }
                }
                if(pending==14&&store_pending){DWORD value;if(!read_memory(scratch_address,&value,4))done=2;else fprintf(render_out,"{\"phase\":\"store-after\",\"frame\":%lu,\"value\":%lu}\n",player_frame-1,value);store_pending=0;}
                if (thread) CloseHandle(thread);
                if (!done && count >= limit){done=capture_contact&&!contact_exported?2:1;if(done==2)fprintf(stderr,"No requested contact boundary captured.\n");}
                int shared_step=0;
                for(unsigned i=0;i<64;i++)if(i!=slot&&pending_steps[i]==pending)shared_step=1;
                if (!done && !shared_step) {
                    write_byte(addresses[pending], 0xcc);
                    armed[pending] = 1;
                }
                pending = -1;
            } else if (code != EXCEPTION_BREAKPOINT) status = DBG_EXCEPTION_NOT_HANDLED;
            pending_steps[slot]=pending;
        }
        // Menu RNG calls can produce debug events continuously. Check the
        // no-progress deadline even when WaitForDebugEvent never times out.
        // Renderer boundaries refresh it; menu RNG events do not.
        // This event still holds the process stopped for instruction cleanup.
        if (!done && GetTickCount() - start >= 30000) {
            fprintf(stderr, "No player-bike records or renderer progress for 30 seconds.\n");
            done = 2;
        }
        if (done) {
            for (unsigned i = 0; i < hook_count; i++) if (armed[i]) {
                write_byte(addresses[i], saved[i]);
                armed[i] = 0;
            }
            // An error while stepping cannot safely leave TF set in the game.
            for(unsigned i=0;i<64;i++)if (pending_steps[i] >= 0) {
                HANDLE thread = OpenThread(THREAD_GET_CONTEXT | THREAD_SET_CONTEXT, FALSE, step_threads[i]);
                CONTEXT context = {.ContextFlags = CONTEXT_CONTROL};
                if (thread && GetThreadContext(thread, &context)) {
                    context.EFlags &= ~0x100u;
                    if (!SetThreadContext(thread, &context)) TerminateProcess(process, 5);
                } else TerminateProcess(process, 5);
                if (thread) CloseHandle(thread);
            }
        }
        ContinueDebugEvent(event.dwProcessId, event.dwThreadId, status);
    }
    DebugActiveProcessStop(pid);
    fclose(render_out);
    fclose(out);
    CloseHandle(process);
    fprintf(stderr, "captured=%lu status=%d\n", count, done);
    return done == 1 ? 0 : 4;
}
