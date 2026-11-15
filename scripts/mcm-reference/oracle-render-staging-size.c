// Execute the intact pinned staging-size function and its native callees.
#include <windows.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
uint32_t sizing_input[39],sizing_output[3];void*sizing_target;
void sizing_run(void);
__asm__(".text\n_sizing_run:\n mov $_sizing_input,%eax\n mov $_sizing_input+132,%edx\n mov $_sizing_output,%ecx\n push $_sizing_output+8\n call *_sizing_target\n add $4,%esp\n ret\n");
int main(int argc,char**argv){
 if(argc!=4)return 2;
 uint8_t*base=(void*)LoadLibraryExA(argv[1],NULL,DONT_RESOLVE_DLL_REFERENCES);if(!base)return 3;
 const uint8_t guard[]={0x55,0x89,0xe5,0x57,0x56,0x89,0xce};if(memcmp(base+0x7f4e0,guard,sizeof guard))return 4;
 // Disable diagnostic calls only; arithmetic and branch instructions untouched.
 *(uint32_t*)(base+0x216360)&=~8u;sizing_target=base+0x7f4e0;
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)return 5;unsigned count=0;size_t n;
 while((n=fread(sizing_input,1,sizeof sizing_input,in))==sizeof sizing_input){sizing_run();if(fwrite(sizing_output,1,sizeof sizing_output,out)!=sizeof sizing_output)return 6;count++;}
 fprintf(stderr,"cases=%u\n",count);int bad=n!=0||ferror(in);fclose(in);return fclose(out)||bad?7:0;
}
