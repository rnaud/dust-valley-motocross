#define main unused_helper_main
#include "oracle.c"
#undef main
unsigned char parts[4][0x60],engine[0x1f0],effect[16];uint32_t random_value,random_calls;
int __cdecl draw_random(void){random_calls++;return random_value;}
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);unsigned char*p=(void*)0x200bf190;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)draw_random-0x200bf190-5;
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  uint32_t v[1044],r[1043];if(fread(v,sizeof v,1,in)!=1)fail("input");
  memcpy(bike,v+2,sizeof bike);memcpy(parts,v+820,sizeof parts);memcpy(engine,v+916,sizeof engine);memcpy(effect,v+1040,16);random_value=v[1];random_calls=0;
  unsigned offsets[6]={0x8dc,0x8e0,0x8e4,0x8e8,0x8f0,0x904};void*ptrs[6]={parts[0],parts[1],parts[2],parts[3],engine,effect};
  for(int j=0;j<6;j++)put32(offsets[j],v[0]&(1u<<j)?(uintptr_t)ptrs[j]:0);
  typedef void (__attribute__((thiscall))*Reset)(void*);((Reset)0x200a1a40)(bike);
  for(int j=0;j<6;j++)put32(offsets[j],v[2+offsets[j]/4]);
  memcpy(r,bike,sizeof bike);memcpy(r+818,parts,sizeof parts);memcpy(r+914,engine,sizeof engine);memcpy(r+1038,effect,16);r[1042]=random_calls;
  if(fwrite(r,sizeof r,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
