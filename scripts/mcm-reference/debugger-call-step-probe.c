// Isolated Wine debugger reproduction. Never attaches to the game.
// Default hooks MOV before a direct CALL. -DHOOK_CALL=1 reproduces the
// direct-call failure; add -DINDIRECT_CALL=1 for the indirect-call control.
#ifndef HOOK_CALL
#define HOOK_CALL 0
#endif
#ifndef INDIRECT_CALL
#define INDIRECT_CALL 0
#endif
#if INDIRECT_CALL
#define TEST_CALL "call *_copy_target; "
#else
#define TEST_CALL "call _copy_words; "
#endif
#if HOOK_CALL
#define TEST_SETUP "mov %[src],%%ecx; .global _copy_call; _copy_call: "
#else
#define TEST_SETUP ".global _copy_call; _copy_call: mov %[src],%%ecx; "
#endif
#include <windows.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
extern void copy_call(void),copy_done(void);
__attribute__((naked,noinline,used)) static void copy_words(void){__asm__ volatile("push %esi; push %edi; mov %ecx,%esi; mov 12(%esp),%edi; mov $16,%ecx; rep movsl; pop %edi; pop %esi; ret $4");}
__attribute__((used)) void (*copy_target)(void)=copy_words;
static int child(void){unsigned a[16],b[16];for(unsigned i=0;i<16;i++)a[i]=0x12345678+i;for(unsigned k=0;k<100;k++){memset(b,0,sizeof(b));__asm__ volatile("push %[dest]; " TEST_SETUP TEST_CALL ".global _copy_done; _copy_done: nop"::[dest]"r"(b),[src]"r"(a):"ecx","memory");if(memcmp(a,b,sizeof(a)))return 9;}return 0;}
int main(int argc,char**argv){if(argc>1)return child();(void)argv;char path[MAX_PATH],cmd[MAX_PATH+20];GetModuleFileNameA(NULL,path,sizeof(path));snprintf(cmd,sizeof(cmd),"\"%s\" child",path);STARTUPINFOA si={.cb=sizeof(si)};PROCESS_INFORMATION pi; if(!CreateProcessA(NULL,cmd,NULL,NULL,FALSE,DEBUG_ONLY_THIS_PROCESS,NULL,NULL,&si,&pi))return 2;
 BYTE saved=0,trap=0xcc;SIZE_T n;DWORD addr=(DWORD)(uintptr_t)copy_call;int installed=0,pending=0,hits=0;DWORD code=99;
 for(;;){DEBUG_EVENT e;if(!WaitForDebugEvent(&e,10000)){TerminateProcess(pi.hProcess,8);return 8;}DWORD status=DBG_CONTINUE;
 if(e.dwDebugEventCode==CREATE_PROCESS_DEBUG_EVENT&&e.u.CreateProcessInfo.hFile)CloseHandle(e.u.CreateProcessInfo.hFile);
 if(e.dwDebugEventCode==LOAD_DLL_DEBUG_EVENT&&e.u.LoadDll.hFile)CloseHandle(e.u.LoadDll.hFile);
 if(e.dwDebugEventCode==EXIT_PROCESS_DEBUG_EVENT){code=e.u.ExitProcess.dwExitCode;ContinueDebugEvent(e.dwProcessId,e.dwThreadId,status);break;}
 if(e.dwDebugEventCode==EXCEPTION_DEBUG_EVENT){DWORD ex=e.u.Exception.ExceptionRecord.ExceptionCode,at=(DWORD)(uintptr_t)e.u.Exception.ExceptionRecord.ExceptionAddress;
 if(ex==EXCEPTION_BREAKPOINT&&!installed){ReadProcessMemory(pi.hProcess,(void*)(uintptr_t)addr,&saved,1,&n);WriteProcessMemory(pi.hProcess,(void*)(uintptr_t)addr,&trap,1,&n);FlushInstructionCache(pi.hProcess,(void*)(uintptr_t)addr,1);installed=1;}
 else if(ex==EXCEPTION_BREAKPOINT&&at==addr){CONTEXT c={.ContextFlags=CONTEXT_CONTROL|CONTEXT_INTEGER};GetThreadContext(pi.hThread,&c);if(!hits)printf("before ip=%08lx sp=%08lx cx=%08lx ax=%08lx dx=%08lx\n",c.Eip,c.Esp,c.Ecx,c.Eax,c.Edx);WriteProcessMemory(pi.hProcess,(void*)(uintptr_t)addr,&saved,1,&n);FlushInstructionCache(pi.hProcess,(void*)(uintptr_t)addr,1);c.Eip=addr;c.EFlags|=0x100;c.ContextFlags=CONTEXT_CONTROL;SetThreadContext(pi.hThread,&c);pending=1;hits++;}
 else if(ex==EXCEPTION_SINGLE_STEP&&pending){CONTEXT c={.ContextFlags=CONTEXT_CONTROL|CONTEXT_INTEGER};GetThreadContext(pi.hThread,&c);if(hits==1)printf("step ip=%08lx sp=%08lx cx=%08lx ax=%08lx dx=%08lx\n",c.Eip,c.Esp,c.Ecx,c.Eax,c.Edx);c.ContextFlags=CONTEXT_CONTROL;c.EFlags&=~0x100u;SetThreadContext(pi.hThread,&c);WriteProcessMemory(pi.hProcess,(void*)(uintptr_t)addr,&trap,1,&n);FlushInstructionCache(pi.hProcess,(void*)(uintptr_t)addr,1);pending=0;}
 else{fprintf(stderr,"exception=%08lx at=%08lx first=%lu\n",ex,at,e.u.Exception.dwFirstChance);status=DBG_EXCEPTION_NOT_HANDLED;}}
 ContinueDebugEvent(e.dwProcessId,e.dwThreadId,status);
 }CloseHandle(pi.hThread);CloseHandle(pi.hProcess);printf("calls=%d childExit=%lu\n",hits,code);return code||hits!=100;}
