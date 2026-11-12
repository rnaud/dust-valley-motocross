/* Reuse the existing verified PE loader. Its scheduler patch is unused here.
 * Only rand() is replaced with a supplied draw in this private mapped image;
 * the original automatic-shift instructions execute unchanged.
 */
#define main unused_helper_main
#include "oracle.c"
#undef main
static uint8_t engine_state[0x1f0];
static uint32_t supplied_random, random_calls;
static uint32_t __cdecl draw_random(void) {random_calls++; return supplied_random;}
int main(int argc,char**argv) {
    if(argc!=4)return 2;
    map_image(argv[1]);
    uint8_t *rng=(void*)0x200bf190;
    rng[0]=0xe9;
    int32_t relative=(intptr_t)draw_random-(intptr_t)(rng+5);
    memcpy(rng+1,&relative,4);
    FlushInstructionCache(GetCurrentProcess(),rng,5);
    FILE *in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");
    if(!in||!out)fail("open gear cases/results");
    uint32_t count;
    if(fread(&count,4,1,in)!=1||count>1000000)fail("invalid case count");
    for(uint32_t i=0;i<count;i++) {
        uint32_t speed,word;
        memset(engine_state,0,sizeof engine_state);
        memset(bike,0,sizeof bike);
        if(fread(engine_state,0x16c,1,in)!=1||fread(&speed,4,1,in)!=1||fread(&supplied_random,4,1,in)!=1||fread(&word,4,1,in)!=1)fail("truncated gear case");
        if(supplied_random>32767||(word!=0x027f&&word!=0x037f))fail("invalid numeric controls");
        uint32_t pointer=(uintptr_t)bike;
        memcpy(engine_state,&pointer,4);
        put32(0x564,speed);
        unsigned short cw=(unsigned short)word;
        __asm__ volatile("fninit; fldcw %0"::"m"(cw));
        random_calls=0;
        ((void (__attribute__((thiscall)) *)(void*,uint32_t,uint32_t))0x200ad720)(engine_state,0,0);
        if(fwrite(engine_state,0x16c,1,out)!=1||fwrite(&random_calls,4,1,out)!=1)fail("write gear result");
    }
    if(fgetc(in)!=EOF)fail("trailing gear input");
    fclose(in);if(fclose(out))fail("close gear results");return 0;
}
