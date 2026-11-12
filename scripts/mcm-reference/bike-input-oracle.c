#define main unused_helper_main
#include "oracle.c"
#undef main
float input_case[16];uint32_t input_result[8];unsigned char input_controller[0x28],pov_device[0x598],input_engine[0x164];int devices[6];
int __attribute__((thiscall)) device_response(void*self,int action,int option,int extra){
 if(action!=(int)input_case[7]||option!=(int)input_case[8]||extra)fail("query args");
 int index=*(int*)self;uint32_t n=input_result[1]++;if(n>=6)fail("excess polls");input_result[2+n]=(uint32_t)index+1;return (int)input_case[10+index];
}
static void patch_input(uint32_t address){unsigned char*p=(void*)(uintptr_t)address;p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)(uintptr_t)device_response-address-5;}
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);patch_input(0x20052670);patch_input(0x20053cd0);patch_input(0x20054760);
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  if(fread(input_case,sizeof input_case,1,in)!=1)fail("input");
  float*v=input_case;memset(bike,0,sizeof bike);memset(input_controller,0,sizeof input_controller);memset(pov_device,0,sizeof pov_device);memset(input_result,0,sizeof input_result);
  put32(0x614,(int)v[0]);put32(0x618,(int)v[1]);put32(0x6e4,(uintptr_t)input_controller);put32(0x8f0,(uintptr_t)input_engine);memcpy(input_engine+0x160,v+5,4);memcpy(bike+0x5e4,v+6,4);
  if(v[2])*(void**)(input_controller+0xc)=pov_device;
  *(int*)(pov_device+0x594)=(int)v[3];memcpy(pov_device+0x584,v+4,4);
  const unsigned offsets[]={0x24,0x10,0x14,0x18,0x1c,0x20};for(int k=0;k<6;k++){devices[k]=k;if((int)v[9]&(1<<k))*(void**)(input_controller+offsets[k])=devices+k;}
  typedef int (__attribute__((thiscall)) *Query)(void*,int,int);
  input_result[0]=((Query)0x200a4ab0)(bike,(int)v[7],(int)v[8]);
  if(fwrite(input_result,sizeof input_result,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
