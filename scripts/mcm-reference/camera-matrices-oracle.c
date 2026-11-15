#define main unused_helper_main
#include "oracle.c"
#undef main
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);((void (__cdecl *)(void))0x20001720)();
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t a[15],r[65];unsigned char camera[0x260]={0};
 while(fread(a,sizeof a,1,in)==1){
  memcpy(camera+0x144,a,40);memcpy(camera+0x13c,a+10,4);memcpy(camera+0x1a8,a+11,8);memcpy(camera+0x170,a+13,4);memcpy(camera+0x180,a+14,4);
  unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));((void (__thiscall *)(void*))0x2007a670)(camera);
  memcpy(r,camera+0x30,256);memcpy(r+64,camera+0x16c,4);if(fwrite(r,sizeof r,1,out)!=1)fail("write");
 }return ferror(in)||fclose(out)?7:0;
}
