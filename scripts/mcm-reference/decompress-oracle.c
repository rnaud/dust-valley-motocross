#define main unused_helper_main
#include "oracle.c"
#undef main
#include "oracle-imports.h"
int main(int argc,char**argv) {
 if(argc!=4)return 2;
 map_image(argv[1]);bind_oracle_kernel_imports();
 if(!((int (__cdecl *)(void))0x200c5230)())fail("CRT heap");
 if(!((int (__cdecl *)(void))0x200c24e0)())fail("CRT threads");
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");
 uint32_t count;if(fread(&count,4,1,in)!=1||count>100000)fail("count");
 for(uint32_t i=0;i<count;i++) {
  uint32_t sizes[2];if(fread(sizes,8,1,in)!=1||sizes[0]>65536||sizes[1]>65536)fail("sizes");
  unsigned char*src=calloc(sizes[1]+16,1),*dst=malloc(sizes[0]+65536);if(!src||!dst)fail("allocation");
  memset(dst,0xa5,sizes[0]+65536);
  if(fread(src,sizes[1],1,in)!=1)fail("input");
  ((void (__cdecl *)(void*,void*,uint32_t))0x20027a90)(dst,src,sizes[0]);
  if(fwrite(dst,sizes[0]+32,1,out)!=1)fail("output");
  free(src);free(dst);
 }
 fclose(in);if(fclose(out))fail("close");return 0;
}
