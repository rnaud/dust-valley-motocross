#define main unused_helper_main
#include "oracle.c"
#undef main
static uint32_t input[33],output[258],count,vt[10];
static unsigned char world[0x1330],group[0x10],sounds[6][0x180];
static uint32_t buffers[6][2];
static void logop(unsigned op,unsigned id,unsigned a,unsigned b){if(count==64)fail("commands");uint32_t*p=output+2+count++*4;p[0]=op;p[1]=id;p[2]=a;p[3]=b;}
static unsigned id(void*p){for(unsigned i=0;i<6;i++)if(p==sounds[i])return i;fail("identity");return 0;}
static int __attribute__((thiscall)) stop(void*p,unsigned reset){unsigned n=id(p);logop(2,n+1,reset,input[9+n*4+2]);return input[9+n*4+2];}
static int __attribute__((thiscall)) play(void*p,unsigned reserved,unsigned loop){logop(3,id(p)+1,reserved,loop);return 1;}
static int __attribute__((stdcall)) status(uint32_t*p,unsigned*out){unsigned n=p[1];*out=input[9+n*4];logop(1,n+1,*out,input[9+n*4+1]);return input[9+n*4+1];}
static void error(unsigned code,unsigned path,unsigned line){if(path!=0x200e13f4)fail("error path");logop(4,code,0x4e13f4,line);}
static void patch(unsigned address,void*target){unsigned char*p=(void*)address;p[0]=0xe9;*(uint32_t*)(p+1)=(unsigned)target-address-5;}
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);patch(0x20002ad0,stop);patch(0x20002860,play);patch(0x20003e10,error);
 *(void**)0x200e4fb4=world;vt[9]=(unsigned)status;
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");
 while(fread(input,sizeof input,1,in)==1){
  if(input[8]>6||input[3]>6)fail("range");memset(output,0,sizeof output);count=0;
  *(unsigned*)(world+0x700)=input[1];*(unsigned*)(world+0xe2c)=input[2];
  *(void**)(group+0xc)=input[8]?sounds[0]:NULL;
  for(unsigned i=0;i<6;i++){buffers[i][0]=(unsigned)vt;buffers[i][1]=i;*(void**)(sounds[i]+0x40)=input[9+i*4+3]?buffers[i]:NULL;*(void**)(sounds[i]+0x38)=i+1<input[8]?sounds[i+1]:NULL;}
  if(input[0])output[0]=((int(__attribute__((thiscall))*)(void*,unsigned))0x20001cf0)(group,input[7]);
  else{((void(__attribute__((stdcall))*)(void*,unsigned,unsigned,unsigned))0x20026af0)(input[3]?sounds[input[3]-1]:NULL,input[6],input[4],input[5]);output[0]=1;}
  output[1]=count;if(fwrite(output,sizeof output,1,out)!=1)fail("output");
 }if(ferror(in)||fclose(out))fail("finish");return 0;
}
