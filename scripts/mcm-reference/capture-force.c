// Live drive-force validation at the whole-bike caller before/after the call.
// Experimental: not yet validated in a successful live capture.
// Observes force inputs/outputs; does not replace input, RNG or physics code.
#include <windows.h>
#include <stdio.h>
#include <stdint.h>
#include <stdlib.h>

static const DWORD addresses[] = {0x4a7c67, 0x4a7c6c};
static const BYTE expected[][6] = {{0xe8,0x14,0x5d,0x00,0x00}, {0xd9,0x84,0x24,0x0c,0x03,0x00}};
static const unsigned lengths[] = {5, 6};
static BYTE saved[2];
static int armed[2];
static HANDLE process;

static int read_memory(DWORD address, void *buffer, SIZE_T size) {
    SIZE_T count;
    int ok = ReadProcessMemory(process, (void *)(uintptr_t)address, buffer, size, &count) && count == size;
    if (!ok) fprintf(stderr,"read failure address=%08lx size=%lu error=%lu\n",address,(DWORD)size,GetLastError());
    return ok;
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

static DWORD active_engine,output_vector,output_scalar,active_thread;
static int snapshot(FILE*out,unsigned phase,DWORD sequence,DWORD thread,CONTEXT*c){
    (void)sequence;
    if(!phase){
        DWORD args[4],bike,ai,scale,ai_scale,direction[3];BYTE engine[0x16c];
        if(active_engine)return 0;
        if(!read_memory(c->Ecx,&bike,4)||!read_memory(bike+0x614,&ai,4))return 0;
        if(ai)return 1;
        if(!read_memory(c->Esp,args,16)||!read_memory(args[1],direction,12)||!read_memory(c->Ecx,engine,sizeof engine)||!read_memory(0x4d9968,&scale,4)||!read_memory(bike+0xba8,&ai_scale,4))return 0;
        active_engine=c->Ecx;active_thread=thread;output_vector=args[2];output_scalar=args[3];
        fprintf(out,"{\"phase\":\"before\",\"engine\":%lu,\"thread\":%lu,\"cw\":%lu,\"speedBits\":%lu,\"forceScaleBits\":%lu,\"ai\":%lu,\"aiScaleBits\":%lu,\"directionBits\":[%lu,%lu,%lu],\"engineHex\":\"",active_engine,thread,c->FloatSave.ControlWord,args[0],scale,ai,ai_scale,direction[0],direction[1],direction[2]);
        for(unsigned i=0;i<sizeof engine;i++)fprintf(out,"%02x",engine[i]);
        fprintf(out,"\"}\n");
    }else if(active_engine){
        DWORD scalar,vector[3];
        if(thread!=active_thread||!read_memory(output_scalar,&scalar,4)||!read_memory(output_vector,vector,12))return 0;
        fprintf(out,"{\"phase\":\"after\",\"engine\":%lu,\"thread\":%lu,\"cw\":%lu,\"outputBits\":[%lu,%lu,%lu,%lu]}\n",active_engine,thread,c->FloatSave.ControlWord,scalar,vector[0],vector[1],vector[2]);
        active_engine=0;
    }
    return !ferror(out);
}

int main(int argc, char **argv) {
    if (argc != 4) {
        fprintf(stderr, "Usage: capture-live.exe WINDOWS_PID output.jsonl even-record-count\n");
        return 2;
    }
    DWORD pid = strtoul(argv[1], NULL, 0), limit = strtoul(argv[3], NULL, 0);
    if (!pid || limit < 2 || limit > 10000 || (limit & 1)) return 2;
    FILE *out = fopen(argv[2], "wx");
    if (!out) return 2;
    setbuf(out, NULL);
    process = OpenProcess(PROCESS_ALL_ACCESS, FALSE, pid);
    // This instruction guard prevents attaching to another executable version.
    // The caller must also verify mcm.exe's SHA-256 as documented in README.
    for (unsigned i = 0; i < 2; i++) {
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
            for (unsigned i = 0; i < 2; i++) if (armed[i] && address == addresses[i]) matched = i;
            if (code == EXCEPTION_BREAKPOINT && !installed && !done) {
                for (unsigned i = 0; i < 2; i++) {
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
                    if (!snapshot(out, matched, count++, event.dwThreadId, &context)) done = 2;
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
                if (!done && count >= limit && pending == 1) done = 1;
                if (!done) {
                    write_byte(addresses[pending], 0xcc);
                    armed[pending] = 1;
                }
                pending = -1;
            } else if (code != EXCEPTION_BREAKPOINT) status = DBG_EXCEPTION_NOT_HANDLED;
        }
        if (done) {
            for (unsigned i = 0; i < 2; i++) if (armed[i]) {
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
