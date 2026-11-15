#define main unused_helper_main
#include "oracle.c"
#undef main
unsigned char final_camera[0x260],final_bike[0xd00],final_rider[0x500],final_nodes[2][0x280],final_owner[0x40],final_frame[0x120];void*final_vtable[24];
void finalize_phase(void);void finalize_exit(void);
__asm__(".text\n_finalize_phase:\n push %ebp\n push %ebx\n push %esi\n push %edi\n mov $_final_camera,%esi\n mov $_final_camera+0x22c,%edi\n mov $_final_frame+0x100,%ebp\n push $0x2007d945\n ret\n_finalize_exit:\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n");
static void patch_final(uintptr_t at){unsigned char*p=(void*)at;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)finalize_exit-at-5;}
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);((void (__cdecl *)(void))0x20001720)();patch_final(0x2007d9f4);patch_final(0x2007dc06);
 *(void**)final_camera=final_vtable;final_vtable[20]=(void*)0x2007a3d0;*(void**)(final_camera+0x1ec)=final_bike;*(void**)(final_camera+0x1c)=final_owner;
 *(void**)(final_bike+0x434)=final_nodes[0];*(void**)(final_bike+0xc8c)=final_rider;*(void**)(final_rider+0x434)=final_nodes[1];
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t a[43],r[31];
 while(fread(a,sizeof a,1,in)==1){
  memcpy(final_frame+0x6c,a,4);memcpy(final_camera+0x1f4,a+1,4);memcpy(final_frame+0x80,a+2,4);memcpy(final_bike+0x4e8,a+3,4);memcpy(final_bike+0x4d8,a+4,4);memcpy(final_frame+0x84,a+5,12);memcpy(final_camera+0x22c,a+8,12);memcpy(final_camera+0x144,a+11,40);memcpy(final_camera+0x1c4,a+21,8);memcpy(final_camera+0x1bc,a+23,4);memcpy(final_owner+0x38,a+24,4);
  for(int i=0;i<2;i++){memcpy(final_nodes[i]+0x12c,a+25+i*9,4);memcpy(final_nodes[i]+0x240,a+26+i*9,32);}
  unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));finalize_phase();
  memcpy(r,final_camera+0x144,40);memcpy(r+10,final_camera+0x1c4,8);memcpy(r+12,final_camera+0x1bc,4);for(int i=0;i<2;i++){memcpy(r+13+i*9,final_nodes[i]+0x12c,4);memcpy(r+14+i*9,final_nodes[i]+0x240,32);}
  if(fwrite(r,sizeof r,1,out)!=1)fail("write");
 }return ferror(in)||fclose(out)?7:0;
}
