#define main unused_helper_main
#include "oracle.c"
#undef main
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t a[33],r[38];unsigned char camera[0x200]={0};
 while(fread(a,sizeof a,1,in)==1){memcpy(camera+0x178,a+22,16);memcpy(r+1,a+28,16);r[5]=a[32];memset((void*)0x2011ede0,0,256);unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));r[0]=((int (__stdcall *)(void*,void*,void*,void*,void*,void*))0x2007e8a0)(camera,a,a+16,a+19,a[26]?r+1:NULL,a[27]?r+5:NULL);for(int i=0;i<8;i++)memcpy(r+6+i*4,(void*)(0x2011ede0+i*32),16);if(fwrite(r,sizeof r,1,out)!=1)fail("write");}return ferror(in)||fclose(out)?7:0;
}
