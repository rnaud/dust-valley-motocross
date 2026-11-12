#define main unused_helper_main
#include "oracle.c"
#undef main
float event_input[54];uint32_t event_output[14],random_calls,input_calls;
unsigned char other_bike[0xcc8],event_terrain[0x958];int event_frame;
int __cdecl supplied_random(void){return (int)event_input[52+random_calls++];}
int __attribute__((thiscall)) supplied_input(void*self,int code,int unused){
 (void)self;if(code!=8||unused!=0)fail("unexpected input query");input_calls++;return (int)event_input[23];
}
static void patch(uint32_t address,void*target){unsigned char*p=(void*)(uintptr_t)address;p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)(uintptr_t)target-address-5;}
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);
 patch(0x200bf190,supplied_random);patch(0x20054f70,supplied_input);
 ((void (__cdecl *)(void))0x2009d650)();
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  if(fread(event_input,sizeof event_input,1,in)!=1)fail("input");
  float*v=event_input;memset(bike,0,sizeof bike);memset(other_bike,0,sizeof other_bike);random_calls=input_calls=0;
  memcpy(bike+0x4f8,v,12);memcpy(bike+0xbc0,v+3,12);memcpy(bike+0x510,v+6,12);memcpy(bike+0x534,v+9,12);memcpy(bike+0x4cc,v+12,12);memcpy(other_bike+0x510,v+15,12);
  memcpy(bike+0x6a4,v+18,4);
  memcpy(bike+0x564,v+19,4);
  memcpy(bike+0x590,v+30,4);
  memcpy(bike+0x594,v+31,4);
  memcpy(bike+0x4f0,v+38,4);
  memcpy(bike+0x4d8,v+39,4);
  memcpy(bike+0x86c,v+41,4);
  memcpy(bike+0x8cc,v+42,4);
  memcpy(bike+0x868,v+43,4);
  memcpy(bike+0x864,v+44,4);
  memcpy(bike+0x55c,v+45,4);
  put32(0xc40,(int32_t)v[21]);
  put32(0x710,(int32_t)v[24]);
  put32(0x714,(int32_t)v[25]);
  put32(0x4bc,(int32_t)v[28]);
  put32(0x844,(int32_t)v[29]);
  put32(0x8ac,(int32_t)v[32]);
  put32(0x8b8,(int32_t)v[33]);
  put32(0x8b4,(int32_t)v[34]);
  put32(0x8bc,(int32_t)v[36]);
  put32(0x820,(int32_t)v[37]);
  memcpy(other_bike+0x6a4,v+20,4);put32(0x6e4,v[22]?(uintptr_t)bike:0);bike[0x814]=(uint8_t)v[26];event_frame=(int)v[27];put32(0x14,(uintptr_t)&event_frame);
  put32(0x8b0,v[35]?(uintptr_t)other_bike:0);put32(0x8f4,(uintptr_t)event_terrain);*(int*)(event_terrain+0x954)=(int)v[40];
  typedef int (__attribute__((thiscall)) *Decision)(void*,uint32_t,uint32_t,uint32_t,uint32_t,uint32_t,uint32_t,uint32_t,uint32_t,uint32_t,uint32_t,uint32_t,uint32_t);
  event_output[0]=((Decision)0x200a4d70)(bike,(int)v[46],(int)v[47],0,0,0,0,bits(v[48]),bits(v[49]),(int)v[50],0,bits(v[51]),0);
  event_output[1]=get32(0x8b8);event_output[2]=get32(0x8b4);event_output[3]=get32(0x8b0)!=0;event_output[4]=get32(0x710);event_output[5]=get32(0x714);
  memcpy(event_output+6,bike+0x510,12);memcpy(event_output+9,bike+0x534,12);event_output[12]=random_calls;event_output[13]=input_calls;
  if(fwrite(event_output,sizeof event_output,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
