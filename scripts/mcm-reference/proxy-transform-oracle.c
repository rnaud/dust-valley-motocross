#define main unused_helper_main
#include "oracle.c"
#undef main
float position_input[113];uint32_t position_output[115];unsigned char nodes[3][0x114];
float copied_matrix[16];
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);((void (__cdecl *)(void))0x20001720)();unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  if(fread(position_input,sizeof position_input,1,in)!=1)fail("input");
  float*v=position_input;memset(nodes,0,sizeof nodes);
  for(int k=0;k<3;k++){memcpy(nodes[k]+0x84,v+k*32,64);memcpy(nodes[k]+0xc4,v+k*32+16,64);*(uint32_t*)(nodes[k]+0x104)=(uint32_t)v[96+k];}
  int parent=(int)v[104];if(parent>=0){*(void**)(nodes[0]+0x108)=nodes[parent];*(void**)(nodes[parent]+0x10c)=nodes[0];}
  if(v[105]){*(void**)(nodes[1]+0x108)=nodes[2];*(void**)(nodes[1]+0x110)=*(void**)(nodes[2]+0x10c);*(void**)(nodes[2]+0x10c)=nodes[1];}
  typedef void (__attribute__((thiscall))*MatrixCall)(void*,void*,float*);
  ((MatrixCall)0x200b7a20)(nodes[1],NULL,copied_matrix);
  ((MatrixCall)0x200b6d70)(nodes[0],NULL,copied_matrix);
  for(int k=0;k<3;k++){memcpy(position_output+k*33,nodes[k]+0x84,64);memcpy(position_output+k*33+16,nodes[k]+0xc4,64);memcpy(position_output+k*33+32,nodes[k]+0x104,4);}
  memcpy(position_output+99,copied_matrix,64);
  if(fwrite(position_output,sizeof position_output,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
