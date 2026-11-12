#define main unused_helper_main
#include "oracle.c"
#undef main
float orientation_input[67];uint32_t orientation_output[56];
unsigned char source_node[0x114],target_node[0x114];float forward_axis[3],up_axis[3];
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);((void (__cdecl *)(void))0x20001720)();
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  if(fread(orientation_input,sizeof orientation_input,1,in)!=1)fail("input");
  float*v=orientation_input;memset(source_node,0,sizeof source_node);memset(target_node,0,sizeof target_node);
  memcpy(source_node+0x84,v,64);memcpy(source_node+0xc4,v+16,64);memcpy(target_node+0x84,v+32,64);memcpy(target_node+0xc4,v+48,64);
  *(uint32_t*)(source_node+0x104)=(uint32_t)v[65];*(uint32_t*)(target_node+0x104)=(uint32_t)v[66];
  if(v[64]){*(void**)(source_node+0x108)=target_node;*(void**)(target_node+0x10c)=source_node;}
  typedef void (__attribute__((thiscall)) *Extract)(void*,void*,float*,float*);
  typedef void (__attribute__((thiscall)) *Orient)(void*,void*,float*,float*,int);
  ((Extract)0x200b7640)(source_node,0,forward_axis,up_axis);
  ((Orient)0x200b7270)(target_node,0,forward_axis,up_axis,1);
  memcpy(orientation_output,target_node+0x84,64);memcpy(orientation_output+16,target_node+0xc4,64);memcpy(orientation_output+32,source_node+0xc4,64);memcpy(orientation_output+48,forward_axis,12);memcpy(orientation_output+51,up_axis,12);memcpy(orientation_output+54,source_node+0x104,4);memcpy(orientation_output+55,target_node+0x104,4);
  if(fwrite(orientation_output,sizeof orientation_output,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
