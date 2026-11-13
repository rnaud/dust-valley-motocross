// Experimental controlled player replay for the pinned retail executable.
// MCM_SCRIPTED enables dt=.02, throttle on frames [50,200), and RNG seed 12345.
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

static const DWORD addresses[] = {0x4a54b6, 0x4ad0e1, 0x4ad5a2, 0x4bf195};
static const BYTE expected[][6] = {{0xd9, 0x86, 0xc8, 0x08, 0, 0},
                                  {0x8b, 0x86, 0xf8, 0x04, 0, 0}, {0x85, 0xc0}, {0x8b, 0x48, 0x14}};
static const unsigned lengths[] = {6, 6, 2, 3};
static BYTE saved[4];
static int armed[4];
static HANDLE process;
static int scripted, capture_stack;
static DWORD player_frame, requested_throttle, pass, random_state=12345;
static int player_active;

static int read_memory(DWORD address, void *buffer, SIZE_T size) {
    SIZE_T count;
    return ReadProcessMemory(process, (void *)(uintptr_t)address, buffer, size, &count) && count == size;
}

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
    DWORD proxy,vtable,engine,filter,contact_component,contact_node;
    return save_components(bike)&&read_memory(bike+0x8ec,&contact_component,4)&&
        read_memory(contact_component+0x50,&contact_node,4)&&contact_node&&save_tree(contact_node)&&
        read_memory(bike+0xc8c,&proxy,4)&&
        read_memory(proxy,&vtable,4)&&vtable==0x4d7b14&&save_block(proxy,0x438)&&save_components(proxy)&&
        read_memory(bike+0x8f0,&engine,4)&&read_memory(engine+4,&filter,4)&&save_block(filter,0x10);
}

// Export only blocks already read by the existing partial checkpoint. This does
// not expand the set of objects restored between controlled passes.
static int export_checkpoint(DWORD bike) {
    const char *path=getenv("MCM_CHECKPOINT");
    const char *animations=getenv("MCM_ANIMATIONS");
    if(!path||!*path)return !(animations&&*animations);
    char capture_id[17]={0};
    if(animations&&*animations){
        LARGE_INTEGER stamp;if(!QueryPerformanceCounter(&stamp))return 0;
        snprintf(capture_id,sizeof capture_id,"%08lx%08lx",(DWORD)stamp.HighPart,stamp.LowPart);
        if(!capture_mcm_animation_assets(process,bike,animations,capture_id))return 0;
    }
    FILE *out=fopen(path,"wx");if(!out)return 0;
    fprintf(out,"{\"schemaVersion\":1,\"kind\":\"mcm-partial-local-checkpoint\",\"bikeAddress\":%lu,\"blockCount\":%u,\"blocks\":[",bike,block_count);
    for(unsigned i=0;i<block_count;i++){
        const Block*b=&blocks[i];
        fprintf(out,"%s{\"address\":%lu,\"size\":%lu,\"hex\":\"",i?",":"",b->address,b->size);
        for(DWORD j=0;j<b->size;j++)fprintf(out,"%02x",b->bytes[j]);
        fprintf(out,"\"}");
    }
    fprintf(out,"]");if(capture_id[0])fprintf(out,",\"captureId\":\"%s\",\"captureBoundary\":\"player-frame-entry\"",capture_id);
    fprintf(out,"}\n");const int failed=ferror(out);return fclose(out)==0&&!failed;
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

static int snapshot(FILE *out, unsigned phase, DWORD sequence, DWORD thread, CONTEXT *context) {
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
            phase ? "after-update" : "before-update", sequence, context->Esi,
            thread, context->FloatSave.ControlWord, frame, carry, nominal, cap, dt, steps);
    for (unsigned i = 0; i < sizeof object; i++) fprintf(out, "%02x", object[i]);
    fprintf(out, "\",\"engineAddress\":\"%08lx\",\"engineHex\":\"", engine);
    for (unsigned i = 0; i < sizeof engine_state; i++) fprintf(out, "%02x", engine_state[i]);
    fprintf(out, "\",\"transformAddress\":\"%08lx\",\"matrixHex\":\"", transform);
    for (unsigned i = 0; i < sizeof matrix; i++) fprintf(out, "%02x", matrix[i]);
    fprintf(out,"\",\"riderAddress\":\"%08lx\",\"riderHex\":\"",rider);
    for(unsigned i=0;i<sizeof rider_state;i++)fprintf(out,"%02x",rider_state[i]);
    fprintf(out,"\"");
    if(capture_stack){
        fprintf(out,",\"stackAddress\":\"%08lx\",\"stackHex\":\"",context->Esp);
        for(unsigned i=0;i<sizeof frame_stack;i++)fprintf(out,"%02x",frame_stack[i]);
        fprintf(out,"\"");
    }
    fprintf(out, ",\"scripted\":%s,\"playerFrame\":%lu,\"requestedThrottle\":%lu,\"pass\":%lu,\"randomState\":%lu}\n", scripted ? "true" : "false", player_frame - 1, requested_throttle,pass,random_state);
    return !ferror(out);
}

int main(int argc, char **argv) {
    if (argc != 4) {
        fprintf(stderr, "Usage: capture-live.exe WINDOWS_PID output.jsonl even-record-count\n");
        return 2;
    }
    scripted = getenv("MCM_SCRIPTED") != NULL;
    capture_stack = getenv("MCM_STACK") != NULL;
    DWORD pid = strtoul(argv[1], NULL, 0), limit = strtoul(argv[3], NULL, 0);
    if (!pid || limit < 2 || limit > 10000 || (limit & 1)) return 2;
    FILE *out = fopen(argv[2], "wx");
    if (!out) return 2;
    setbuf(out, NULL);
    process = OpenProcess(PROCESS_ALL_ACCESS, FALSE, pid);
    // This instruction guard prevents attaching to another executable version.
    // The caller must also verify mcm.exe's SHA-256 as documented in README.
    for (unsigned i = 0; i < 4; i++) {
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
    int installed = 0, pending = -1, done = 0;
    DWORD pending_thread = 0, count = 0, start = GetTickCount();
    while (!done) {
        DEBUG_EVENT event;
        DWORD status = DBG_CONTINUE;
        if (!WaitForDebugEvent(&event, 500)) {
            if (GetTickCount() - start < 30000) continue;
            fprintf(stderr, "No player-bike records for 30 seconds.\n");
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
            int matched = -1;
            for (unsigned i = 0; i < 4; i++) if (armed[i] && address == addresses[i]) matched = i;
            if (code == EXCEPTION_BREAKPOINT && !installed && !done) {
                for (unsigned i = 0; i < 4; i++) {
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
                    if(matched==3) {
                        if(scripted&&player_active){SIZE_T n;DWORD seed=random_state;if(!WriteProcessMemory(process,(void*)(uintptr_t)(context.Eax+0x14),&seed,4,&n)||n!=4)done=2;random_state=random_state*214013u+2531011u;}
                    } else {
                    DWORD bike = context.Esi, ai = 1;
                    if (matched == 2 && !read_memory(context.Esi, &bike, 4)) done = 2;
                    if (!read_memory(bike + 0x614, &ai, 4)) done = 2;
                    if(matched==0)player_active=ai==0;
                    if (!done && ai == 0) {
                        if (matched == 2) {
                            if (scripted) context.Eax = requested_throttle;
                        } else {
                            if (matched == 0) {
                                if(scripted && player_frame==0 && (!checkpoint(bike,0)||!export_checkpoint(bike)))done=2;
                                if(scripted && player_frame==400){if(!checkpoint(bike,1))done=2;player_frame=0;pass++;random_state=12345;}
                                requested_throttle = player_frame >= 50 && player_frame < 200;
                                if (scripted) {
                                    DWORD dt_bits = 0x3ca3d70a;
                                    SIZE_T written;
                                    if (!WriteProcessMemory(process, (void *)(uintptr_t)(context.Esp + 0xbfc), &dt_bits, 4, &written) || written != 4) done = 2;
                                }
                                player_frame++;
                            }
                            if (!done) {
                                if (!snapshot(out, matched, count++, event.dwThreadId, &context)) done = 2;
                                else start = GetTickCount();
                            }
                        }
                    }
                    if(matched==1)player_active=0;
                    }
                    write_byte(addresses[matched], saved[matched]);
                    armed[matched] = 0;
                    context.Eip = addresses[matched];
                    context.EFlags |= 0x100; // Execute the restored instruction once.
                    if (!SetThreadContext(thread, &context)) {
                        TerminateProcess(process, 5);
                        done = 2;
                    }
                    pending = matched;
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
                if (thread) CloseHandle(thread);
                if (!done && count >= limit) done = 1;
                if (!done) {
                    write_byte(addresses[pending], 0xcc);
                    armed[pending] = 1;
                }
                pending = -1;
            } else if (code != EXCEPTION_BREAKPOINT) status = DBG_EXCEPTION_NOT_HANDLED;
        }
        // Menu RNG calls can produce debug events continuously. Check the
        // no-record deadline even when WaitForDebugEvent never times out.
        // This event still holds the process stopped for instruction cleanup.
        if (!done && GetTickCount() - start >= 30000) {
            fprintf(stderr, "No player-bike records for 30 seconds.\n");
            done = 2;
        }
        if (done) {
            for (unsigned i = 0; i < 4; i++) if (armed[i]) {
                write_byte(addresses[i], saved[i]);
                armed[i] = 0;
            }
            // An error while stepping cannot safely leave TF set in the game.
            if (pending >= 0) {
                HANDLE thread = OpenThread(THREAD_GET_CONTEXT | THREAD_SET_CONTEXT, FALSE, pending_thread);
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
    fclose(out);
    CloseHandle(process);
    fprintf(stderr, "captured=%lu status=%d\n", count, done);
    return done == 1 ? 0 : 4;
}
