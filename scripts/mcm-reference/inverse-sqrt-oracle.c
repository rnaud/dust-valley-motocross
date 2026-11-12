/* Original reciprocal-square-root initializer and helper, no helper patches. */
#define main unused_helper_main
#include "oracle.c"
#undef main
int main(int argc,char**argv) {
    if(argc!=4)return 2;
    map_image(argv[1]);
    unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
    ((void (__cdecl *)(void))0x20001720)();
    FILE *in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");
    if(!in||!out)fail("open inverse sqrt cases/results");
    uint32_t count;
    if(fread(&count,4,1,in)!=1||count>1000000)fail("invalid case count");
    for(uint32_t i=0;i<count;i++) {
        float v;
        if(fread(&v,4,1,in)!=1)fail("truncated inverse sqrt case");
        double result=((double (__cdecl *)(float))0x20001770)(v);
        if(fwrite(&result,8,1,out)!=1)fail("write inverse sqrt result");
    }
    if(fgetc(in)!=EOF)fail("trailing input");
    fclose(in);if(fclose(out))fail("close results");return 0;
}
