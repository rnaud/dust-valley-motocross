#define main unused_main
#include "oracle.c"
#undef main
unsigned char source_camera[0x240],source_frame[0xd0],source_bike[0x700];
void source_phase(void);void source_exit(void);
__asm__(".text\n_source_phase:\n push %ebp\n push %ebx\n push %esi\n push %edi\n mov $_source_camera,%esi\n mov $_source_frame+0xc0,%ebp\n push $0x2007b107\n ret\n_source_exit:\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n");
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);((void(__cdecl*)(void))0x20001720)();memset((void*)0x2011ed90,0,12);
 unsigned char*p=(void*)0x2007b1fe;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)source_exit-(uintptr_t)p-5;FlushInstructionCache(GetCurrentProcess(),p,5);
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("files");uint32_t args[8];
 while(fread(args,sizeof args,1,in)==1){memset(source_frame,0,sizeof source_frame);*(void**)(source_camera+0x1ec)=source_bike;memcpy(source_bike+0x4c0,args,12);memcpy(source_bike+0x510,args+3,12);memcpy(source_bike+0x6a4,args+6,4);memcpy(source_bike+0x620,args+7,4);
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));source_phase();uint32_t result[4];memcpy(result,source_frame+0x68,12);memcpy(result+3,source_frame+0xb0,4);if(fwrite(result,sizeof result,1,out)!=1)fail("write");}
 return ferror(in)||fclose(out)?7:0;
}
