#define main unused_helper_main
#include "oracle.c"
#undef main
unsigned char manager[0x3988],objects[2][0x110];
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);((void (__cdecl *)(void))0x20001640)();((void (__cdecl *)(void))0x20001720)();
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  float v[31];uint32_t r[14];if(fread(v,sizeof v,1,in)!=1)fail("input");
  memset(manager,0,sizeof manager);memset(objects,0,sizeof objects);
  memcpy(objects[0]+4,v+1,24);memcpy(objects[0]+0x60,v+7,4);
  memcpy(objects[1]+0x7c,v+8,12);memcpy(objects[1]+0x60,v+11,4);memcpy(objects[1]+0x64,v+12,12);memcpy(objects[1]+0x1c,v+15,64);
  *(void**)(manager+0x3980)=objects[0];*(void**)(manager+0x3984)=objects[1];
  for(int j=0;j<13;j++)*(float*)(manager+0x394c+j*4)=1000+j;
  typedef int (__attribute__((thiscall))*Test)(void*);r[0]=((Test)(v[0]==3?0x2002c1b0:0x2002c5b0))(manager);memcpy(r+1,manager+0x394c,52);
  if(fwrite(r,sizeof r,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
