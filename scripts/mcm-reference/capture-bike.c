// Experimental controlled player replay for the pinned retail executable.
// MCM_SCRIPTED enables dt=.02, throttle on frames [50,200), and RNG seed 12345.
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

static DWORD addresses[] = {0x4a54b6, 0x4ad0e1, 0x4ad5a2, 0x4bf195, 0x40e990, 0x42ce38};
static BYTE expected[][6] = {{0xd9, 0x86, 0xc8, 0x08, 0, 0},
                                  {0x8b, 0x86, 0xf8, 0x04, 0, 0}, {0x85, 0xc0}, {0x8b, 0x48, 0x14}, {0x8b,0x44,0x24,0x04}, {0x8b,0x44,0xbe,0x08}};
static unsigned lengths[] = {6, 6, 2, 3, 4, 4};
static BYTE saved[6];
static int armed[6];
static HANDLE process;
static int capture_tires,capture_motion,capture_controls,capture_loop_rider;
static int scripted, capture_stack, capture_rider_timing, fixed_rider, capture_collision, checkpoint_collision_callbacks, checkpoint_collision_pairs;
static unsigned hook_count=4;
static DWORD rider_update_count, rider_dt_bits, rider_observed_dt_bits;
static int capture_contact,contact_exported;
static const char*export_boundary="player-frame-entry";
static DWORD capture_frame;
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
            phase ? (capture_tires?"after-tires":capture_motion?"after-motion":capture_controls?"after-controls":capture_loop_rider?"after-loop-rider":"after-update") : "before-update", sequence, context->Esi,
            thread, context->FloatSave.ControlWord, frame, carry, nominal, cap, dt, steps);
    for (unsigned i = 0; i < sizeof object; i++) fprintf(out, "%02x", object[i]);
    fprintf(out, "\",\"engineAddress\":\"%08lx\",\"engineHex\":\"", engine);
    for (unsigned i = 0; i < sizeof engine_state; i++) fprintf(out, "%02x", engine_state[i]);
    fprintf(out, "\",\"transformAddress\":\"%08lx\",\"matrixHex\":\"", transform);
    for (unsigned i = 0; i < sizeof matrix; i++) fprintf(out, "%02x", matrix[i]);
    fprintf(out,"\",\"riderAddress\":\"%08lx\",\"riderHex\":\"",rider);
    for(unsigned i=0;i<sizeof rider_state;i++)fprintf(out,"%02x",rider_state[i]);
    fprintf(out,"\"");
    if(capture_loop_rider){
        DWORD effect;BYTE bytes[16];if(!read_memory(context->Esi+0x904,&effect,4)||!read_memory(effect,bytes,16))return 0;
        fprintf(out,",\"effectAddress\":%lu,\"effectHex\":\"",effect);for(unsigned i=0;i<16;i++)fprintf(out,"%02x",bytes[i]);fprintf(out,"\"");
    }
    if(capture_collision&&!observe_rider_collision(out,rider))return 0;
    if(capture_stack){
        fprintf(out,",\"stackAddress\":\"%08lx\",\"stackHex\":\"",context->Esp);
        for(unsigned i=0;i<sizeof frame_stack;i++)fprintf(out,"%02x",frame_stack[i]);
        fprintf(out,"\"");
    }
    if(capture_rider_timing)fprintf(out,",\"riderUpdateCount\":%lu,\"riderDtBits\":%lu",rider_update_count,rider_dt_bits);
    if(capture_rider_timing)fprintf(out,",\"riderObservedDtBits\":%lu,\"fixedRider\":%s",rider_observed_dt_bits,fixed_rider?"true":"false");
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
    const char*frame_arg=getenv("MCM_CAPTURE_FRAME");
    if(frame_arg&&capture_contact){fprintf(stderr,"Choose frame or contact capture, not both.\n");return 2;}
    if(frame_arg){char*end;capture_frame=strtoul(frame_arg,&end,10);if(!*frame_arg||*end||!scripted||capture_frame>399||limit<2*(capture_frame+1)){fprintf(stderr,"Invalid requested capture frame.\n");return 2;}}
    if (!pid || limit < 2 || limit > 10000 || (limit & 1)) return 2;
    FILE *out = fopen(argv[2], "wx");
    if (!out) return 2;
    setbuf(out, NULL);
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
            for (unsigned i = 0; i < hook_count; i++) if (armed[i] && address == addresses[i]) matched = i;
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
                    if(matched==5){
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
                            rider_update_count++;
                        }
                    } else if(matched==3) {
                        if(scripted&&player_active){SIZE_T n;DWORD seed=random_state;if(!WriteProcessMemory(process,(void*)(uintptr_t)(context.Eax+0x14),&seed,4,&n)||n!=4)done=2;random_state=random_state*214013u+2531011u;}
                    } else {
                    DWORD bike = context.Esi, ai = 1;
                    if (matched == 2 && !read_memory(context.Esi, &bike, 4)) done = 2;
                    if (!read_memory(bike + 0x614, &ai, 4)) done = 2;
                    if(matched==0)player_active=ai==0;
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
                if (!done && count >= limit){done=capture_contact&&!contact_exported?2:1;if(done==2)fprintf(stderr,"No requested contact boundary captured.\n");}
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
            for (unsigned i = 0; i < hook_count; i++) if (armed[i]) {
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
