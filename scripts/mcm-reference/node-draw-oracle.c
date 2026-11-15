#define main unused_helper_main
#include "oracle.c"
#undef main
static unsigned calls;
static int __thiscall prepare_node(void*p){(void)p;calls=calls*4+1;return 0;}
static int __thiscall draw_node(void*p){(void)p;calls=calls*4+2;return 0;}
static int __thiscall fallback_node(void*p){(void)p;calls=calls*4+3;return 0;}
static void patch(uintptr_t at,void*target){unsigned char*p=(void*)at;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)target-at-5;}
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);patch(0x20044ab0,prepare_node);patch(0x20045870,draw_node);
 unsigned char node[0x280]={0};void*vtable[2]={0,fallback_node};*(void**)node=vtable;
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t a[4],r[3];
 while(fread(a,sizeof a,1,in)==1){memcpy(node+0x12c,a,4);memcpy(node+0x180,a+1,4);memcpy(node+0x18c,a+2,8);calls=0;r[0]=((int (__thiscall *)(void*))0x200465b0)(node);memcpy(r+1,node+0x180,4);r[2]=calls;if(fwrite(r,sizeof r,1,out)!=1)fail("write");}return ferror(in)||fclose(out)?7:0;
}
