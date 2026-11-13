#define main unused_helper_main
#include "oracle.c"
#undef main
float position_input[121];uint32_t position_output[395];unsigned char nodes[3][0x114];
unsigned char children[2][8][2][0x30],component_table[8*0x40];
unsigned char animation_record[2][0x70],animation_frames[2][8][0x34];
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);((void (__cdecl *)(void))0x20001720)();unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  if(fread(position_input,sizeof position_input,1,in)!=1)fail("input");
  float*v=position_input;memset(nodes,0,sizeof nodes);
  for(int k=0;k<3;k++){memcpy(nodes[k]+0x84,v+k*32,64);memcpy(nodes[k]+0xc4,v+k*32+16,64);*(uint32_t*)(nodes[k]+0x104)=(uint32_t)v[96+k];}
  int parent=(int)v[104];*(void**)(nodes[0]+0x108)=nodes[parent];*(void**)(nodes[parent]+0x10c)=nodes[0];
  if(v[105]){*(void**)(nodes[1]+0x108)=nodes[2];*(void**)(nodes[1]+0x110)=*(void**)(nodes[2]+0x10c);*(void**)(nodes[2]+0x10c)=nodes[1];}
  memset(bike,0,sizeof bike);memset(children,0,sizeof children);memset(component_table,0,sizeof component_table);
  memset(animation_record,0,sizeof animation_record);memset(animation_frames,0,sizeof animation_frames);
  int count0=(int)v[115],count1=(int)v[118],component=(int)v[112];
  *(void**)(component_table+component*0x40+0x34)=nodes[0];
  *(int*)(component_table+component*0x40+0x38)=(int)v[114];
  put32(0x234,(uintptr_t)component_table);put32(0x434,(uintptr_t)nodes[1]);put32(0,v[120]?0x200d7b14:0x200d9a94);
  for(int r=0;r<2;r++){
   int count=r?count1:count0;
   *(void**)(animation_record[r]+0x68)=animation_frames[r][0];*(int*)(animation_record[r]+0x6c)=count;
   for(int j=0;j<8;j++){
    unsigned char*frame=animation_frames[r][j];*(int*)frame=j;
    if(j+1<count)*(void**)(frame+0x18)=animation_frames[r][j+1];
    if(((int)v[119]>>(r*2+j%2))&1)*(void**)(frame+0xc)=children[r][j][0];
    for(int k=0;k<6;k++)*(float*)(frame+0x1c+k*4)=(double)v[101+k%3]+(r*8+j)*(k+1);
    for(int c=0;c<2;c++){
     unsigned char*child=children[r][j][c];child[0]=component;*(int*)(child+4)=((int)v[113]+r+j+c)%2;
     if(c==0&&count%2==0)*(void**)(child+0x2c)=children[r][j][1];
     int n=(r*8+j)*3+c;
     for(int k=0;k<3;k++){
      *(float*)(child+8+k*4)=(double)v[106+k]+n*.125*(k+1);
      *(float*)(child+0x14+k*4)=(double)v[109+k]-n*.0625*(k+1);
      *(float*)(child+0x20+k*4)=(double)v[101+k]+n*.25*(k+1);
     }
    }
   }
  }
  typedef void (__attribute__((thiscall)) *Blend)(void*,void*,void*,float,float);
  ((Blend)0x20030b70)(bike,animation_record[0],animation_record[1],v[116],v[117]);
  for(int k=0;k<3;k++){memcpy(position_output+k*33,nodes[k]+0x84,64);memcpy(position_output+k*33+16,nodes[k]+0xc4,64);memcpy(position_output+k*33+32,nodes[k]+0x104,4);}
  position_output[99]=*(int*)(uintptr_t)get32(0x14);position_output[100]=get32(0x10)==(uintptr_t)animation_record[1];
  memcpy(position_output+101,bike+0x218,24);
  int o=107;for(int r=0;r<2;r++)for(int j=0;j<8;j++)for(int c=0;c<2;c++){memcpy(position_output+o,children[r][j][c]+8,36);o+=9;}
  if(fwrite(position_output,sizeof position_output,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
