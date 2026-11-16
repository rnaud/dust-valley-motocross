#define main unused_helper_main
#include "oracle.c"
#undef main
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t a[32],r[2],offsets[10]={0x78,0x88,0x98,0xa8,0x1a8,0x1ac,0xf0,0x100,0x110,0x120};BYTE camera[0x200];size_t n;
 while((n=fread(a,1,sizeof a,in))==sizeof a){memset(camera,0,sizeof camera);for(int i=0;i<10;i++)memcpy(camera+offsets[i],a+i,4);r[1]=a[31];unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));r[0]=((uint32_t(__stdcall*)(void*,void*,void*,float,void*))0x2007f620)(camera,a+10,a+26,*(float*)(a+29),a[30]?r+1:NULL);if(fwrite(r,sizeof r,1,out)!=1)fail("write");}if(n||ferror(in)||fclose(out))fail("finish");return 0;
}
