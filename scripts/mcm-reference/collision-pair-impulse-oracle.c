#define main unused_helper_main
#include "oracle.c"
#undef main
unsigned char nodes[2][0x114];
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  float v[104];uint32_t r[47];if(fread(v,sizeof v,1,in)!=1)fail("input");
  memset(nodes,0,sizeof nodes);
  for(int k=0;k<2;k++){float*p=v+k*49;memcpy(nodes[k]+0x84,p,64);memcpy(nodes[k]+0xc4,p+16,64);*(int*)(nodes[k]+0x104)=(int)p[32];}
  typedef void (__cdecl *Impulse)(float,float*,float,void*,float*,float*,float*,float*,float*,float,void*,float*,float*,float*,float*,float*,float*);
  float*a=v,*b=v+49;
  ((Impulse)0x2005b6b0)(v[98],v+99,a[33],nodes[0],a+34,a+37,a+40,a+43,a+46,b[33],nodes[1],b+34,b+37,b+40,b+43,v[103]?b+46:NULL,v+102);
  memcpy(r,a+43,24);memcpy(r+6,b+43,24);memcpy(r+12,v+102,4);
  for(int k=0;k<2;k++){memcpy(r+13+k*17,nodes[k]+0xc4,64);memcpy(r+29+k*17,nodes[k]+0x104,4);}
  if(fwrite(r,sizeof r,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
