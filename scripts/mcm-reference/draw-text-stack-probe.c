// Isolated Wine DrawTextA stack-footprint experiment, not an original-game
// trajectory oracle. Uses captured text/rectangle/flags and caller alignment,
// but a separately created Arial font/DC (native captured return height differs).
// The live reference is never attached or modified by this helper.
#include <windows.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
unsigned char probe_stack[65536] __attribute__((aligned(16)));
uint32_t saved_stack,probe_result;
HDC probe_dc;
RECT probe_rect={0,0,127,15};
char probe_text[]="BOSCO : 726900";
void *probe_target;
void draw_probe(void);
__asm__(".text\n_draw_probe:\n push %ebp\n push %ebx\n push %esi\n push %edi\n mov %esp,_saved_stack\n mov $_probe_stack+32780,%esp\n push $292\n push $_probe_rect\n push $14\n push $_probe_text\n push _probe_dc\n mov _probe_target,%eax\n call *%eax\n mov %eax,_probe_result\n mov _saved_stack,%esp\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n");
int main(int argc,char**argv){
 if(argc!=2)return 2;
 probe_target=(void*)GetProcAddress(GetModuleHandleA("user32.dll"),"DrawTextA");
 probe_dc=CreateCompatibleDC(NULL);HBITMAP bitmap=CreateBitmap(128,64,1,32,NULL);HFONT font=CreateFontA(13,0,0,0,400,0,0,0,0,0,0,0,0,"Arial");
 if(!probe_target||!probe_dc||!bitmap||!font)return 2;
 HGDIOBJ oldBitmap=SelectObject(probe_dc,bitmap),oldFont=SelectObject(probe_dc,font);SetBkMode(probe_dc,TRANSPARENT);SetTextColor(probe_dc,0xffffff);SetTextAlign(probe_dc,TA_LEFT);
 memset(probe_stack,0xa5,sizeof(probe_stack));draw_probe();
 unsigned low=32780;for(unsigned i=0;i<32780;i++)if(probe_stack[i]!=0xa5){low=i;break;}
 uint32_t word;memcpy(&word,probe_stack+32780-2468,4);
 printf("result=%lu deepest=%u targetOffset=%u targetWord=%08lx\n",(unsigned long)probe_result,32780-low,2468,(unsigned long)word);
 FILE*f=fopen(argv[1],"wbx");int ok=f&&fwrite(probe_stack,sizeof(probe_stack),1,f)==1;if(f)fclose(f);
 SelectObject(probe_dc,oldFont);SelectObject(probe_dc,oldBitmap);DeleteObject(font);DeleteObject(bitmap);DeleteDC(probe_dc);return ok?0:3;
}
