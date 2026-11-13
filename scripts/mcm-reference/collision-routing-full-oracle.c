#define main unused_helper_main
#include "oracle.c"
#undef main
unsigned char dispatch_manager[0x3988],dispatch_objects[4][0x110],dispatch_cells[2][0x18],dispatch_nodes[8][0x18],dispatch_entries[2][0x18];
uint32_t calls[6],call_count;
void __cdecl primary(void*p){if(call_count>=6)fail("calls");calls[call_count++]=100+*(int*)p;}
void __cdecl secondary(void*p){if(call_count>=6)fail("calls");calls[call_count++]=200+*(int*)p;}
uint32_t object_id(void*p){if(!p)return 0;for(int i=0;i<4;i++)if(p==dispatch_objects[i])return i+1;fail("pointer");return 0;}
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);((void (__cdecl *)(void))0x20001640)();((void (__cdecl *)(void))0x20001720)();
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  float v[86];uint32_t r[66]={0};if(fread(v,sizeof v,1,in)!=1)fail("input");
  memset(dispatch_manager,0,sizeof dispatch_manager);memset(dispatch_objects,0,sizeof dispatch_objects);memset(dispatch_cells,0,sizeof dispatch_cells);memset(dispatch_nodes,0,sizeof dispatch_nodes);memset(dispatch_entries,0,sizeof dispatch_entries);memset(calls,0,sizeof calls);call_count=0;
  for(int k=0;k<4;k++){
   unsigned char*o=dispatch_objects[k];memcpy(o+4,v+62+k*6,24);*(float*)(o+0x60)=v[k*7+6]*v[k*7+6];*(int*)(o+0xf4)=(int)v[58+k];
   for(int axis=0;axis<4;axis++)*(float*)(o+0x1c+axis*20)=1;
   memcpy(o+0x70,v+k*7+3,12);for(int axis=0;axis<3;axis++)*(float*)(o+0x64+axis*4)=v[k*7+6]*(1-axis*.25f);*(int*)o=k;*(int*)(o+0xc8)=(int)v[k*7];*(void**)(o+0x94)=o;
   if(v[k*7+1])*(void**)(o+0x108)=primary;
   if(v[k*7+2])*(void**)(o+0x10c)=secondary;
   memcpy(o+0x7c,v+k*7+3,12);memcpy(o+0x5c,v+k*7+6,4);*(void**)(dispatch_manager+8+k*4)=o;
   for(int j=0;j<9;j++)*(float*)(o+0xcc+j*4)=k*10+j;
  }
  *(void**)(dispatch_objects[0]+0x8c)=dispatch_entries;*(int*)(dispatch_objects[0]+0x90)=2;
  for(int k=0;k<2;k++){*(int*)(dispatch_entries[k]+0x14)=(int)v[28+k*2];*(int*)(dispatch_entries[k]+0xc)=(int)v[29+k*2];*(void**)(dispatch_cells[k]+4)=dispatch_nodes[k*4];}
  for(int k=0;k<8;k++){*(int*)(dispatch_nodes[k]+8)=(int)v[32+k];if(k%4!=3)*(void**)(dispatch_nodes[k]+4)=dispatch_nodes[k+1];}
  *(void**)(dispatch_manager+0x3948)=dispatch_cells;for(int a=0;a<4;a++)for(int b=0;b<4;b++)*(int*)(dispatch_manager+0xf8+(a*60+b)*4)=(int)v[40+a*4+b];
  *(int*)0x200e3758=(int)v[56];memcpy(dispatch_manager+0x394c,v+57,4);for(int j=0;j<12;j++)*(float*)(dispatch_manager+0x3950+j*4)=1000+j;
  typedef void (__attribute__((thiscall))*Dispatch)(void*,void*);((Dispatch)0x2002ccc0)(dispatch_manager,dispatch_objects[0]);
  for(int k=0;k<4;k++){r[k*10]=object_id(*(void**)(dispatch_objects[k]+0x88));memcpy(r+k*10+1,dispatch_objects[k]+0xcc,36);}
  for(int a=0;a<4;a++)for(int b=0;b<4;b++)r[40+a*4+b]=*(int*)(dispatch_manager+0xf8+(a*60+b)*4);
  memcpy(r+56,dispatch_manager+0x394c,4);r[57]=object_id(*(void**)(dispatch_manager+0x3980));r[58]=object_id(*(void**)(dispatch_manager+0x3984));r[59]=call_count;memcpy(r+60,calls,24);
  if(fwrite(r,sizeof r,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
