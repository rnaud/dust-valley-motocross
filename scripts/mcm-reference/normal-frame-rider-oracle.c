#define main unused_helper_main
#include "oracle.c"
#undef main
float position_input[130];uint32_t position_output[3247];unsigned char nodes[6][0x114];
unsigned char children[21][8][2][0x30],component_table[2][8*0x40];
unsigned char animation_record[21][0x70],animation_frames[21][8][0x34];
unsigned char proxy[0x500],lean_component[0x48];
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);((void (__cdecl *)(void))0x20001720)();unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  if(fread(position_input,sizeof position_input,1,in)!=1)fail("input");
  float*v=position_input;memset(nodes,0,sizeof nodes);
  for(int o=0;o<2;o++){
   int base=o*3;
   for(int k=0;k<3;k++){
    memcpy(nodes[base+k]+0x84,v+k*32,64);memcpy(nodes[base+k]+0xc4,v+k*32+16,64);*(uint32_t*)(nodes[base+k]+0x104)=(uint32_t)v[96+k];
    if(o)for(int j=0;j<3;j++){*(float*)(nodes[base+k]+0xb4+j*4)+=10;*(float*)(nodes[base+k]+0xf4+j*4)+=20;}
   }
   int parent=base+(int)v[104];*(void**)(nodes[base]+0x108)=nodes[parent];*(void**)(nodes[parent]+0x10c)=nodes[base];
   if(o?v[123]:v[105]){*(void**)(nodes[base+1]+0x108)=nodes[base+2];*(void**)(nodes[base+1]+0x110)=*(void**)(nodes[base+2]+0x10c);*(void**)(nodes[base+2]+0x10c)=nodes[base+1];}
  }
  memset(bike,0,sizeof bike);memset(proxy,0,sizeof proxy);memset(children,0,sizeof children);memset(component_table,0,sizeof component_table);
  memset(animation_record,0,sizeof animation_record);memset(animation_frames,0,sizeof animation_frames);
  int component=(int)v[112];
  for(int o=0;o<2;o++){
   unsigned char*object=o?proxy:bike;
   *(void**)(component_table[o]+component*0x40+0x34)=nodes[o*3];*(int*)(component_table[o]+component*0x40+0x38)=(int)v[114];
   *(void**)(object+0x234)=component_table[o];*(void**)(object+0x434)=nodes[o*3+1];*(uint32_t*)object=o?0x200d7b14:0x200d9a94;
   *(void**)(object+0x10)=animation_record[0];*(void**)(object+0x14)=animation_frames[0][0];
   for(int k=0;k<6;k++)*(float*)(object+0x218+k*4)=(float)(100+o*10+k);
  }
  for(int r=0;r<21;r++){
   int count=(int)v[115];
   *(void**)(animation_record[r]+0x68)=animation_frames[r][0];*(int*)(animation_record[r]+0x6c)=count;
   for(int j=0;j<8;j++){
    unsigned char*frame=animation_frames[r][j];*(int*)frame=j;
    if(j+1<count)*(void**)(frame+0x18)=animation_frames[r][j+1];
    if(((int)v[124]>>(j%2))&1)*(void**)(frame+0xc)=children[r][j][0];
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
  for(int r=0;r<21;r++)put32(0x740+r*4,(uintptr_t)animation_record[r]);
  put32(0xc8c,(uintptr_t)proxy);put32(0x724,(int)v[118]);put32(0x728,bits(v[117]));put32(0x72c,(int)v[119]);put32(0x730,bits(v[116]));put32(0x734,bits(v[122]));put32(0x820,(int)v[120]);put32(0x848,bits(v[121]));put32(0xbfc,(int)v[125]);put32(0x844,(int)v[126]);put32(0x618,(int)v[128]);
  memcpy(lean_component+0x44,v+127,4);put32(0x8ec,(uintptr_t)lean_component);
  typedef void (__attribute__((thiscall)) *Update)(void*,float);
  ((Update)0x200af710)(bike,v[129]);
  for(int k=0;k<6;k++){memcpy(position_output+k*33,nodes[k]+0x84,64);memcpy(position_output+k*33+16,nodes[k]+0xc4,64);memcpy(position_output+k*33+32,nodes[k]+0x104,4);}
  int offsets[9]={0x724,0x728,0x72c,0x730,0x734,0x820,0x848,0x844,0xbfc};for(int k=0;k<9;k++)position_output[198+k]=get32(offsets[k]);
  for(int o=0;o<2;o++){
   unsigned char*object=o?proxy:bike;int record=-1;
   for(int r=0;r<21;r++)if(*(void**)(object+0x10)==animation_record[r])record=r;
   position_output[207+o*8]=record;position_output[208+o*8]=**(int**)(object+0x14);memcpy(position_output+209+o*8,object+0x218,24);
  }
  int out_index=223;for(int r=0;r<21;r++)for(int j=0;j<8;j++)for(int k=0;k<2;k++){memcpy(position_output+out_index,children[r][j][k]+8,36);out_index+=9;}
  if(fwrite(position_output,sizeof position_output,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
