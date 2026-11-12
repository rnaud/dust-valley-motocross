/* Original axis/angle preparation; exit jumps avoid invoking transform mutation. */
#define main unused_helper_main
#include "oracle.c"
#undef main
uint32_t rotation_dt,rotation_angle,rotation_apply;
void rotation_step(void);void rotation_skip(void);void rotation_ready(void);
__asm__(
".text\n_rotation_step:\n"
" push %ebp\n push %ebx\n push %esi\n push %edi\n sub $0xc00,%esp\n"
" mov $_bike,%esi\n mov _rotation_dt,%eax\n mov %eax,0x10(%esp)\n"
" mov $0x200ab688,%eax\n jmp *%eax\n"
"_rotation_ready:\n movl $1,_rotation_apply\n jmp _rotation_end\n"
"_rotation_skip:\n movl $0,_rotation_apply\n"
"_rotation_end:\n mov 0xa0(%esp),%eax\n mov %eax,_rotation_angle\n"
" add $0xc00,%esp\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n"
);
static void patch_exit(uintptr_t address,void(*target)(void)) {
 uint8_t*p=(void*)address;p[0]=0xe9;int32_t offset=(intptr_t)target-(intptr_t)(p+5);memcpy(p+1,&offset,4);FlushInstructionCache(GetCurrentProcess(),p,5);
}
int main(int argc,char**argv) {
 if(argc!=4)return 2;
 map_image(argv[1]);
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 ((void (__cdecl *)(void))0x20001720)();
 patch_exit(0x200ab7cc,rotation_ready);patch_exit(0x200ab7fd,rotation_skip);
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open rotation cases/results");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("invalid count");
 for(uint32_t i=0;i<count;i++) {
  memset(bike,0,sizeof bike);
  if(fread(bike+0x534,12,1,in)!=1||fread(bike+0x540,12,1,in)!=1||fread(&rotation_dt,4,1,in)!=1)fail("truncated rotation input");
  rotation_step();
  if(fwrite(&rotation_angle,4,1,out)!=1||fwrite(bike+0x540,12,1,out)!=1||fwrite(&rotation_apply,4,1,out)!=1)fail("write rotation result");
 }
 if(fgetc(in)!=EOF)fail("trailing input");
 fclose(in);if(fclose(out))fail("close results");return 0;
}
