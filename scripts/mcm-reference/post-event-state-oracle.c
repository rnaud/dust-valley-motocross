#define main unused_helper_main
#include "oracle.c"
#undef main
float post_input[85];uint32_t post_output[50];unsigned char post_node[0x114],post_parent[0x114],post_game[0x74],post_settings[0x1074],front_component[0x60],rear_component[0x60];
void run_post(void);void post_exit(void);
void setup_post(unsigned char*s){
 float*v=post_input;memset(post_node,0,sizeof post_node);memset(post_parent,0,sizeof post_parent);memset(post_game,0,sizeof post_game);memset(post_settings,0,sizeof post_settings);
 memcpy(post_node+0x84,v,64);memcpy(post_node+0xc4,v+16,64);memcpy(post_parent+0x84,v+32,64);memcpy(post_parent+0xc4,v+48,64);
 *(uint32_t*)(post_node+0x104)=(uint32_t)v[69];*(uint32_t*)(post_parent+0x104)=(uint32_t)v[71];if(v[70])*(void**)(post_node+0x108)=post_parent;
 put32(0x434,(uintptr_t)post_node);memcpy(bike+0x534,v+64,12);memcpy(bike+0x6a4,v+67,4);*(int*)(s+0x34)=(int)v[68];put32(0x714,(int)v[72]);put32(0xbfc,(int)v[73]);put32(0x870,(int)v[74]);memcpy(bike+0x718,v+75,4);memcpy(bike+0x818,v+76,4);memcpy(bike+0xc7c,v+77,4);memcpy(s+0x10,v+78,4);memcpy(bike+0x590,v+79,4);memcpy(bike+0x594,v+80,4);
 *(short*)(post_settings+0x1072)=(short)v[81];*(void**)0x200e4fb4=post_settings;put32(0xc84,(uintptr_t)post_game);put32(0x8e4,(uintptr_t)front_component);put32(0x8e8,(uintptr_t)rear_component);memcpy(front_component+0x58,v+82,4);memcpy(rear_component+0x5c,v+83,4);memcpy(bike+0x8d0,v+84,4);
}
void copy_post(void){
 memcpy(post_output,bike+0x4f8,12);memcpy(post_output+3,bike+0x534,12);memcpy(post_output+6,bike+0x528,12);post_output[9]=get32(0x714);post_output[10]=get32(0x870);memcpy(post_output+11,bike+0x718,4);memcpy(post_output+12,bike+0xc7c,4);memcpy(post_output+13,front_component+0x58,4);memcpy(post_output+14,rear_component+0x5c,4);memcpy(post_output+15,bike+0x8d0,4);memcpy(post_output+16,post_node+0xc4,64);memcpy(post_output+32,post_parent+0xc4,64);memcpy(post_output+48,post_node+0x104,4);memcpy(post_output+49,post_parent+0x104,4);
}
__asm__(".text\n_run_post:\n push %ebp\n push %ebx\n push %esi\n push %edi\n sub $0xc00,%esp\n mov %esp,%eax\n push %eax\n call _setup_post\n add $4,%esp\n mov $_bike,%esi\n mov $0x200ac6cd,%eax\n jmp *%eax\n_post_exit:\n call _copy_post\n add $0xc00,%esp\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n");
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);unsigned char*p=(void*)0x200ac7c4;p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)(uintptr_t)post_exit-0x200ac7c4-5;
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  if(fread(post_input,sizeof post_input,1,in)!=1)fail("input");
  memset(bike,0,sizeof bike);run_post();if(fwrite(post_output,sizeof post_output,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
