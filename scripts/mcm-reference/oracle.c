/* Executes selected instructions from the user's pinned PE in an isolated process.
 * Compile as 32-bit Windows, with this harness based away from 0x400000.
 * The scheduler exit jump modifies only this process's private mapped image.
 * No imports, game entry point or game assets are invoked by this helper oracle.
 */
#include <windows.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

uint8_t bike[0x900];
uint32_t delta_bits, iterations, dt_bits;
double inverse_dt;
void scheduler(void);
void scheduler_exit(void);
__asm__(
".text\n"
"_scheduler:\n"
" push %ebp\n push %ebx\n push %esi\n push %edi\n sub $0xc00,%esp\n"
" mov $_bike,%esi\n mov _delta_bits,%eax\n mov %eax,0xbfc(%esp)\n"
" mov $0x200a54b6,%eax\n jmp *%eax\n"
"_scheduler_exit:\n"
" fstpl _inverse_dt\n mov 0x20(%esp),%eax\n mov %eax,_iterations\n"
" mov 0x10(%esp),%eax\n mov %eax,_dt_bits\n"
" add $0xc00,%esp\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n"
);
static void fail(const char *message) { fprintf(stderr,"%s (Win32 %lu)\n",message,GetLastError()); exit(1); }
static uint32_t bits(float v) { uint32_t u; memcpy(&u,&v,4); return u; }
static float value(uint32_t u) { float v; memcpy(&v,&u,4); return v; }
static void put32(size_t offset,uint32_t v) { memcpy(bike+offset,&v,4); }
static uint32_t get32(size_t offset) { uint32_t v;memcpy(&v,bike+offset,4);return v; }
static void map_image(const char *path) {
 uint8_t *base=VirtualAlloc((void*)0x20000000,0x139000,MEM_RESERVE|MEM_COMMIT,PAGE_EXECUTE_READWRITE);
 if(base!=(void*)0x20000000)fail("cannot reserve reference image base");
 FILE *f=fopen(path,"rb");if(!f)fail("open executable");
 fseek(f,0,SEEK_END);long n=ftell(f);rewind(f);
 if(n!=1036800)fail("unexpected executable size; run through verified JS driver");
 uint8_t *raw=malloc(n);if(!raw||fread(raw,1,n,f)!=(size_t)n)fail("read executable");fclose(f);
 IMAGE_DOS_HEADER *dos=(void*)raw;
 if(dos->e_magic!=IMAGE_DOS_SIGNATURE || dos->e_lfanew<0 || (size_t)dos->e_lfanew>n-sizeof(IMAGE_NT_HEADERS32))fail("invalid DOS header");
 IMAGE_NT_HEADERS32 *pe=(void*)(raw+dos->e_lfanew);
 if(pe->Signature!=IMAGE_NT_SIGNATURE||pe->FileHeader.Machine!=IMAGE_FILE_MACHINE_I386||pe->OptionalHeader.ImageBase!=0x400000)fail("unexpected PE");
 size_t size=pe->OptionalHeader.SizeOfImage;
 if(size!=0x139000)fail("unexpected image size");
 if(pe->OptionalHeader.SizeOfHeaders>(size_t)n||pe->OptionalHeader.SizeOfHeaders>size)fail("invalid header size");
 memcpy(base,raw,pe->OptionalHeader.SizeOfHeaders);
 IMAGE_SECTION_HEADER *s=IMAGE_FIRST_SECTION(pe);
 for(unsigned i=0;i<pe->FileHeader.NumberOfSections;i++,s++) {
  if((uint8_t*)(s+1)>raw+n || (uint64_t)s->PointerToRawData+s->SizeOfRawData>(size_t)n || (uint64_t)s->VirtualAddress+s->SizeOfRawData>size)fail("invalid section");
  memcpy(base+s->VirtualAddress,raw+s->PointerToRawData,s->SizeOfRawData);
 }
 // Apply the executable's own PE base relocations, as a Windows loader does.
 IMAGE_DATA_DIRECTORY reloc=pe->OptionalHeader.DataDirectory[IMAGE_DIRECTORY_ENTRY_BASERELOC];
 if(!reloc.Size || (uint64_t)reloc.VirtualAddress+reloc.Size>size)fail("invalid relocations");
 size_t cursor=reloc.VirtualAddress,end=cursor+reloc.Size;
 while(cursor<end) {
  IMAGE_BASE_RELOCATION *block=(void*)(base+cursor);
  if(end-cursor<8||block->SizeOfBlock<8||block->SizeOfBlock>end-cursor)fail("invalid relocation block");
  WORD *entries=(void*)(block+1);
  for(size_t i=0;i<(block->SizeOfBlock-8)/2;i++) {
   unsigned type=entries[i]>>12;size_t offset=block->VirtualAddress+(entries[i]&0xfff);
   if(!type)continue;
   if(type!=IMAGE_REL_BASED_HIGHLOW||offset+4>size)fail("unsupported relocation");
   uint32_t v;memcpy(&v,base+offset,4);v+=0x1fc00000;memcpy(base+offset,&v,4);
  }
  cursor+=block->SizeOfBlock;
 }
 free(raw);
 uint8_t *exit=(void*)0x200a5552;exit[0]=0xe9;
 int32_t rel=(intptr_t)scheduler_exit-(intptr_t)(exit+5);memcpy(exit+1,&rel,4);
 FlushInstructionCache(GetCurrentProcess(),base,size);
}
int main(int argc,char **argv) {
 if(argc!=4){fprintf(stderr,"oracle.exe mcm.exe cases.txt results.jsonl\n");return 2;}
 map_image(argv[1]);
 FILE *in=fopen(argv[2],"r"),*out=fopen(argv[3],"w");if(!in||!out)fail("open cases/results");
 char kind[24];unsigned a,b,cw;
 while(fscanf(in,"%23s %x %x %x",kind,&a,&b,&cw)==4) {
  unsigned short control=(unsigned short)cw;
  __asm__ volatile("fninit; fldcw %0"::"m"(control));
  if(!strcmp(kind,"sqrt")) {
   ((void (*)(void))0x20001640)();
   float result=((float (*)(float))0x200016c0)(value(a));
   fprintf(out,"{\"kind\":\"sqrt\",\"controlWord\":%u,\"inputBits\":%u,\"outputBits\":%u}\n",cw,a,bits(result));
  } else if(!strcmp(kind,"schedule")) {
   memset(bike,0,sizeof bike);delta_bits=a;put32(0x8c8,b);put32(0x8cc,0x3ca3d70a);put32(0x8d4,10);
   scheduler();
   fprintf(out,"{\"kind\":\"schedule\",\"controlWord\":%u,\"deltaBits\":%u,\"carryBits\":%u,\"iterations\":%u,\"dtBits\":%u,\"remainderBits\":%u,\"inverseDt\":%.17g}\n",cw,a,b,iterations,dt_bits,get32(0x8c8),inverse_dt);
  } else fail("unknown case");
 }
 if(!feof(in))fail("malformed case");
 if(fclose(out))fail("write results");
 fclose(in);return 0;
}
