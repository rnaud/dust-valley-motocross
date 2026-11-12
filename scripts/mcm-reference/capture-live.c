// Experimental Wine debugger capture for the pinned retail executable.
// Captures scheduler boundaries plus the 0xcc8-byte bike allocation.
// This is NOT a complete state/replay format: pointed-to objects are not followed.
// Breakpoints slow execution and consequently change the observed frame deltas.
#include <windows.h>
#include <stdio.h>
#include <stdint.h>
#include <stdlib.h>

static const DWORD addresses[] = {0x4a54b6, 0x4a5552};
static const BYTE expected[][6] = {{0xd9, 0x86, 0xc8, 0x08, 0, 0},
                                  {0xa1, 0xb4, 0x4f, 0x4e, 0}};
static const unsigned lengths[] = {6, 5};
static BYTE saved[2];
static int armed[2];
static HANDLE process;

static int read_memory(DWORD address, void *buffer, SIZE_T size) {
    SIZE_T count;
    return ReadProcessMemory(process, (void *)(uintptr_t)address, buffer, size, &count) && count == size;
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
    DWORD frame, carry, nominal, cap, dt, steps;
    unsigned char object[0xcc8];
    if (!read_memory(context->Esi, object, sizeof object) ||
        !read_memory(context->Esp + 0xbfc, &frame, 4) ||
        !read_memory(context->Esi + 0x8c8, &carry, 4) ||
        !read_memory(context->Esi + 0x8cc, &nominal, 4) ||
        !read_memory(context->Esi + 0x8d4, &cap, 4) ||
        !read_memory(context->Esp + 0x10, &dt, 4) ||
        !read_memory(context->Esp + 0x20, &steps, 4)) return 0;
    fprintf(out, "{\"phase\":\"%s\",\"sequence\":%lu,\"bike\":\"%08lx\","
                 "\"thread\":%lu,\"cw\":%lu,\"frameBits\":%lu,\"carryBits\":%lu,"
                 "\"nominalBits\":%lu,\"cap\":%lu,\"dtBits\":%lu,\"steps\":%lu,\"stateHex\":\"",
            phase ? "after-scheduler" : "before-scheduler", sequence, context->Esi,
            thread, context->FloatSave.ControlWord, frame, carry, nominal, cap, dt, steps);
    for (unsigned i = 0; i < sizeof object; i++) fprintf(out, "%02x", object[i]);
    fprintf(out, "\"}\n");
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
                if (!done && count >= limit) done = 1;
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
