#define main unused_helper_main
#include "oracle.c"
#undef main
int main(int argc,char**argv){
 if(argc!=3)return 2;map_image(argv[1]);*(uint32_t*)0x200e5098=0;unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));((void(__cdecl*)(void))0x2004e950)();FILE*out=fopen(argv[2],"wb");if(!out)fail("open");if(fwrite((void*)0x20108fd0,65536,1,out)!=1||fwrite((void*)0x20118fd0,512,1,out)!=1||fclose(out))fail("write");return 0;
}
