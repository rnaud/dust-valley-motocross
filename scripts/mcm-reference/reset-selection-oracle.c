#define main unused_helper_main
#include "oracle.c"
#undef main
float input[37];uint32_t output[18];unsigned char settings[0x1074];
void patch(uint32_t address,void*target){unsigned char*p=(void*)(uintptr_t)address;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)target-address-5;}
void capture(int kind,void*self,float*position,float*forward){
 if(self!=bike||output[9])fail("unexpected helper");
 output[9]++;output[10]=kind;output[11]=forward!=NULL;
 memcpy(output+12,position,12);if(forward)memcpy(output+15,forward,12);
 memcpy(position,input+(kind==1?19:25),12);if(forward)memcpy(forward,input+(kind==1?22:28),12);
}
void __attribute__((thiscall)) terrain(void*self,float*p,float*f){capture(1,self,p,f);}
void __attribute__((thiscall)) course(void*self,float*p,float*f){capture(2,self,p,f);}
void setup(unsigned char*s){
 memset(bike,0,sizeof bike);memset(settings,0,sizeof settings);memset(output,0,sizeof output);
 *(void**)0x200e4fb4=settings;*(short*)(settings+0x1072)=(short)input[0];*(short*)(settings+0x1070)=(short)input[1];
 put32(0xbb8,(int)input[2]);put32(0x614,(int)input[3]);*(int*)(s+0x8c)=(int)input[4];put32(0xc08,(int)input[5]);put32(0xbe4,(int)input[6]);
 memcpy(bike+0x4f8,input+7,12);memcpy(bike+0x4c0,input+10,12);memcpy(bike+0xbc0,input+13,12);memcpy(bike+0xbcc,input+16,12);
 memcpy(s+0x378,input+31,12);memcpy(s+0x2f4,input+34,12);
}
void copy(unsigned char*s){memcpy(output,s+0x378,12);memcpy(output+3,s+0x2f4,12);memcpy(output+6,bike+0x4f8,12);}
void run_selection(void);void selection_exit(void);
__asm__(".text\n_run_selection:\n push %ebp\n push %ebx\n push %esi\n push %edi\n sub $0xc00,%esp\n mov %esp,%eax\n push %eax\n call _setup\n add $4,%esp\n mov $_bike,%esi\n mov $0x200a5eb4,%eax\n jmp *%eax\n_selection_exit:\n mov %esp,%eax\n push %eax\n call _copy\n add $4,%esp\n add $0xc00,%esp\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n");
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);patch(0x200a62eb,selection_exit);patch(0x200ae0b0,terrain);patch(0x200adb10,course);((void (__cdecl *)(void))0x20001720)();
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){if(fread(input,sizeof input,1,in)!=1)fail("input");run_selection();if(fwrite(output,sizeof output,1,out)!=1)fail("output");}
 if(fclose(out))fail("close");
 return 0;
}
