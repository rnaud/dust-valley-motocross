// Complete original 0x410ac0/0x48e4c0 queries on course nodes loaded by 0x48a2f0.
// Reuse host stdio/allocation adapters; renderer initialization is omitted.
// The sample hook records reads and then executes the overwritten instructions.
#define MCM_COURSE_NO_MAIN
#include "terrain-course-oracle.c"
static uint32_t node_offset(void*p){if(!p)return 0;uint32_t i=*(uint32_t*)((unsigned char*)p+0x1b8);if(i<node_count&&nodes[i]==p)return offsets[i];fail("unknown child");return 0;}

static uint32_t trace_records[1000000][7],trace_count,current_query;
void record_samples(void*node,unsigned char*samples){
 if(trace_count>=1000000)fail("trace limit");
 uint32_t*r=trace_records[trace_count++];
 r[0]=current_query;r[1]=node_offset(node);
 r[2]=(samples-*(unsigned char**)((unsigned char*)node+0x50))/16;
 r[3]=*(uint16_t*)(samples+2);r[4]=*(uint16_t*)(samples+0x12);
 r[5]=*(uint16_t*)(samples+0x112);r[6]=*(uint16_t*)(samples+0x122);
}
void samples_hook(void);
__asm__(".text\n_samples_hook:\n pushfl\n pushal\n push %ecx\n push %esi\n call _record_samples\n add $8,%esp\n popal\n popfl\n xor %eax,%eax\n movw 2(%ecx),%ax\n push $0x2008f139\n ret\n");
int main(int argc,char**argv){
 if(argc!=6)return 2;
 map_image(argv[1]);
 if(memcmp((void*)0x2008f133,"\x33\xc0\x66\x8b\x41\x02",6))fail("unexpected sample read");
 patch(0x2008f133,samples_hook);
 patch(0x200be4e0,fread);patch(0x200be400,fseek);patch(0x200be910,allocate);
 vtable[4]=child;vtable[6]=renderer;
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 ((void (__cdecl *)(void))0x20001640)();((void (__cdecl *)(void))0x20001720)();((void (__cdecl *)(void))0x20012910)();
 FILE*trn=fopen(argv[2],"rb"),*in=fopen(argv[3],"rb"),*out=fopen(argv[4],"wb");if(!trn||!in||!out)fail("open");
 uint32_t h[4];if(fread(h,16,1,in)!=1||h[0]>100000)fail("header");
 void**banks=allocate(h[0]*4);for(uint32_t i=0;i<h[0];i++){banks[i]=allocate(4624);if(fread(banks[i],4624,1,in)!=1)fail("bank");}
 *(void**)(owner+0x9fc)=banks;memcpy(owner+0x40,h+1,4);memcpy(owner+0xa04,h+2,4);
 if(fseek(trn,h[3],SEEK_SET))fail("root seek");
 *(void**)(owner+0x44)=construct(trn,NULL);
 if(fwrite(&node_count,4,1,out)!=1)fail("count output");
 for(uint32_t i=0;i<node_count;i++){
  unsigned char*n=nodes[i];uint32_t record[266]={offsets[i]};
  memcpy(record+1,n+0xc,8);memcpy(record+3,n+0x20,8);memcpy(record+5,n+0x3c,4);memcpy(record+6,n+0x14,8);memcpy(record+8,n+0x28,8);
  void**children=*(void***)(n+0x54);if(children)for(int j=0;j<256;j++)record[10+j]=node_offset(children[j]);
  if(fwrite(record,sizeof record,1,out)!=1)fail("node output");
 }
 uint32_t count;if(fread(&count,4,1,in)!=1||count>100000)fail("query count");
 for(uint32_t i=0;i<count;i++){
  current_query=i;
  float start[3],end[3],point[3]={71,-83,97};void*hit_node=NULL;
  if(fread(start,12,1,in)!=1||fread(end,12,1,in)!=1)fail("query");
  uint32_t result=((uint32_t (__attribute__((thiscall)) *)(void*,float*,float*,float*,void**))0x20010ac0)(owner,start,end,point,&hit_node);
  uint32_t offset=node_offset(hit_node);
  if(fwrite(&result,4,1,out)!=1||fwrite(point,12,1,out)!=1||fwrite(&offset,4,1,out)!=1)fail("query output");
 }
 if(fclose(out))fail("close");
 FILE*trace=fopen(argv[5],"wb");if(!trace||fwrite(trace_records,28,trace_count,trace)!=trace_count||fclose(trace))fail("trace output");
 return 0;
}

