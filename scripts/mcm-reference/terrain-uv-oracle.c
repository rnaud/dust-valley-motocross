#define main unused_main
#include "oracle.c"
#undef main
unsigned char tile[0x220],world[0xa00],texture[0x20],surface[0x60],builder[0x3000];
uint32_t local_x,local_y;
void uv_phase(void);void uv_exit(void);
__asm__(".text\n_uv_phase:\n push %ebp\n push %ebx\n push %esi\n push %edi\n sub $0x20,%esp\n mov $_builder,%edx\n mov _local_x,%ebx\n mov _local_y,%edi\n push $0x2008b4c7\n ret\n_uv_exit:\n add $0x20,%esp\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n");
int main(int argc,char**argv){if(argc!=4)return 2;map_image(argv[1]);
 unsigned char*p=(void*)0x2008b6cb;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)uv_exit-(uintptr_t)p-5;
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("files");uint32_t a[7];
 *(void**)(tile+0x5c)=world;*(void**)(world+0x550)=texture;*(void**)(texture+0xc)=surface;*(void**)builder=tile;
 while(fread(a,sizeof a,1,in)==1){memcpy(world+0x954,a,4);memcpy(tile+0x30,a+1,4);memcpy(surface+0x38,a+2,4);memcpy(surface+0x3c,a+3,4);memcpy(tile+0x48,a+4,4);local_x=a[5];local_y=a[6];
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 ((void (__attribute__((thiscall)) *)(void*,uint32_t))0x200ba000)(tile,0);
 memcpy((void*)0x20124fd8,tile+0x1d8,4);uv_phase();
 uint32_t r[5];memcpy(r,tile+0x1d0,12);memcpy(r+3,builder+0x928,8);if(fwrite(r,sizeof r,1,out)!=1)fail("write");
 }return ferror(in)||fclose(out)?7:0;}
