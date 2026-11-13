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
  float v[52];uint32_t r[14];if(fread(v,sizeof v,1,in)!=1)fail("input");
  memset(manager,0,sizeof manager);memset(objects,0,sizeof objects);
  for(int k=0;k<2;k++){
   unsigned char*o=objects[k];float*p=v+k*26;
   memcpy(o+0x7c,p,12);memcpy(o+0x5c,p+3,4);memcpy(o+0x64,p+4,12);memcpy(o+0x70,p+7,12);memcpy(o+0x1c,p+10,64);
   *(void**)(manager+0x3980+k*4)=o;
  }
  for(int j=0;j<13;j++)*(float*)(manager+0x394c+j*4)=1000+j;
  typedef int (__attribute__((thiscall))*Test)(void*);r[0]=((Test)0x2002bab0)(manager);memcpy(r+1,manager+0x394c,52);
  if(fwrite(r,sizeof r,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
