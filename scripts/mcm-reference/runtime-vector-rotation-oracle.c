#include <windows.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
typedef void* (__stdcall *Rotate)(float*,float*,float*,float);
int main(int argc,char**argv){
 if(argc!=4)return 2;
 HMODULE module=LoadLibraryA(argv[1]);if(!module)return 3;
 Rotate rotate=(Rotate)(uintptr_t)GetProcAddress(module,"D3DRMVectorRotate");if(!rotate)return 4;
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)return 5;
 float args[7];while(fread(args,sizeof args,1,in)==1){float values[9];memcpy(values+3,args+3,12);memcpy(values+6,args,12);unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));rotate(values,values+6,values+3,args[6]);if(fwrite(values,sizeof values,1,out)!=1)return 6;}
 return ferror(in)||fclose(out)?7:0;
}
