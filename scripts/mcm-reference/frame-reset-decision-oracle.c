#define main unused_scheduler_main
#include "oracle.c"
#undef main
unsigned char rider[0x174],body[0x114],settings[0x1074],context[0x18c0],controller[0x28],device[4];uint32_t pressed,queries,cleanups;
int __attribute__((thiscall)) pressed_input(void*self,int action,int option,int extra){(void)self;if(action!=15||option||extra)fail("query");queries++;return pressed;}
void cleanup_entry(void);
__asm__(".text\n_cleanup_entry:\n incl _cleanups\n push %ebx\n push %esi\n mov %ecx,%esi\n mov 0x34(%ecx),%ecx\n push $0x2000fbb7\n ret\n");
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);unsigned char*p=(void*)0x200526d0;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)pressed_input-0x200526d0-5;
 p=(void*)0x2000fbb0;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)cleanup_entry-0x2000fbb0-5;
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;if(fread(&count,4,1,in)!=1)fail("count");
 const int offsets[]={0x88c,0,0,0,0xbd8,0x844,0x8b0,0x884,0x87c,0x894,0x564,0x590,0x594,0x4f8,0x4fc,0x500,0xbc0,0xbc4,0xbc8};
 for(uint32_t i=0;i<count;i++){
  uint32_t v[30],r[20];if(fread(v,sizeof v,1,in)!=1)fail("input");
  memset(bike,0,sizeof bike);memset(rider,0,sizeof rider);memset(body,0,sizeof body);memset(settings,0,sizeof settings);memset(context,0,sizeof context);queries=cleanups=0;
  for(int j=0;j<19;j++)if(offsets[j])put32(offsets[j],v[j]);
  put32(0xc40,v[24]);put32(0x434,(uintptr_t)body);put32(0x874,(uintptr_t)rider);put32(0xc84,(uintptr_t)context);put32(0x6e4,v[19]?(uintptr_t)controller:0);*(void**)(controller+0x24)=device;pressed=v[20];
  *(void**)0x200e4fb4=settings;*(short*)(settings+0x1070)=(short)v[1];*(short*)(settings+0x1072)=(short)v[2];memcpy(context+0x18bc,v+3,4);
  memcpy(rider+0x154,v+22,4);memcpy(rider+0x16c,v+23,4);memcpy(rider+0xf8,v+25,4);memcpy(rider+0x138,v+26,16);
  for(int j=0;j<4;j++)*(float*)(body+0x84+j*20)=1;
  for(int j=0;j<3;j++)*(float*)(body+0x84+48+j*4)=7+j;
  typedef int(__attribute__((thiscall))*Decision)(void*,float);r[0]=((Decision)0x200b0610)(bike,value(v[21]));
  r[1]=get32(0x844);r[2]=get32(0x8b0);r[3]=get32(0x884);r[4]=get32(0xc40);memcpy(r+5,bike+0x4f8,12);memcpy(r+8,rider+0x154,4);memcpy(r+9,rider+0xf8,4);memcpy(r+10,rider+0x138,16);memcpy(r+14,rider+0x16c,4);memcpy(r+15,body+0xb4,12);r[18]=queries;r[19]=cleanups;
  if(fwrite(r,sizeof r,1,out)!=1)fail("output");
 }
 fclose(in);fclose(out);return 0;
}
