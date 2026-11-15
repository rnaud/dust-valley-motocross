// Runs camera bounds, intact terrain query, pitch correction and scene caps.
#define MCM_COURSE_NO_MAIN
#include "terrain-course-oracle.c"
static unsigned char clearance_camera[0x260],clearance_manager[0x1300],clearance_frame[0x120];
uint32_t clearance_gate;
void clearance_phase(void);void clearance_exit(void);
__asm__(".text\n_clearance_phase:\n push %ebp\n push %ebx\n push %esi\n push %edi\n mov $_clearance_camera,%esi\n mov $_clearance_frame+0x100,%ebp\n push $0x2007d71f\n ret\n_clearance_exit:\n mov %ebx,_clearance_gate\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n");
int main(int argc,char**argv){
 if(argc!=5)return 2;
 map_image(argv[1]);
 patch(0x200be4e0,fread);patch(0x200be400,fseek);patch(0x200be910,allocate);patch(0x2007d945,clearance_exit);
 vtable[4]=child;vtable[6]=renderer;
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 ((void (__cdecl *)(void))0x20001640)();((void (__cdecl *)(void))0x20001720)();((void (__cdecl *)(void))0x20012910)();
 FILE*trn=fopen(argv[2],"rb"),*in=fopen(argv[3],"rb"),*out=fopen(argv[4],"wb");if(!trn||!in||!out)fail("open");
 uint32_t h[4];if(fread(h,16,1,in)!=1||h[0]>100000)fail("header");
 void**banks=allocate(h[0]*4);for(uint32_t i=0;i<h[0];i++){banks[i]=allocate(4624);if(fread(banks[i],4624,1,in)!=1)fail("bank");}
 *(void**)(owner+0x9fc)=banks;memcpy(owner+0x40,h+1,4);memcpy(owner+0xa04,h+2,4);
 if(fseek(trn,h[3],SEEK_SET))fail("root seek");
 *(void**)(owner+0x44)=construct(trn,NULL);
 *(void**)0x200e4fb4=clearance_manager;*(void**)(clearance_camera+0x1f0)=owner;
 if(*(uint32_t*)0x200eb800)fail("Unsupported string locale");
 uint32_t a[12];while(fread(a,sizeof a,1,in)==1){
  memcpy(clearance_manager+0x1072,a,2);memcpy(clearance_manager+0x724,a+1,4);memcpy(clearance_camera+0x250,a+2,4);memcpy(clearance_frame+0x84,a+3,12);memcpy(clearance_camera+0x1d8,a+6,4);memcpy(clearance_camera+0x1cc,a+7,4);memcpy(clearance_manager+0x117f,a+8,16);clearance_manager[0x118f]=0;
  __asm__ volatile("fninit; fldcw %0"::"m"(cw));clearance_phase();
  uint32_t r[6];memcpy(r,clearance_frame+0x84,12);memcpy(r+3,clearance_camera+0x1d8,4);r[4]=clearance_gate;memcpy(r+5,clearance_frame+0x48,4);if(fwrite(r,sizeof r,1,out)!=1)fail("write");
 }
 return ferror(in)||fclose(out)?7:0;
}
