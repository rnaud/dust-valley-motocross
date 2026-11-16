// Wine 11 x86 TEB HeapVirtualAffinity is at +0xfa8. Query the stopped
// simulation thread's TEB, never the debugger helper's own thread state.
static int capture_heap_thread(FILE*out,DWORD threadId,const char*captureId){
 typedef LONG (WINAPI*QueryThread)(HANDLE,ULONG,PVOID,ULONG,PULONG);
 struct ThreadBasic {LONG exitStatus;PVOID teb;HANDLE processId,threadId;ULONG affinity;LONG priority,basePriority;} info;
 QueryThread query=(QueryThread)GetProcAddress(GetModuleHandleA("ntdll.dll"),"NtQueryInformationThread");
 if(!query)return 0;HANDLE thread=OpenThread(THREAD_QUERY_INFORMATION,FALSE,threadId);if(!thread)return 0;
 LONG status=query(thread,0,&info,sizeof info,NULL);CloseHandle(thread);if(status<0||!info.teb||(DWORD)(uintptr_t)info.threadId!=threadId)return 0;
 DWORD affinity;if(!read_memory((DWORD)(uintptr_t)info.teb+0xfa8,&affinity,4)||affinity>31)return 0;
 fprintf(out,"{\"captureId\":\"%s\",\"thread\":%lu,\"teb\":%u,\"heapVirtualAffinity\":%lu}",captureId,threadId,(unsigned)(uintptr_t)info.teb,affinity);return !ferror(out);
}
