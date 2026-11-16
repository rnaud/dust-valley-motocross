#define main unused_helper_main
#include "oracle.c"
#undef main
static unsigned char pool[0x2404],scene[0x30],camera[0x1bc],settings[0x184],particles[8][0x48],projected[8][32],input[0x3ec];
unsigned seed;static unsigned order[8],calls[130],vtable[31],device[1];static unsigned char texture[0x48];
static void logcall(unsigned op,unsigned a,unsigned b,unsigned c,unsigned d,unsigned e,unsigned f,unsigned g){unsigned n=calls[1]++;if(n==16)fail("calls");unsigned*p=calls+2+n*8;p[0]=op;p[1]=a;p[2]=b;p[3]=c;p[4]=d;p[5]=e;p[6]=f;p[7]=g;}
static int __attribute__((thiscall)) bind_texture(void*p){if(p!=texture)fail("texture");logcall(1,1,0,0,0,0,0,0);return 1;}
static int __attribute__((thiscall)) state(void*p,unsigned a,unsigned b,unsigned c){if(p!=scene)fail("scene");logcall(2,a,b,c,0,0,0,0);return 1;}
static int __attribute__((stdcall)) draw(void*p,unsigned primitive,unsigned type,void*vertices,unsigned vertexCount,void*indices,unsigned indexCount,unsigned flags){if(p!=device||vertices!=pool+0x2004||indices!=pool+0x1ff8)fail("draw pointers");logcall(3,primitive,type,1,vertexCount,2,indexCount,flags);return 1;}
static void patch(unsigned address,void*target){unsigned char*p=(void*)address;p[0]=0xe9;*(unsigned*)(p+1)=(unsigned)target-address-5;}

__attribute__((naked)) static int run_stage(void*p){__asm__ volatile("sub $0x80,%esp; push %ebx; push %esi; push %edi; push %ebp; mov 0x94(%esp),%esi; mov _seed,%eax; mov %eax,0x58(%esp); mov 0x34(%esi),%eax; mov $0x2003b582,%edx; jmp *%edx");}
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);patch(0x20042ee0,bind_texture);patch(0x20094f30,state);vtable[30]=(unsigned)draw;device[0]=(unsigned)vtable;
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");unsigned short cw=0x027f;
 while(fread(input,sizeof input,1,in)==1){
  unsigned count=*(unsigned*)input;if(count>8)fail("count");memset(pool,0xa5,sizeof pool);seed=*(unsigned*)(input+8);
  memcpy(settings+0x180,input+4,4);memcpy(camera+0x1a8,input+12,8);for(unsigned j=0;j<4;j++)memcpy(camera+0xb8+j*16,input+0x14+j*4,4);
  memcpy((void*)0x200f7580,input+0x24,128);*(void**)(scene+4)=settings;*(void**)(scene+0x2c)=camera;*(void**)(pool+0x1c)=scene;*(unsigned*)(pool+0x34)=count;
  for(unsigned i=0;i<8;i++){memcpy(particles[i],input+0xa4+i*0x48,0x48);memcpy(projected[i],input+0x2e4+i*32,32);*(void**)(particles[i]+0x44)=projected[i];*(void**)(pool+0xfe4+i*4)=particles[i];}
  memset(calls,0,sizeof calls);*(void**)(scene+0xc)=device;*(void**)(pool+0x1f84)=texture;*(unsigned*)(texture+0x44)=*(unsigned*)(input+0x3e8);*(unsigned*)(pool+0x30)=*(unsigned*)(input+0x3e4);*(void**)(pool+0x1ff4)=pool+0x1ff8;
  __asm__ volatile("fninit; fldcw %0"::"m"(cw));calls[0]=run_stage(pool);
  for(unsigned i=0;i<8;i++)order[i]=(*(unsigned char**)(pool+0xfe4+i*4)-particles[0])/0x48;
  if(fwrite(order,sizeof order,1,out)!=1||fwrite(pool+0x2004,1024,1,out)!=1||fwrite(calls,sizeof calls,1,out)!=1)fail("output");
 }if(ferror(in)||fclose(out))fail("finish");return 0;
}
