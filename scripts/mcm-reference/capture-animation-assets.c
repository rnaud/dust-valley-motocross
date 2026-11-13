// Read-only observation of the 21 normal-frame animation records at bike+0x740.
// Not atomic and not a replay checkpoint: animation child axes can be mutable.
#include <windows.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
typedef struct {DWORD address,size;unsigned char bytes[0x78];} Block;
static Block blocks[100000];static unsigned count;static HANDLE process;
static void fail(const char*s){fprintf(stderr,"%s (%lu)\n",s,GetLastError());exit(1);}
static void read_bytes(DWORD address,void*data,DWORD size){SIZE_T n;if(!address||!ReadProcessMemory(process,(void*)(uintptr_t)address,data,size,&n)||n!=size)fail("read");}
static DWORD word(const unsigned char*b,unsigned o){DWORD v;memcpy(&v,b+o,4);return v;}
static Block* save(DWORD address,DWORD size){
 for(unsigned i=0;i<count;i++)if(blocks[i].address==address){if(blocks[i].size!=size)fail("conflicting block type");return &blocks[i];}
 if(count==100000)fail("block limit");
 Block*b=&blocks[count++];b->address=address;b->size=size;read_bytes(address,b->bytes,size);return b;
}
int main(int argc,char**argv){
 if(argc!=4)return 2;
 DWORD pid=strtoul(argv[1],0,0),bike=strtoul(argv[2],0,0),table[21],vtable;
 process=OpenProcess(PROCESS_VM_READ|PROCESS_QUERY_INFORMATION,FALSE,pid);if(!process)fail("open process");
 read_bytes(bike,&vtable,4);if(vtable!=0x4d9a94)fail("bike vtable");read_bytes(bike+0x740,table,sizeof table);
 for(unsigned r=0;r<21;r++){
  Block*record=save(table[r],0x78);DWORD frames=word(record->bytes,0x6c),address=word(record->bytes,0x68);
  if(!frames||frames>10000)fail("frame count");
  for(DWORD i=0;i<frames;i++){
   if(!address)fail("short frame chain");
   Block*frame=save(address,0x34);
   if(word(frame->bytes,0)!=i)fail("frame order");
   DWORD child=word(frame->bytes,0xc);unsigned children=0;
   while(child){if(++children>256)fail("child chain limit");Block*c=save(child,0x30);child=word(c->bytes,0x2c);}
   address=word(frame->bytes,0x18);
  }
  if(address)fail("long frame chain");
 }
 DWORD after[21];read_bytes(bike+0x740,after,sizeof after);if(memcmp(table,after,sizeof table))fail("table changed");
 FILE*out=fopen(argv[3],"wx");if(!out)fail("exclusive output");
 fprintf(out,"{\"schemaVersion\":1,\"kind\":\"mcm-animation-observation\",\"bikeAddress\":%lu,\"records\":[",bike);
 for(unsigned i=0;i<21;i++)fprintf(out,"%s%lu",i?",":"",table[i]);
 fprintf(out,"],\"blockCount\":%u,\"blocks\":[",count);
 for(unsigned i=0;i<count;i++){Block*b=&blocks[i];fprintf(out,"%s{\"address\":%lu,\"size\":%lu,\"hex\":\"",i?",":"",b->address,b->size);for(DWORD j=0;j<b->size;j++)fprintf(out,"%02x",b->bytes[j]);fprintf(out,"\"}");}
 fprintf(out,"]}\n");if(ferror(out)||fclose(out))fail("write");CloseHandle(process);fprintf(stderr,"records=21 blocks=%u\n",count);return 0;
}
