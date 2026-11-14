#define main unused_helper_main
#include "oracle.c"
#undef main
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);((void (__cdecl *)(void))0x20001720)();
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");
 uint32_t args[17],result[14];unsigned char camera[0x200],owner[0x40];
 while(fread(args,sizeof args,1,in)==1){
  memset(camera,0,sizeof camera);memset(owner,0,sizeof owner);memcpy(camera+0x144,args,40);
  memcpy(camera+0x1c4,args+13,8);memcpy(camera+0x1bc,args+15,4);memcpy(owner+0x38,args+16,4);*(void**)(camera+0x1c)=owner;
  unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
  typedef int (__attribute__((thiscall))*Aim)(void*,float,float,float);
  result[13]=((Aim)0x2007a3d0)(camera,value(args[10]),value(args[11]),value(args[12]));
  memcpy(result,camera+0x144,40);memcpy(result+10,camera+0x1c4,8);memcpy(result+12,camera+0x1bc,4);
  if(fwrite(result,sizeof result,1,out)!=1)fail("output");
 }
 if(ferror(in)||fclose(out))fail("finish");
 return 0;
}
