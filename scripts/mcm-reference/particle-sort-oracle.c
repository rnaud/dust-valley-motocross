#define main unused_helper_main
#include "oracle.c"
#undef main
static unsigned input[1025],output[1024];
static unsigned char particles[1024][0x48];
static float projected[1024][4];
static void*order[1024];
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");
 while(fread(input,sizeof input,1,in)==1){
  if(input[0]>1024)fail("count");for(unsigned i=0;i<1024;i++){projected[i][2]=value(input[i+1]);*(void**)(particles[i]+0x44)=projected[i];order[i]=particles[i];}
  ((void(*)(void*,unsigned,unsigned,void*))0x200bec70)(order,input[0],4,(void*)0x2003b350);
  for(unsigned i=0;i<1024;i++)output[i]=((unsigned char*)order[i]-particles[0])/0x48;
  if(fwrite(output,sizeof output,1,out)!=1)fail("write");
 }if(ferror(in)||fclose(out))fail("finish");return 0;
}
