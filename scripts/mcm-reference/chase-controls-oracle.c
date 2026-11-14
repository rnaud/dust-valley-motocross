#define main unused_main
#include "oracle.c"
#undef main
unsigned char gate_camera[0x260],gate_bike[0x900],gate_frame[0xd0];
uint32_t eye_gate;
unsigned char manager[0x100],devices[0x100],keyboard[0x1800],joystick[0x600];
void restore_phase(void);void restore_exit(void);void multiplier_phase(void);void multiplier_exit(void);
__asm__(".text\n_restore_phase:\n push %ebp\n push %ebx\n push %esi\n push %edi\n mov $_gate_camera,%esi\n mov $_gate_frame+0xc0,%ebp\n push $0x2007b52a\n ret\n_restore_exit:\n mov %edi,_eye_gate\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n_multiplier_phase:\n push %ebp\n push %esi\n mov $_gate_camera,%esi\n mov $_gate_frame+0xc0,%ebp\n push $0x2007c2fa\n ret\n_multiplier_exit:\n pop %esi\n pop %ebp\n ret\n");
static void jump(uintptr_t a,uintptr_t b){unsigned char*p=(void*)a;p[0]=0xe9;*(uint32_t*)(p+1)=b-a-5;FlushInstructionCache(GetCurrentProcess(),p,5);}
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);jump(0x2007c30c,(uintptr_t)restore_exit);
 *(void**)0x200e4fb4=manager;*(void**)(manager+0x10)=devices;*(void**)(devices+0x24)=keyboard;*(void**)(joystick+4)=devices;
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("files");uint32_t a[17];unsigned keys[]={0x48,0x50,0x4b,0x4d,0x4a,0x0c,0x4e,0x0d};
 while(fread(a,sizeof a,1,in)==1){
  if(a[0]==5||a[16]>20)return 8;
  memset(gate_camera,0,sizeof gate_camera);memset(keyboard,0,sizeof keyboard);
  memcpy(gate_camera+0x1f4,a,4);memcpy(gate_frame+0x2c,a+1,4);memcpy(gate_camera+0x20c,a+2,4);
  memcpy(gate_camera+0x1cc,a+3,4);memcpy(gate_camera+0x1d8,a+4,4);memcpy(gate_camera+0x1e0,a+5,4);memcpy(gate_camera+0x13c,a+6,4);memcpy(gate_frame+0xc8,a+7,4);
  for(unsigned i=0;i<8;i++)*(uint32_t*)(keyboard+0x288+keys[i]*20)=(a[8]>>i)&1;
  *(void**)(devices+0xc)=a[9]?joystick:NULL;memcpy(joystick+0x594,a+10,4);memcpy(joystick+0x584,a+11,4);memcpy(joystick+0x2a0+2*20,a+12,4);memcpy(joystick+0x2a0+3*20,a+13,4);memcpy(keyboard+0x4cc,a+14,4);memcpy(keyboard+0xecc,a+15,4);
  for(unsigned step=0;step<a[16];step++){
   unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));restore_phase();
   uint32_t r[6];memcpy(r,gate_camera+0x1cc,4);memcpy(r+1,gate_camera+0x1d8,4);memcpy(r+2,gate_camera+0x1e0,4);memcpy(r+3,gate_camera+0x20c,4);r[4]=eye_gate;memcpy(r+5,gate_frame+0x38,4);if(fwrite(r,sizeof r,1,out)!=1)fail("write");
  }
 }return ferror(in)||fclose(out)?7:0;
}
