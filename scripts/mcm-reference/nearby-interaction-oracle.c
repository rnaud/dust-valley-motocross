#define main unused_helper_main
#include "oracle.c"
#undef main
uint32_t interaction_accepted;
unsigned char nearby_settings[0x1080],nearby_game[0x40],nearby_bikes[8][0xcc8];
void *nearby_players[16],*nearby_others[16];
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);
 /* Mark entry to the accepted branch, then exit before orientation/animation. */
 unsigned char*p=(void*)0x200a1847;p[0]=0xc7;p[1]=0x05;
 *(uint32_t*)(p+2)=(uintptr_t)&interaction_accepted;*(uint32_t*)(p+6)=1;
 p[10]=0xe9;*(uint32_t*)(p+11)=0x200a1962-0x200a1847-15;
 *(void**)0x200e4fb4=nearby_settings;
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  float v[53];if(fread(v,sizeof v,1,in)!=1)fail("input");
  memset(nearby_settings,0,sizeof nearby_settings);memset(nearby_game,0,sizeof nearby_game);memset(nearby_bikes,0,sizeof nearby_bikes);
  *(int*)(nearby_settings+0x614)=(int)v[0];*(int*)(nearby_settings+0x314)=(int)v[1];*(short*)(nearby_settings+0x107a)=(short)v[2];
  *(void**)(nearby_game+0x30)=nearby_bikes[0];*(void**)(nearby_game+0x34)=nearby_players;*(void**)(nearby_game+0x38)=v[3]?nearby_others:NULL;
  for(int k=0;k<8;k++){
   memcpy(nearby_bikes[k]+0x4f8,v+5+k*4,12);*(int*)(nearby_bikes[k]+0xc30)=(int)v[8+k*4];
   *(void**)(nearby_bikes[k]+0xc84)=nearby_game;
  }
  for(int k=0;k<7;k++){int a=(int)v[37+k],b=(int)v[44+k];nearby_players[k]=a<0?NULL:nearby_bikes[a];nearby_others[k]=b<0?NULL:nearby_bikes[b];}
  typedef void* (__attribute__((thiscall))*Next)(void*,int*);
  int cursor=(int)v[4];void*entry=((Next)0x20059e90)(nearby_game,&cursor);
  memcpy(nearby_bikes[0]+0x4e0,v+51,4);memcpy(nearby_bikes[0]+0x834,v+52,4);interaction_accepted=0;
  typedef void (__attribute__((thiscall))*Select)(void*);
  ((Select)0x200a16d0)(nearby_bikes[0]);void*selected=*(void**)(nearby_bikes[0]+0x838);
  uint32_t result[5]={0,(uint32_t)cursor,0,0,interaction_accepted};memcpy(result+3,nearby_bikes[0]+0x834,4);
  for(int k=0;k<8;k++){if(entry==nearby_bikes[k])result[0]=k+1;if(selected==nearby_bikes[k])result[2]=k+1;}
  if(fwrite(result,sizeof result,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
