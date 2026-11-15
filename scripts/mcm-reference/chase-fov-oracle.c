#define main unused_helper_main
#include "oracle.c"
#undef main
unsigned char fov_camera[0x260],fov_owner[0x40],fov_frame[0x120];uint32_t fov_filter[4];
void fov_phase(void);void fov_exit(void);void prefix_exit(void);
__asm__(".text\n_fov_phase:\n push %ebp\n push %ebx\n push %esi\n push %edi\n mov $_fov_camera,%esi\n mov $_fov_frame+0x100,%ebp\n push $0x2007db8f\n ret\n_fov_exit:\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n_prefix_exit:\n pop %esi\n ret $4\n");
static void jump(uintptr_t at,void*to){unsigned char*p=(void*)at;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)to-at-5;}
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);jump(0x2007dbd1,fov_exit);jump(0x20079e76,prefix_exit);
 *(void**)(fov_camera+0x1c)=fov_owner;*(void**)(fov_camera+0x228)=fov_filter;
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t a[11],r[8];
 while(fread(a,sizeof a,1,in)==1){
  memcpy(fov_filter,a,16);memcpy(fov_camera+0x200,a+4,4);memcpy(fov_frame+0x108,a+5,4);memcpy(fov_camera+0x13c,a+6,4);memcpy(fov_owner+0x38,a+7,4);memcpy(fov_camera+0x1bc,a+8,4);memcpy(fov_camera+0x28,a+9,4);fov_camera[0x1b0]=(unsigned char)a[10];
  unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));fov_phase();
  memcpy(r,fov_filter,16);memcpy(r+4,fov_camera+0x13c,4);memcpy(r+5,fov_camera+0x1bc,4);
  ((int (__thiscall *)(void*,uint32_t))0x20079e40)(fov_camera,a[5]);
  memcpy(r+6,fov_camera+0x1bc,4);r[7]=fov_camera[0x1b0];
  if(fwrite(r,sizeof r,1,out)!=1)fail("write");
 }return ferror(in)||fclose(out)?7:0;
}
