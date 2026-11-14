// Read-only capture of the 21 normal-frame animation records at bike+0x740.
// MCM_CAPTURE_RIDER_ANIMATIONS also follows selected and active crash records.
// Standalone reads are non-atomic. The replay harness calls the same exporter
// while stopped at frame entry and gives both files a shared capture ID.
#include <windows.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
typedef struct {DWORD address,size;unsigned char bytes[0x78];} AnimationBlock;
static AnimationBlock animation_blocks[100000];static unsigned animation_count;
static HANDLE animation_process;
static int animation_fail(const char*s){fprintf(stderr,"animation: %s (%lu)\n",s,GetLastError());return 0;}
static int animation_read(DWORD address,void*data,DWORD size){SIZE_T n;return address&&ReadProcessMemory(animation_process,(void*)(uintptr_t)address,data,size,&n)&&n==size;}
static DWORD animation_word(const unsigned char*b,unsigned o){DWORD v;memcpy(&v,b+o,4);return v;}
static AnimationBlock* animation_save(DWORD address,DWORD size){
 for(unsigned i=0;i<animation_count;i++)if(animation_blocks[i].address==address)return animation_blocks[i].size==size?&animation_blocks[i]:NULL;
 if(animation_count==100000)return NULL;
 AnimationBlock*b=&animation_blocks[animation_count++];b->address=address;b->size=size;
 return animation_read(address,b->bytes,size)?b:NULL;
}
static int capture_mcm_animation_assets_at(HANDLE process,DWORD bike,const char*path,const char*capture_id,const char*boundary){
 animation_process=process;animation_count=0;DWORD table[26],vtable;unsigned record_count=21;
 if(!animation_read(bike,&vtable,4)||vtable!=0x4d9a94||!animation_read(bike+0x740,table,21*4))return animation_fail("bike table");
 DWORD proxy;
 if(getenv("MCM_CAPTURE_RIDER_ANIMATIONS")){DWORD rider,extra[5];
 if(!animation_read(bike+0x874,&rider,4)||!animation_read(bike+0xc8c,&proxy,4)||!animation_read(rider+0x160,extra,12)||!animation_read(proxy+0x10,extra+3,4)||!animation_read(bike+0x10,extra+4,4))return animation_fail("extra records");
 for(unsigned i=0;i<5;i++)if(extra[i]){int seen=0;for(unsigned j=0;j<record_count;j++)if(table[j]==extra[i])seen=1;if(!seen)table[record_count++]=extra[i];}
 }
 for(unsigned r=0;r<record_count;r++){
  AnimationBlock*record=animation_save(table[r],0x78);if(!record)return animation_fail("record");
  DWORD frames=animation_word(record->bytes,0x6c),address=animation_word(record->bytes,0x68);
  if(!frames||frames>10000)return animation_fail("frame count");
  for(DWORD i=0;i<frames;i++){
   AnimationBlock*frame=animation_save(address,0x34);
   if(!frame||animation_word(frame->bytes,0)!=i)return animation_fail("frame order/read");
   DWORD child=animation_word(frame->bytes,0xc);unsigned children=0;
   while(child){
    if(++children>256)return animation_fail("child chain limit");
    AnimationBlock*c=animation_save(child,0x30);if(!c)return animation_fail("child read");child=animation_word(c->bytes,0x2c);
   }
   address=animation_word(frame->bytes,0x18);
  }
  if(address)return animation_fail("long frame chain");
 }
 // Preserve displayed/previous/blend frames even when their old record is no
 // longer in the normal pose table, plus the current bounds frame at +0x23c.
 // These frames need not form a full sequence.
 DWORD retained[8];
 if(!animation_read(bike+0xc8c,&proxy,4))return animation_fail("proxy");
 for(unsigned object=0;object<2;object++){
  DWORD owner=object?proxy:bike;
  if(!animation_read(owner+0x18,retained+object*3,12))return animation_fail("retained frame pointers");
  if(!animation_read(owner+0x23c,retained+6+object,4))return animation_fail("bounds frame pointer");
 }
 for(unsigned i=0;i<8;i++)if(retained[i]){
  AnimationBlock*frame=animation_save(retained[i],0x34);if(!frame)return animation_fail("retained frame");
  DWORD child=animation_word(frame->bytes,0xc);unsigned children=0;
  while(child){
   if(++children>256)return animation_fail("retained child chain limit");
   AnimationBlock*c=animation_save(child,0x30);if(!c)return animation_fail("retained child read");child=animation_word(c->bytes,0x2c);
  }
 }
 DWORD after[21];if(!animation_read(bike+0x740,after,sizeof after)||memcmp(table,after,sizeof after))return animation_fail("table changed");
 FILE*out=fopen(path,"wx");if(!out)return animation_fail("exclusive output");
 fprintf(out,"{\"schemaVersion\":1,\"kind\":\"mcm-animation-observation\",\"bikeAddress\":%lu,",bike);
 if(capture_id)fprintf(out,"\"captureId\":\"%s\",\"captureBoundary\":\"%s\",",capture_id,boundary);
 fprintf(out,"\"records\":[");for(unsigned i=0;i<21;i++)fprintf(out,"%s%lu",i?",":"",table[i]);
 fprintf(out,"],\"additionalRecords\":[");for(unsigned i=21;i<record_count;i++)fprintf(out,"%s%lu",i>21?",":"",table[i]);fprintf(out,"],\"retainedFrames\":[");for(unsigned i=0;i<6;i++)fprintf(out,"%s%lu",i?",":"",retained[i]);
 fprintf(out,"],\"boundsFrames\":[%lu,%lu",retained[6],retained[7]);
 fprintf(out,"],\"blockCount\":%u,\"blocks\":[",animation_count);
 for(unsigned i=0;i<animation_count;i++){AnimationBlock*b=&animation_blocks[i];fprintf(out,"%s{\"address\":%lu,\"size\":%lu,\"hex\":\"",i?",":"",b->address,b->size);for(DWORD j=0;j<b->size;j++)fprintf(out,"%02x",b->bytes[j]);fprintf(out,"\"}");}
 fprintf(out,"]}\n");const int failed=ferror(out);const int closed=fclose(out);return !failed&&!closed;
}
static int capture_mcm_animation_assets(HANDLE process,DWORD bike,const char*path,const char*capture_id){
 return capture_mcm_animation_assets_at(process,bike,path,capture_id,"player-frame-entry");
}
#ifndef MCM_ANIMATION_EMBEDDED
int main(int argc,char**argv){
 if(argc!=4)return 2;
 DWORD pid=strtoul(argv[1],0,0),bike=strtoul(argv[2],0,0);
 HANDLE process=OpenProcess(PROCESS_VM_READ|PROCESS_QUERY_INFORMATION,FALSE,pid);if(!process)return 1;
 const int result=capture_mcm_animation_assets(process,bike,argv[3],NULL);CloseHandle(process);
 fprintf(stderr,"records=21 blocks=%u status=%d\n",animation_count,result);return result?0:1;
}
#endif
