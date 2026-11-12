/* Optional KERNEL32 import resolution for helpers that enter CRT error paths.
 * Unrelated game imports remain unresolved.
 * This performs import binding only; it does not run the game's entry point.
 */
static void bind_oracle_kernel_imports(void) {
 uint8_t*base=(void*)0x20000000;
 IMAGE_DOS_HEADER*dos=(void*)base;
 IMAGE_NT_HEADERS32*pe=(void*)(base+dos->e_lfanew);
 IMAGE_DATA_DIRECTORY dir=pe->OptionalHeader.DataDirectory[IMAGE_DIRECTORY_ENTRY_IMPORT];
 if(!dir.Size||dir.VirtualAddress+dir.Size>pe->OptionalHeader.SizeOfImage)fail("invalid imports");
 IMAGE_IMPORT_DESCRIPTOR*d=(void*)(base+dir.VirtualAddress);
 for(;d->Name;d++) {
  if(lstrcmpiA((char*)base+d->Name,"KERNEL32.dll"))continue;
  HMODULE module=LoadLibraryA((char*)base+d->Name);if(!module){fprintf(stderr,"module: %s\n",(char*)base+d->Name);fail("load imported module");}
  DWORD*lookup=(void*)(base+(d->OriginalFirstThunk?d->OriginalFirstThunk:d->FirstThunk));
  DWORD*target=(void*)(base+d->FirstThunk);
  for(;*lookup;lookup++,target++) {
   const char*name=(*lookup&IMAGE_ORDINAL_FLAG32)?(const char*)(uintptr_t)(*lookup&0xffff):(char*)base+*lookup+2;
   FARPROC proc=GetProcAddress(module,name);if(!proc)fail("resolve imported symbol");
   *target=(DWORD)(uintptr_t)proc;
  }
 }
}
