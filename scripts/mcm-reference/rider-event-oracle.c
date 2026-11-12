#define main unused_helper_main
#include "oracle.c"
#undef main
float rider_input[155];uint32_t rider_output[10],rider_random_calls;
unsigned char rider[0x500];
int __cdecl rider_random(void){if(rider_random_calls>=3)fail("excess random draws");return (int)rider_input[5+rider_random_calls++];}
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);unsigned char*p=(void*)0x200bf190;p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)(uintptr_t)rider_random-0x200bf190-5;
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  if(fread(rider_input,sizeof rider_input,1,in)!=1)fail("input");
  float*v=rider_input;memset(rider,0xa5,sizeof rider);rider_random_calls=0;
  *(int*)0x200e21a0=(int)v[1];memcpy(rider+0x70,v+2,12);
  for(int k=0;k<8;k++)for(int g=0;g<3;g++)for(int j=0;j<6;j++)*(int*)(rider+0x174+k*0x5c+g*0x18+j*4)=(int)v[11+k*18+g*6+j];
  typedef void (__attribute__((thiscall)) *Start)(void*,int);
  ((Start)0x2000fa10)(rider,(int)v[0]);
  memcpy(rider_output,rider+0x170,4);memcpy(rider_output+1,rider+0x160,12);memcpy(rider_output+4,rider+0x13c,4);memcpy(rider_output+5,rider+0x16c,4);memcpy(rider_output+6,rider+0x58,12);rider_output[9]=rider_random_calls;
  if(fwrite(rider_output,sizeof rider_output,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
