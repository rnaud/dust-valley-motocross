#define main unused_helper_main
#include "oracle.c"
#undef main
static unsigned char sound_state[0xa0],samples[7][0x180];
static uint32_t seed,playing_mask,random_calls,trace_count,trace_words[128];
static void trace(uint32_t kind,uint32_t a,uint32_t b){if(trace_count+3>128)fail("trace overflow");trace_words[trace_count++]=kind;trace_words[trace_count++]=a;trace_words[trace_count++]=b;}
static uint32_t slot(void*self){for(unsigned i=0;i<7;i++)if(self==samples[i])return i;fail("unknown sample");return 0;}
static int __cdecl random_value(void){seed=seed*214013u+2531011u;uint32_t v=(seed>>16)&32767;random_calls++;trace(1,v,0);return v;}
static int __attribute__((thiscall)) is_playing(void*self){unsigned i=slot(self),v=(playing_mask>>i)&1;trace(2,i,v);return v;}
static void __attribute__((thiscall)) stop_sound(void*self,int reset){unsigned i=slot(self);trace(3,i,reset);playing_mask&=~(1u<<i);}
static void __attribute__((thiscall)) position_sound(void*self,uint32_t position){trace(4,slot(self),position);}
static void __attribute__((thiscall)) volume_sound(void*self,int volume){trace(5,slot(self),(uint32_t)volume);}
static void __attribute__((thiscall)) play_sound(void*self,void*sound,int a,int b,int c){if(self!=sound_state||a||b||c)fail("unexpected play arguments");trace(6,slot(sound),0);}
static void patch_call(uint32_t address,void*target){unsigned char*p=(void*)(uintptr_t)address;p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)(uintptr_t)target-address-5;}

static unsigned char audio_world[0x200],audio_owner[0x40],camera[0x180];
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);
 patch_call(0x200bf190,random_value);patch_call(0x20002c20,is_playing);patch_call(0x20002ad0,stop_sound);patch_call(0x20002f70,position_sound);patch_call(0x20002db0,volume_sound);patch_call(0x20026af0,play_sound);
 ((void(__cdecl*)(void))0x20001640)();
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;if(fread(&count,4,1,in)!=1||count>100000)fail("count");
 for(unsigned n=0;n<count;n++){
  uint32_t words[19];if(fread(words,sizeof words,1,in)!=1)fail("case");seed=words[0];playing_mask=words[1];random_calls=trace_count=0;memset(trace_words,0,sizeof trace_words);memset(sound_state,0,sizeof sound_state);memset(bike,0,sizeof bike);
  for(unsigned i=0;i<6;i++){*(void**)(sound_state+0x80+i*4)=samples[i];*(uint32_t*)(samples[i]+0x174)=words[7+i];}
  *(void**)(sound_state+0x1c)=audio_owner;*(void**)(audio_owner+0x2c)=camera;*(void**)(sound_state+0x3c)=audio_world;
  *(void**)(audio_world+0x1ec)=words[4]?bike:NULL;*(uint32_t*)(bike+0x844)=words[5];*(uint32_t*)(sound_state+0x98)=words[6];*(void**)(sound_state+0x9c)=samples[6];
  memcpy(bike+0x4f8,words+13,12);memcpy(camera+0x144,words+16,12);
  int volume=0,pan=0x12345678;
  ((void(__attribute__((thiscall)) *)(void*,void*,void*,int*,int*))0x20027760)(sound_state,bike+0x4f8,camera+0x144,&volume,&pan);
  ((void(__attribute__((thiscall)) *)(void*,void*,float,int))0x20027110)(sound_state,bike,value(words[2]),(int)words[3]);
  uint32_t header[]={*(uint32_t*)(sound_state+0x98),seed,random_calls,trace_count,(uint32_t)volume,(uint32_t)pan};if(fwrite(header,sizeof header,1,out)!=1||fwrite(trace_words,sizeof trace_words,1,out)!=1)fail("write");
 }
 fclose(in);fclose(out);return 0;
}
