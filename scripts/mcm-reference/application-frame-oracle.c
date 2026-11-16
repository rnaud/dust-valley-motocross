// Execute complete original 467f40 and 467ff0 with explicit external services.
#define main unused_helper_main
#include "oracle.c"
#undef main
static unsigned char app[0x46c],owner_state[0x44];
static uint32_t table[12],alternate[12],root_table[12],root[1],row[8],result[20],events;
static void setapp(unsigned offset,uint32_t value){memcpy(app+offset,&value,4);}
static uint32_t getapp(unsigned offset){uint32_t value;memcpy(&value,app+offset,4);return value;}
static void event(unsigned tag,float delta){result[4+events*2]=tag;result[5+events*2]=bits(delta);events++;}
static DWORD WINAPI clock_service(void){event(1,0);return row[1];}
static void __attribute__((thiscall)) input_service(void*self,float delta){
 event(2,delta);if(row[5]&1)setapp(0x444,!getapp(0x444));
}
static void __attribute__((thiscall)) optional_service(void*self,float delta){event(3,delta);}
static void __attribute__((thiscall)) update_service(void*self,float delta){event(4,delta);if(row[5]&2)setapp(0x464,row[6]);}
static void __attribute__((thiscall)) draw_service(void*self){event(5,0);if(row[5]&4)setapp(0,(uintptr_t)alternate);}
static void __attribute__((thiscall)) present_service(void*self){event(6,0);if(row[5]&8)setapp(0x464,row[6]);}
static void __attribute__((thiscall)) wrong_present(void*self){event(7,0);}
static void patch(uint32_t address,void*target){unsigned char*p=(void*)(uintptr_t)address;p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)(uintptr_t)target-address-5;FlushInstructionCache(GetCurrentProcess(),p,5);}
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);
 if(memcmp((void*)0x20067f40,"\x83\xec\x04\x53\x56",5)||*(uint32_t*)0x200d7c98!=0x3a83126f)fail("guards");
 *(uintptr_t*)0x201278a8=(uintptr_t)clock_service;
 patch(0x20054d90,input_service);patch(0x20095ac0,optional_service);
 table[9]=(uintptr_t)draw_service;table[11]=(uintptr_t)present_service;alternate[11]=(uintptr_t)wrong_present;
 root_table[11]=(uintptr_t)update_service;root[0]=(uintptr_t)root_table;
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");size_t n;unsigned count=0;
 while((n=fread(row,1,sizeof row,in))==sizeof row){
  memset(app,0,sizeof app);memset(owner_state,0,sizeof owner_state);memset(result,0,sizeof result);events=0;
  setapp(0,(uintptr_t)table);setapp(8,(uintptr_t)owner_state);setapp(0x10,row[2]?1:0);setapp(0x318,row[3]?1:0);setapp(0x430,(uintptr_t)root);setapp(0x444,row[4]);setapp(0x464,row[7]);setapp(0x468,row[0]);
  result[0]=((uint32_t (__attribute__((thiscall)) *)(void*))0x20067f40)(app);
  result[1]=getapp(0x464);result[2]=getapp(0x468);result[3]=events;
  memcpy(result+16,owner_state+0x3c,8);result[18]=getapp(0x444);result[19]=getapp(0)!=(uintptr_t)table;
  if(fwrite(result,sizeof result,1,out)!=1)fail("write");count++;
 }
 if(n||ferror(in)||fclose(out))fail("finish");fprintf(stderr,"cases=%u\n",count);return 0;
}
