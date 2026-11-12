/* Original linear integration slice, private exit jump at 0x4ab49e. */
#define main unused_helper_main
#include "oracle.c"
#undef main
uint32_t linear_dt, linear_delta[3];
void linear_integrate(void);
void linear_exit(void);
__asm__(
".text\n"
"_linear_integrate:\n"
" push %ebp\n push %ebx\n push %esi\n push %edi\n sub $0xc00,%esp\n"
" mov $_bike,%esi\n mov _linear_dt,%eax\n mov %eax,0x10(%esp)\n"
" mov _linear_delta,%eax\n mov %eax,0x4e0(%esp)\n"
" mov _linear_delta+4,%eax\n mov %eax,0x4e4(%esp)\n"
" mov _linear_delta+8,%eax\n mov %eax,0x4e8(%esp)\n"
" xor %eax,%eax\n mov $0x200ab38e,%edx\n jmp *%edx\n"
"_linear_exit:\n"
" add $0xc00,%esp\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n"
);
int main(int argc,char**argv) {
    if(argc!=4)return 2;
    map_image(argv[1]);
    uint8_t *end=(void*)0x200ab49e;end[0]=0xe9;
    int32_t relative=(intptr_t)linear_exit-(intptr_t)(end+5);memcpy(end+1,&relative,4);
    FlushInstructionCache(GetCurrentProcess(),end,5);
    FILE *in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");
    if(!in||!out)fail("open linear cases/results");
    uint32_t count;
    if(fread(&count,4,1,in)!=1||count>1000000)fail("invalid case count");
    for(uint32_t i=0;i<count;i++) {
        memset(bike,0,sizeof bike);
        if(fread(bike+0x4f8,12,1,in)!=1||fread(bike+0x510,12,1,in)!=1||fread(linear_delta,12,1,in)!=1||fread(&linear_dt,4,1,in)!=1||fread(bike+0x61c,4,1,in)!=1)fail("truncated linear case");
        unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
        linear_integrate();
        if(fwrite(bike+0x4f8,12,1,out)!=1||fwrite(bike+0x510,12,1,out)!=1||fwrite(bike+0x6a4,4,1,out)!=1)fail("write linear result");
    }
    if(fgetc(in)!=EOF)fail("trailing linear input");
    fclose(in);if(fclose(out))fail("close linear results");return 0;
}
