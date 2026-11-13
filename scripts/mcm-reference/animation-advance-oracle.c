#define main unused_helper_main
#include "oracle.c"
#undef main
float position_input[128];uint32_t position_output[138];unsigned char nodes[3][0x114];
unsigned char child_record[0x30],second_child[0x30],component_table[8*0x40];
unsigned char animation_record[0x78],animation_frames[8][0x34];
unsigned char old_child[0x30],old_second[0x30],old_frame[0x34];uint32_t remap[8];
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
  memset(bike,0,sizeof bike);memset(child_record,0,sizeof child_record);memset(component_table,0,sizeof component_table);
  child_record[0]=(unsigned char)v[112];*(int*)(child_record+4)=(int)v[113];memcpy(child_record+8,v+106,12);memcpy(child_record+0x14,v+109,12);memcpy(child_record+0x20,v+101,12);
  *(void**)(component_table+child_record[0]*0x40+0x34)=nodes[0];put32(0x234,(uintptr_t)component_table);put32(0x434,(uintptr_t)nodes[1]);
  *(int*)(component_table+child_record[0]*0x40+0x38)=(int)v[114];
  memset(animation_record,0,sizeof animation_record);memset(animation_frames,0,sizeof animation_frames);
  int frame_count=(int)v[115];
  memcpy(second_child,child_record,sizeof second_child);*(int*)(second_child+4)=!((int)v[113]);
  memcpy(second_child+8,v+109,12);memcpy(second_child+0x14,v+106,12);
  if(frame_count%2==0)*(void**)(child_record+0x2c)=second_child;
  *(void**)(animation_record+0x68)=animation_frames[0];*(int*)(animation_record+0x6c)=frame_count;
  for(int j=0;j<frame_count;j++){
   unsigned char*r=animation_frames[j];*(int*)r=j;
   if(j+1<frame_count)*(void**)(r+0x18)=animation_frames[j+1];
   if(j%3!=0)*(void**)(r+0xc)=child_record;
   for(int k=0;k<6;k++)*(float*)(r+0x1c+k*4)=v[101+k%3]+j*(k+1);
  }
  put32(0,v[127]?0x200d7b14:0x200d9a94);
  memcpy(old_child,second_child,0x30);memcpy(old_second,child_record,0x30);
  *(void**)(old_child+0x2c)=frame_count%2==0?old_second:NULL;*(void**)(old_second+0x2c)=NULL;
  memset(old_frame,0,sizeof old_frame);*(void**)(old_frame+0xc)=v[126]?old_child:NULL;
  for(int k=0;k<8;k++)remap[k]=7-k;
  put32(0x238,(uintptr_t)remap);
  *(void**)(component_table+remap[child_record[0]]*0x40+0x34)=nodes[0];
  *(int*)(animation_record+0x70)=(int)v[120];*(int*)(animation_record+0x74)=(int)v[121];
  put32(4,(int)v[117]);put32(8,bits(v[118]));put32(0x10,(uintptr_t)animation_record);
  put32(0x14,(uintptr_t)animation_frames[(int)v[119]]);put32(0x18,(uintptr_t)animation_frames[0]);put32(0x1c,(uintptr_t)animation_frames[frame_count-1]);
  put32(0x20,(uintptr_t)old_frame);put32(0x24,bits(v[123]));put32(0x28,bits(v[124]));put32(0x2c,(int)v[122]);
  for(int k=0;k<6;k++)put32(0x218+k*4,bits((float)(100+k)));
  typedef int (__attribute__((thiscall)) *Advance)(void*,float,int);
  for(int step=0;step<4;step++){
  int result=((Advance)0x2002e890)(bike,v[116],(int)v[125]);
  position_output[119]=get32(4);position_output[120]=get32(8);
  position_output[121]=*(int*)(uintptr_t)get32(0x18);position_output[122]=*(int*)(uintptr_t)get32(0x1c);
  position_output[123]=get32(0x24);position_output[124]=get32(0x2c);position_output[125]=result;
  memcpy(position_output+126,old_child+8,24);memcpy(position_output+132,old_second+8,24);
  position_output[105]=*(int*)(uintptr_t)get32(0x14);position_output[106]=get32(0x10)==(uintptr_t)animation_record;
  memcpy(position_output+107,bike+0x218,24);
  for(int k=0;k<3;k++){memcpy(position_output+k*33,nodes[k]+0x84,64);memcpy(position_output+k*33+16,nodes[k]+0xc4,64);memcpy(position_output+k*33+32,nodes[k]+0x104,4);}
  memcpy(position_output+99,child_record+8,24);memcpy(position_output+113,second_child+8,24);
  if(fwrite(position_output,sizeof position_output,1,out)!=1)fail("output");
  }
 }
 if(fclose(out))fail("close");
 return 0;
}
