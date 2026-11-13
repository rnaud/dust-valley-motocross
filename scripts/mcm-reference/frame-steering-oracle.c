#define main unused_scheduler_main
#include "oracle.c"
#undef main
uint32_t steering_input[14],steering_output[5];unsigned char component[0x60];
void steering_setup(unsigned char*s){
 memset(s,0,0xc00);memcpy(s+0x20,steering_input+6,4);memcpy(s+0x10,steering_input+7,4);memcpy(s+0xbfc,steering_input+9,4);
}
void steering_capture(unsigned char*s){
 memcpy(steering_output,s+0x1d0,4);memcpy(steering_output+1,s+0x28,4);memcpy(steering_output+2,s+0x190,4);steering_output[3]=get32(0x700);
 steering_output[4]=0;if((int32_t)get32(0x848)>0x41c80000&&(steering_input[9]&0x7fffffff)&&(int32_t)get32(0x73c)>0x41f00000)memcpy(steering_output+4,s+0x1cc,4);
}
void steering_run(void);void steering_exit(void);
__asm__(".text\n_steering_run:\n push %ebp\n push %ebx\n push %esi\n push %edi\n sub $0xc00,%esp\n mov %esp,%eax\n push %eax\n call _steering_setup\n add $4,%esp\n mov $_bike,%esi\n push $0x200a57c0\n ret\n_steering_exit:\n lea 4(%esp),%eax\n push %eax\n call _steering_capture\n add $8,%esp\n add $0xc00,%esp\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n");
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);
 unsigned char*p=(void*)0x200a5993;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)steering_exit-0x200a5993-5;
 ((void(__cdecl*)(void))0x20001640)();
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;if(fread(&count,4,1,in)!=1)fail("count");
 const int offsets[]={0x724,0,0,0x564,0x5ec,0x6f4,0,0,0x8c8,0,0x848,0x73c,0x6ec,0x700};
 for(uint32_t i=0;i<count;i++){
  if(fread(steering_input,sizeof steering_input,1,in)!=1)fail("input");
  memset(bike,0,sizeof bike);memset(component,0,sizeof component);
  for(int j=0;j<14;j++)if(offsets[j])put32(offsets[j],steering_input[j]);
  memcpy(component+0x48,steering_input+1,4);memcpy(component+0x44,steering_input+2,4);put32(0x8ec,(uintptr_t)component);
  steering_run();if(fwrite(steering_output,sizeof steering_output,1,out)!=1)fail("output");
 }
 fclose(in);fclose(out);return 0;
}
