#define main unused_helper_main
#include "oracle.c"
#undef main
float position_input[106];uint32_t position_output[99];unsigned char nodes[3][0x114];
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  if(fread(position_input,sizeof position_input,1,in)!=1)fail("input");
  float*v=position_input;memset(nodes,0,sizeof nodes);
  for(int k=0;k<3;k++){memcpy(nodes[k]+0x84,v+k*32,64);memcpy(nodes[k]+0xc4,v+k*32+16,64);*(uint32_t*)(nodes[k]+0x104)=(uint32_t)v[96+k];}
  if(v[104]){*(void**)(nodes[0]+0x108)=nodes[1];*(void**)(nodes[1]+0x10c)=nodes[0];}
  if(v[105]){*(void**)(nodes[2]+0x108)=nodes[1];if(v[104])*(void**)(nodes[0]+0x110)=nodes[2];else *(void**)(nodes[1]+0x10c)=nodes[2];}
  void*reference=v[99]?nodes[(int)v[99]-1]:0;
  typedef void (__attribute__((thiscall)) *Pointer)(void*,void*,float*);
  typedef void (__attribute__((thiscall)) *Scalar)(void*,void*,float,float,float);
  if(v[100])((Scalar)0x200b77a0)(nodes[0],reference,v[101],v[102],v[103]);
  else ((Pointer)0x200b7860)(nodes[0],reference,v+101);
  for(int k=0;k<3;k++){memcpy(position_output+k*33,nodes[k]+0x84,64);memcpy(position_output+k*33+16,nodes[k]+0xc4,64);memcpy(position_output+k*33+32,nodes[k]+0x104,4);}
  if(fwrite(position_output,sizeof position_output,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
