/* Execute the original drive-force instructions with supplied engine/bike inputs. */
#define main unused_helper_main
#include "oracle.c"
#undef main
static uint8_t engine_state[0x1f0], force_bike[0xcc8];
int main(int argc,char**argv) {
    if(argc!=4)return 2;
    map_image(argv[1]);
    FILE *in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");
    if(!in||!out)fail("open force cases/results");
    uint32_t count;
    if(fread(&count,4,1,in)!=1||count>1000000)fail("invalid case count");
    if(fwrite((void*)0x200d9968,4,1,out)!=1)fail("write force scale");
    for(uint32_t i=0;i<count;i++) {
        float speed,direction[3],vector[3],scalar,ai_scale;
        uint32_t ai;
        memset(engine_state,0,sizeof engine_state);
        memset(force_bike,0,sizeof force_bike);
        if(fread(engine_state,0x16c,1,in)!=1||fread(&speed,4,1,in)!=1||fread(direction,12,1,in)!=1||fread(&ai,4,1,in)!=1||fread(&ai_scale,4,1,in)!=1)fail("truncated force case");
        uint32_t pointer=(uintptr_t)force_bike;
        memcpy(engine_state,&pointer,4);
        memcpy(force_bike+0x614,&ai,4);memcpy(force_bike+0xba8,&ai_scale,4);
        unsigned short cw=0x027f;
        __asm__ volatile("fninit; fldcw %0"::"m"(cw));
        ((void (__attribute__((thiscall)) *)(void*,float,float*,float*,float*))0x200ad980)(engine_state,speed,direction,vector,&scalar);
        if(fwrite(&scalar,4,1,out)!=1||fwrite(vector,12,1,out)!=1)fail("write force result");
    }
    if(fgetc(in)!=EOF)fail("trailing force input");
    fclose(in);if(fclose(out))fail("close force results");return 0;
}
