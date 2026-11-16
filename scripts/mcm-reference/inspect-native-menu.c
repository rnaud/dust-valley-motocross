// Read-only menu discovery for the pinned original. Rectangle coordinates are
// native UI coordinates; they are not assumed to equal window mouse coordinates.
#include <windows.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
static HANDLE process;
static int read_at(DWORD address,void *value,SIZE_T size){
 SIZE_T got=0;return ReadProcessMemory(process,(void*)(uintptr_t)address,value,size,&got)&&got==size;
}
static DWORD word(DWORD address){DWORD value;if(!read_at(address,&value,4)){fprintf(stderr,"unreadable=%08lx\n",address);exit(3);}return value;}
int main(int argc,char **argv){
 if(argc!=2)return 2;
 process=OpenProcess(PROCESS_VM_READ,FALSE,strtoul(argv[1],NULL,0));if(!process)return 2;
 DWORD settings=word(0x4e4fb4),menu=word(settings+0x610),root=word(menu+0x30),dialog=word(root+0x30);
 printf("menu=%08lx state=%lx dialog=%08lx\n",menu,word(menu+0xa0),dialog);
 if(!dialog){CloseHandle(process);return 0;}
 DWORD count=word(dialog+0x44);if(count>200)return 3;
 for(DWORD i=0;i<count;i++){
  DWORD control=word(dialog+0x64+i*4);BYTE bytes[0x130];
  if(!read_at(control,bytes,sizeof bytes))return 3;
  char name[57]={0};memcpy(name,bytes+0xf8,56);
  printf("control=%08lx name=%s type=%u bounds=%ld,%ld,%ld,%ld",control,name,*(WORD*)(bytes+0x1c),*(LONG*)(bytes+0xc),*(LONG*)(bytes+0x10),*(LONG*)(bytes+0x14),*(LONG*)(bytes+0x18));
  if(*(WORD*)(bytes+0x1c)==13){char text[256]={0};DWORD pointer=*(DWORD*)(bytes+0xd4);if(pointer&&read_at(pointer,text,255))printf(" text=%s",text);}
  puts("");
 }
 CloseHandle(process);return 0;
}
