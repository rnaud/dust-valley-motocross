#define main unused_main
#include "oracle.c"
#undef main
unsigned char post_camera[0x260],post_world[0xa00],post_frame[0x120];uint32_t post_filters[6][4];
void post_phase(void);void post_exit(void);
__asm__(".text\n_post_phase:\n push %ebp\n push %ebx\n push %esi\n push %edi\n mov $_post_camera,%esi\n mov $_post_camera+0x22c,%edi\n mov $_post_frame+0x100,%ebp\n push $0x2007d606\n ret\n_post_exit:\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n");
int main(int argc,char**argv){if(argc!=4)return 2;map_image(argv[1]);unsigned char*p=(void*)0x2007d71f;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)post_exit-(uintptr_t)p-5;
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("files");uint32_t a[41];
 *(void**)(post_camera+0x1f0)=post_world;for(int i=0;i<6;i++)*(void**)(post_camera+0x210+i*4)=post_filters[i];
 while(fread(a,sizeof a,1,in)==1){memcpy(post_camera+0x1f8,a,4);memcpy(post_camera+0x1f4,a+1,4);memcpy(post_world+0x954,a+2,4);memcpy(post_camera+0x20c,a+3,4);memcpy(post_camera+0x204,a+4,4);memcpy(post_frame+0xb4,a+5,12);memcpy(post_frame+0xcc,a+8,12);memcpy(post_frame+0x84,a+11,12);memcpy(post_camera+0x22c,a+14,12);memcpy(post_filters,a+17,96);
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));post_phase();uint32_t r[32];memcpy(r,post_camera+0x1f8,4);memcpy(r+1,post_camera+0x20c,4);memcpy(r+2,post_camera+0x22c,12);memcpy(r+5,post_frame+0x84,12);memcpy(r+8,post_filters,96);if(fwrite(r,sizeof r,1,out)!=1)fail("write");
 }return ferror(in)||fclose(out)?7:0;}
