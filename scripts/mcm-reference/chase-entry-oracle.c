#define main unused_main
#include "oracle.c"
#undef main
unsigned char gate_camera[0x260],gate_bike[0x900],gate_frame[0xd0];
uint32_t eye_gate;
void restore_phase(void);void restore_exit(void);void multiplier_phase(void);void multiplier_exit(void);
__asm__(".text\n_restore_phase:\n push %ebp\n push %ebx\n push %esi\n push %edi\n mov $_gate_camera,%esi\n mov $_gate_frame+0xc0,%ebp\n push $0x2007b3e7\n ret\n_restore_exit:\n mov %ebx,_eye_gate\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n_multiplier_phase:\n push %ebp\n push %esi\n mov $_gate_camera,%esi\n mov $_gate_frame+0xc0,%ebp\n push $0x2007c2fa\n ret\n_multiplier_exit:\n pop %esi\n pop %ebp\n ret\n");
static void jump(uintptr_t a,uintptr_t b){unsigned char*p=(void*)a;p[0]=0xe9;*(uint32_t*)(p+1)=b-a-5;FlushInstructionCache(GetCurrentProcess(),p,5);}
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);jump(0x2007b452,(uintptr_t)restore_exit);jump(0x2007c30c,(uintptr_t)multiplier_exit);
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("files");uint32_t a[10];
 while(fread(a,sizeof a,1,in)==1){
 *(void**)(gate_camera+0x1ec)=gate_bike;
 memcpy(gate_camera+0x1f4,a,4);memcpy(gate_camera+0x24c,a+1,4);memcpy(gate_bike+0x844,a+2,4);
 memcpy(gate_camera+0x1cc,a+3,4);memcpy(gate_camera+0x1d8,a+4,4);memcpy(gate_camera+0x1e0,a+5,4);memcpy(gate_camera+0x23c,a+6,12);memcpy(gate_camera+0x13c,a+9,4);
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));restore_phase();multiplier_phase();
 uint32_t r[6];memcpy(r,gate_camera+0x1cc,4);memcpy(r+1,gate_camera+0x1d8,4);memcpy(r+2,gate_camera+0x1e0,4);memcpy(r+3,gate_camera+0x24c,4);r[4]=eye_gate;memcpy(r+5,gate_frame+0x38,4);
 if(fwrite(r,sizeof r,1,out)!=1)fail("write");
 }return ferror(in)||fclose(out)?7:0;
}
