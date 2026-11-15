#define main unused_helper_main
#include "oracle.c"
#undef main
#include "oracle-imports.h"
// Calls intact original wrappers and CRT. No allocator substitution or patching.
int main(int argc,char**argv){
 if(argc!=3)return 2;map_image(argv[1]);bind_oracle_kernel_imports();
 if(memcmp((void*)0x2005c8d0,"\x8b\x44\x24\x04",4)||memcmp((void*)0x2005c820,"\x56\x57\x8b\xf9",4))fail("wrapper guards");
 if(!((int (__cdecl *)(void))0x200c5230)())fail("CRT heap");
 if(!((int (__cdecl *)(void))0x200c24e0)())fail("CRT thread");
 FILE*out=fopen(argv[2],"wb");if(!out)fail("open");
 const uint32_t sizes[]={0,1,4,15,16,17,20,32,64,256};
 for(uint32_t count=0;count<=8;count++)for(unsigned s=0;s<10;s++){
  uint32_t owner[3]={0,0,0xfffffff0},size=sizes[s];volatile uint32_t*global=(void*)0x200e5670;*global=0x12345678;
  void*p=((void* (__attribute__((thiscall)) *)(void*,uint32_t,uint32_t))0x2005c8d0)(owner,count,size);
  uint32_t length=p?((uint32_t (__cdecl *)(void*))0x200c0f20)(p):0,zero=1;
  if(p)for(uint32_t i=0;i<count*size;i++)if(((unsigned char*)p)[i])zero=0;
  uint32_t row[9]={count,size,p!=NULL,length,zero,*global,owner[2],0,0};
  ((void (__attribute__((thiscall)) *)(void*,void*))0x2005c820)(owner,p);
  row[7]=*global;row[8]=owner[2];if(fwrite(row,sizeof row,1,out)!=1)fail("write");
 }
 if(fclose(out))fail("close");fprintf(stderr,"cases=90\n");return 0;
}
