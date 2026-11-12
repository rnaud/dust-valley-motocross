/* Execute the original opposing-acceleration helper without instruction patches. */
#define main unused_helper_main
#include "oracle.c"
#undef main
int main(int argc,char**argv) {
    if(argc!=4)return 2;
    map_image(argv[1]);
    FILE *in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");
    if(!in||!out)fail("open opposing cases/results");
    uint32_t count;
    if(fread(&count,4,1,in)!=1||count>1000000)fail("invalid case count");
    for(uint32_t i=0;i<count;i++) {
        float v[3],a[3],d[3],dt;uint32_t mask;
        if(fread(v,12,1,in)!=1||fread(a,12,1,in)!=1||fread(d,12,1,in)!=1||fread(&dt,4,1,in)!=1||fread(&mask,4,1,in)!=1)fail("truncated opposing case");
        unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
        ((void (__cdecl *)(float*,float*,float*,float,uint32_t))0x200b0a70)(v,a,d,dt,mask);
        if(fwrite(v,12,1,out)!=1||fwrite(a,12,1,out)!=1)fail("write opposing result");
    }
    if(fgetc(in)!=EOF)fail("trailing opposing input");
    fclose(in);if(fclose(out))fail("close opposing results");return 0;
}
