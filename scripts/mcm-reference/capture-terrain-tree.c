#include <windows.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
static HANDLE p;static FILE*out;static DWORD seen[20000],count;
static int readmem(DWORD a,void*b,DWORD n){SIZE_T got;return ReadProcessMemory(p,(void*)(uintptr_t)a,b,n,&got)&&got==n;}
static int visit(DWORD a,unsigned depth){
 if(!a)return 1;
 if(depth>4||count>=20000)return 0;
 for(DWORD i=0;i<count;i++)if(seen[i]==a)return 1;
 unsigned char b[0x58];DWORD r[262]={a};if(!readmem(a,b,sizeof b))return 0;
 memcpy(r+1,b+0xc,8);memcpy(r+3,b+0x20,8);memcpy(r+5,b+0x3c,4);
 if(r[3]>4)return 0;
 if(r[3]){DWORD children;memcpy(&children,b+0x54,4);if(children&&!readmem(children,r+6,1024))return 0;}
 seen[count++]=a;if(fwrite(r,sizeof r,1,out)!=1)return 0;
 for(unsigned i=0;i<256;i++)if(r[6+i]&&!visit(r[6+i],depth+1))return 0;
 return 1;
}
int main(int argc,char**argv){
 if(argc!=4)return 2;
 DWORD pid=strtoul(argv[1],0,0),terrain=strtoul(argv[2],0,0),root;
 p=OpenProcess(PROCESS_VM_READ,FALSE,pid);if(!p||!readmem(terrain+0x44,&root,4)||!root)return 3;
 out=fopen(argv[3],"wbx");if(!out)return 4;
 int ok=visit(root,0);if(fclose(out))ok=0;CloseHandle(p);printf("nodes=%lu complete=%d\n",count,ok);return ok?0:5;
}
