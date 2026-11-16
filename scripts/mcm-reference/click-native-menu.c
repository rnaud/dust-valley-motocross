// Guarded normal mouse input for the pinned original at 640x480.
#include <windows.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
static HANDLE process;
static int read_at(DWORD address,void *value,SIZE_T size){
 SIZE_T got=0;return ReadProcessMemory(process,(void*)(uintptr_t)address,value,size,&got)&&got==size;
}
static DWORD word(DWORD address){DWORD value;if(!read_at(address,&value,4)){fprintf(stderr,"unreadable=%08lx\n",address);exit(3);}return value;}
// Send normal mouse input only after resolving the requested live menu control.
// No debugger, callback trampoline, or game-memory write is used.
int main(int argc,char **argv){
 if(argc!=5){fprintf(stderr,"Usage: click-native-menu PID HWND EXPECTED_MENU CONTROL\n");return 2;}
 DWORD pid=strtoul(argv[1],NULL,0),expected=strtoul(argv[3],NULL,0),owner;
 HWND window=(HWND)(uintptr_t)strtoul(argv[2],NULL,0);
 GetWindowThreadProcessId(window,&owner);if(owner!=pid||!IsWindow(window))return 3;
 process=OpenProcess(PROCESS_VM_READ,FALSE,pid);if(!process)return 3;
 DWORD settings=word(0x4e4fb4),menu=word(settings+0x610),root=word(menu+0x30),dialog=word(root+0x30);
 if(word(menu+0xa0)!=expected||!dialog)return 4;
 DWORD count=word(dialog+0x44);if(count>200)return 4;
 for(DWORD i=0;i<count;i++){
  DWORD control=word(dialog+0x64+i*4);BYTE bytes[0x130];
  if(!read_at(control,bytes,sizeof bytes))return 4;
  char name[57]={0};memcpy(name,bytes+0xf8,56);if(strcmp(name,argv[4]))continue;
  if(*(WORD*)(bytes+0x1c)!=1||!*(WORD*)(bytes+0x20)||!*(DWORD*)(bytes+0x24)){fprintf(stderr,"control type/enabled/visible rejected\n");return 5;}
  ShowWindow(window,SW_RESTORE);Sleep(300);
  RECT client;GetClientRect(window,&client);
  LONG left=*(LONG*)(bytes+0xc),top=*(LONG*)(bytes+0x10),right=*(LONG*)(bytes+0x14),bottom=*(LONG*)(bytes+0x18);
  if(client.right!=640||client.bottom!=480||left<0||top<0||right>640||bottom>480||left>=right||top>=bottom){fprintf(stderr,"window/control dimensions rejected: client=%ld,%ld\n",client.right,client.bottom);return 5;}
  // The original windowed menu consumes screen coordinates directly. Adding
  // the client origin shifted the pause click onto Quit and missed Next.
  RECT outer;GetWindowRect(window,&outer);if(outer.left!=0||outer.top!=30){fprintf(stderr,"window origin rejected: %ld,%ld\n",outer.left,outer.top);return 5;}
  POINT p={(left+right)/2,(top+bottom)/2};
  SetForegroundWindow(window);if(!SetCursorPos(p.x,p.y))return 5;Sleep(300);
  POINT actual;GetCursorPos(&actual);
  if(actual.x!=p.x||actual.y!=p.y||GetForegroundWindow()!=window||word(menu+0xa0)!=expected){fprintf(stderr,"cursor/foreground/menu verification rejected: cursor=%ld,%ld expected=%ld,%ld foreground=%p\n",actual.x,actual.y,p.x,p.y,GetForegroundWindow());return 5;}
  printf("menu=%lx control=%s address=%08lx mouse=%ld,%ld foreground_verified=1\n",expected,name,control,p.x,p.y);
  mouse_event(MOUSEEVENTF_LEFTDOWN,0,0,0,0);Sleep(100);mouse_event(MOUSEEVENTF_LEFTUP,0,0,0,0);
  CloseHandle(process);return 0;
 }
 return 6;
}
