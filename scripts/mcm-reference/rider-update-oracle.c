#define main unused_helper_main
#include "oracle.c"
#undef main
float blend_input[37],blend_envelope[4];uint32_t blend_output[20];unsigned char blend_component[0x4c];
uint32_t queries[3],query_count,nearby_count,trick_index,reset_count;
int __attribute__((thiscall)) supplied_query(void*self,int action,int option){
 (void)self;if(option||query_count>=3)fail("query");queries[query_count++]=action;
 if(action==9)return (int)blend_input[32];
 if(action==6)return (int)blend_input[33];
 if(action==7)return (int)blend_input[34];
 fail("action");return 0;
}
void __attribute__((thiscall)) supplied_nearby(void*self){(void)self;nearby_count++;}
void __attribute__((thiscall)) supplied_trick(void*self,int index){(void)self;trick_index=index+1;}
static void patch(uint32_t address,void*target){unsigned char*p=(void*)(uintptr_t)address;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)target-address-5;}
void setup_blend(unsigned char*s){
 float*v=blend_input;put32(0x820,(int)v[0]);memcpy(bike+0x6f4,v+1,4);memcpy(bike+0x730,v+2,4);memcpy(bike+0x708,v+3,4);memcpy(bike+0x704,v+4,4);memcpy(blend_envelope,v+5,16);put32(0x904,(uintptr_t)blend_envelope);memcpy(bike+0x8cc,v+9,4);memcpy(blend_component+0x44,v+10,8);put32(0x8ec,(uintptr_t)blend_component);memcpy(s+0xc8,v+12,4);
 put32(0x4bc,(int)v[13]);memcpy(bike+0x71c,v+14,4);memcpy(bike+0x720,v+15,4);memcpy(bike+0x738,v+16,4);put32(0x724,(int)v[17]);memcpy(bike+0x728,v+18,4);put32(0x72c,(int)v[19]);memcpy(bike+0x734,v+20,4);memcpy(s+0xc0,v+21,4);memcpy(s+0xc4,v+22,4);
}
void copy_blend(void){memcpy(blend_output,bike+0x730,4);memcpy(blend_output+1,bike+0x708,4);memcpy(blend_output+2,bike+0x704,4);memcpy(blend_output+3,blend_envelope,16);memcpy(blend_output+7,bike+0x724,12);memcpy(blend_output+10,bike+0x734,4);}
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);((void (__cdecl *)(void))0x20001640)();
 patch(0x200a4ab0,supplied_query);patch(0x200a16d0,supplied_nearby);patch(0x200a1970,supplied_trick);
 unsigned char*p=(void*)0x200aef92;p[0]=0xc7;p[1]=0x05;*(uint32_t*)(p+2)=(uintptr_t)&reset_count;*(uint32_t*)(p+6)=1;
 p[10]=0xe9;*(uint32_t*)(p+11)=0x200aefc7-0x200aef92-15;
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  if(fread(blend_input,sizeof blend_input,1,in)!=1)fail("input");
  memset(bike,0,sizeof bike);unsigned char scratch[0xcc]={0};setup_blend(scratch);
  float*v=blend_input;put32(0x844,(int)v[23]);put32(0x710,(int)v[24]);put32(0xbfc,(int)v[25]);put32(0x614,(int)v[26]);put32(0x618,(int)v[27]);memcpy(bike+0x590,v+28,8);put32(0xc68,(int)v[30]);put32(0xb4c,(int)v[31]);memcpy(bike+0x6e8,v+35,8);
  memset(queries,0,sizeof queries);query_count=nearby_count=trick_index=reset_count=0;
  typedef void (__attribute__((thiscall))*Update)(void*,float,float,float);
  ((Update)0x200aecb0)(bike,v[21],v[22],v[12]);copy_blend();
  blend_output[11]=get32(0x820);blend_output[12]=get32(0xb4c);blend_output[13]=query_count;memcpy(blend_output+14,queries,12);blend_output[17]=nearby_count;blend_output[18]=trick_index;blend_output[19]=reset_count;
  if(fwrite(blend_output,sizeof blend_output,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
