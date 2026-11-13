#define main unused_helper_main
#include "oracle.c"
#undef main
float position_input[133];uint32_t position_output[269];unsigned char nodes[6][0x114];
unsigned char children[2][2][0x30],component_table[2][8*0x40];
unsigned char animation_record[2][0x78],animation_frames[2][32][0x34];
unsigned char proxy[0x500],input_controller[0x28];uint32_t query_count,queries[2],frame_step;
int __attribute__((thiscall)) supplied_input(void*self,int code,int option,int extra){
 (void)self;if(option||extra||query_count>=2||(code!=6&&code!=7))fail("unexpected input query");
 queries[query_count++]=code;return ((int)position_input[129]>>(frame_step*2+code-6))&1;
}
static void patch(uint32_t address,void*target){unsigned char*p=(void*)(uintptr_t)address;p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)(uintptr_t)target-address-5;}
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);patch(0x20052670,supplied_input);((void (__cdecl *)(void))0x20001720)();unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
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
  for(int r=0;r<2;r++){
   int count=(int)v[115];
   *(void**)(animation_record[r]+0x68)=animation_frames[r][0];*(int*)(animation_record[r]+0x6c)=count;
   *(int*)(animation_record[r]+0x70)=(int)v[126];*(int*)(animation_record[r]+0x74)=(int)v[125];
   for(int j=0;j<32;j++){
    unsigned char*frame=animation_frames[r][j];*(int*)frame=j;
    if(j+1<count)*(void**)(frame+0x18)=animation_frames[r][j+1];
    if(((int)v[124]>>(j%2))&1)*(void**)(frame+0xc)=children[r][0];
    for(int k=0;k<6;k++)*(float*)(frame+0x1c+k*4)=(double)v[101+k%3]+(r*32+j)*(k+1);
   }
   for(int k=0;k<2;k++){
    unsigned char*child=children[r][k];child[0]=component;*(int*)(child+4)=((int)v[113]+r+k)%2;
    if(k==0)*(void**)(child+0x2c)=children[r][1];
    int n=r*3+k;
    for(int a=0;a<3;a++){
     *(float*)(child+8+a*4)=(double)v[106+a]+n*.125*(a+1);
     *(float*)(child+0x14+a*4)=(double)v[109+a]-n*.0625*(a+1);
     *(float*)(child+0x20+a*4)=(double)v[101+a]+n*.25*(a+1);
    }
   }
   unsigned char*object=r?proxy:bike;
   *(int*)(object+4)=((int)v[127]>>r)&1;*(float*)(object+8)=v[130];
   *(void**)(object+0x10)=animation_record[r];*(void**)(object+0x14)=animation_frames[r][(int)v[119]];
   *(void**)(object+0x18)=animation_frames[r][0];*(void**)(object+0x1c)=animation_frames[r][count-1];
   *(void**)(object+0x20)=animation_frames[r][1];*(float*)(object+0x24)=v[131];*(float*)(object+0x28)=v[132];*(int*)(object+0x2c)=((int)v[128]>>r)&1;
  }
  put32(0xc8c,(uintptr_t)proxy);put32(0x710,1);bike[0x814]=(int)v[118];put32(0x818,bits(v[117]));put32(0x81c,bits(v[122]));put32(0x614,(int)v[120]);put32(0x618,(int)v[121]);
  memset(input_controller,0,sizeof input_controller);*(void**)(input_controller+0x24)=bike;put32(0x6e4,(uintptr_t)input_controller);
  typedef void (__attribute__((thiscall)) *Update)(void*,float);
  for(frame_step=0;frame_step<4;frame_step++){
  query_count=0;memset(queries,0,sizeof queries);((Update)0x200af710)(bike,v[116]);
  for(int k=0;k<6;k++){memcpy(position_output+k*33,nodes[k]+0x84,64);memcpy(position_output+k*33+16,nodes[k]+0xc4,64);memcpy(position_output+k*33+32,nodes[k]+0x104,4);}
  int out_index=198;
  for(int r=0;r<2;r++){
   unsigned char*object=r?proxy:bike;
   int offsets[8]={4,8,0x10,0x14,0x18,0x1c,0x24,0x2c};
   for(int k=0;k<8;k++){
    uint32_t value=*(uint32_t*)(object+offsets[k]);
    if(k==2)value=value==(uintptr_t)animation_record[r];
    if(k>=3&&k<=5)value=*(int*)(uintptr_t)value;
    position_output[out_index++]=value;
   }
   memcpy(position_output+out_index,object+0x218,24);out_index+=6;
  }
  for(int r=0;r<2;r++)for(int k=0;k<2;k++){memcpy(position_output+out_index,children[r][k]+8,36);out_index+=9;}
  position_output[out_index++]=get32(0x710);position_output[out_index++]=bike[0x814];position_output[out_index++]=get32(0x818);position_output[out_index++]=get32(0x81c);
  position_output[out_index++]=query_count;position_output[out_index++]=queries[0];position_output[out_index++]=queries[1];
  if(fwrite(position_output,sizeof position_output,1,out)!=1)fail("output");
  }
 }
 if(fclose(out))fail("close");
 return 0;
}
