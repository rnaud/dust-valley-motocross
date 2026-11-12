#define main unused_helper_main
#include "oracle.c"
#undef main
float event_input[465];uint32_t event_output[209],random_calls,input_calls;
unsigned char other_bike[0xcc8],event_terrain[0x958];int event_frame;
int __cdecl supplied_random(void){unsigned n=random_calls++;if(event_input[21]){if(n<2)return (int)event_input[52+n];n-=2;}if(n>=3)fail("random overflow");return (int)event_input[170+n];}
int __attribute__((thiscall)) supplied_input(void*self,int code,int unused){
 (void)self;if(code!=8||unused!=0)fail("unexpected input query");input_calls++;return (int)event_input[23];
}
static void patch(uint32_t address,void*target){unsigned char*p=(void*)(uintptr_t)address;p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)(uintptr_t)target-address-5;}
unsigned char source_node[0x114],target_node[0x114],rider[0x500],bounds[0x34];float envelope[4];
unsigned char child_nodes[2][0x114],child_records[3][0x30],child_components[2*0x40];
unsigned char trick_proxy[0x40],trick_records[32][0x6c];
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);
 patch(0x200bf190,supplied_random);patch(0x20054f70,supplied_input);
 ((void (__cdecl *)(void))0x2009d650)();((void (__cdecl *)(void))0x20001720)();
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  if(fread(event_input,sizeof event_input,1,in)!=1)fail("input");
  float*v=event_input;memset(bike,0,sizeof bike);memset(other_bike,0,sizeof other_bike);random_calls=input_calls=0;
  memcpy(bike+0x4f8,v,12);memcpy(bike+0xbc0,v+3,12);memcpy(bike+0x510,v+6,12);memcpy(bike+0x534,v+9,12);memcpy(bike+0x4cc,v+12,12);memcpy(other_bike+0x510,v+15,12);
  memcpy(bike+0x6a4,v+18,4);
  memcpy(bike+0x564,v+19,4);
  memcpy(bike+0x590,v+30,4);
  memcpy(bike+0x594,v+31,4);
  memcpy(bike+0x4f0,v+38,4);
  memcpy(bike+0x4d8,v+39,4);
  memcpy(bike+0x86c,v+41,4);
  memcpy(bike+0x8cc,v+42,4);
  memcpy(bike+0x868,v+43,4);
  memcpy(bike+0x864,v+44,4);
  memcpy(bike+0x55c,v+45,4);
  put32(0xc40,(int32_t)v[21]);
  put32(0x710,(int32_t)v[24]);
  put32(0x714,(int32_t)v[25]);
  put32(0x4bc,(int32_t)v[28]);
  put32(0x844,(int32_t)v[29]);
  put32(0x8ac,(int32_t)v[32]);
  put32(0x8b8,(int32_t)v[33]);
  put32(0x8b4,(int32_t)v[34]);
  put32(0x8bc,(int32_t)v[36]);
  put32(0x820,(int32_t)v[37]);
  memcpy(other_bike+0x6a4,v+20,4);put32(0x6e4,v[22]?(uintptr_t)bike:0);bike[0x814]=(uint8_t)v[26];event_frame=(int)v[27];put32(0x14,(uintptr_t)&event_frame);
  put32(0x8b0,v[35]?(uintptr_t)other_bike:0);put32(0x8f4,(uintptr_t)event_terrain);*(int*)(event_terrain+0x954)=(int)v[40];
  memset(source_node,0,sizeof source_node);memset(target_node,0,sizeof target_node);memset(bounds,0,sizeof bounds);memset(rider,0,sizeof rider);
  memcpy(source_node+0x84,v+54,64);memcpy(source_node+0xc4,v+70,64);memcpy(target_node+0x84,v+86,64);memcpy(target_node+0xc4,v+102,64);
  *(uint32_t*)(source_node+0x104)=(uint32_t)v[119];*(uint32_t*)(target_node+0x104)=(uint32_t)v[120];
  if(v[118]){*(void**)(source_node+0x108)=target_node;*(void**)(target_node+0x10c)=source_node;}
  void*component=source_node;put32(0x8d8,(uintptr_t)&component);put32(0x434,(uintptr_t)target_node);put32(0x874,(uintptr_t)rider);put32(0x904,(uintptr_t)envelope);put32(0x23c,(uintptr_t)bounds);
  memcpy(bike+0x4c0,v+121,12);memcpy(bike+0x4e0,v+124,4);memcpy(envelope,v+125,16);memcpy(bike+0x898,v+129,12);put32(0x8a4,(int)v[132]);memcpy(bike+0x890,v+133,4);put32(0x884,(int)v[134]);put32(0x878,(int)v[135]);put32(0x880,(int)v[136]);
  memcpy(bounds+0x1c,v+137,12);memcpy(bounds+0x28,v+140,12);memcpy(bike+0x218,v+143,12);memcpy(bike+0x224,v+146,12);memcpy(bike+0x540,v+149,12);memcpy(bike+0x54c,v+152,12);
  memcpy(rider+0x70,v+155,12);memcpy(rider+0x7c,v+158,12);memcpy(rider+0x58,v+161,12);for(int j=0;j<3;j++)*(int*)(rider+0x160+j*4)=(int)v[164+j];*(int*)(rider+0x13c)=(int)v[167];*(int*)(rider+0x16c)=(int)v[168];*(int*)(rider+0x170)=(int)v[169];
  for(int k=0;k<8;k++)for(int g=0;g<3;g++)for(int j=0;j<6;j++)*(int*)(rider+0x174+k*0x5c+g*0x18+j*4)=(int)v[173+k*18+g*6+j];
  memset(child_nodes,0,sizeof child_nodes);memset(child_records,0,sizeof child_records);memset(child_components,0,sizeof child_components);
  put32(0,0x200d9a94);put32(0x234,(uintptr_t)child_components);
  for(int k=0;k<2;k++){
   float*n=v+318+k*34;unsigned char*node=child_nodes[k];memcpy(node+0x84,n,64);memcpy(node+0xc4,n+16,64);*(uint32_t*)(node+0x104)=(uint32_t)n[32];
   unsigned char*parent=n[33]<0?target_node:child_nodes[(int)n[33]];
   *(void**)(node+0x108)=parent;*(void**)(node+0x110)=*(void**)(parent+0x10c);*(void**)(parent+0x10c)=node;*(void**)(child_components+k*0x40+0x34)=node;
  }
  for(int k=0;k<3;k++){
   float*q=v+387+k*11;unsigned char*r=child_records[k];r[0]=(uint8_t)q[0];*(int*)(r+4)=(int)q[1];memcpy(r+8,q+2,36);
   if(k+1<(int)v[386])*(void**)(r+0x2c)=child_records[k+1];
  }
  if(v[386])*(void**)(bounds+0xc)=child_records[0];
  memset(trick_proxy,0,sizeof trick_proxy);memset(trick_records,0,sizeof trick_records);put32(0xc8c,(uintptr_t)trick_proxy);memcpy(bike+0x818,v+421,4);put32(0xb4c,(int)v[422]);
  const unsigned anim_offsets[]={4,0x10,0x14,0x30,0x2c};for(int j=0;j<5;j++){put32(anim_offsets[j],(int)v[423+j]);*(int*)(trick_proxy+anim_offsets[j])=(int)v[428+j];}
  for(int k=0;k<16;k++){*(int*)(trick_records[k]+0x68)=(int)v[433+k];*(int*)(trick_records[16+k]+0x68)=(int)v[449+k];put32(0x7d4+k*4,(uintptr_t)trick_records[k]);put32(0x794+k*4,(uintptr_t)trick_records[16+k]);}
  typedef void (__attribute__((thiscall)) *StartTrick)(void*,int);
  ((StartTrick)0x200a1970)(bike,(int)v[420]);event_output[0]=get32(0x844);
  event_output[1]=get32(0x8b8);event_output[2]=get32(0x8b4);event_output[3]=get32(0x8b0)!=0;event_output[4]=get32(0x710);event_output[5]=get32(0x714);
  memcpy(event_output+6,bike+0x510,12);memcpy(event_output+9,bike+0x534,12);event_output[12]=random_calls;event_output[13]=input_calls;
  event_output[14]=get32(0x844);event_output[15]=get32(0x820);event_output[16]=bike[0x814];memcpy(event_output+17,envelope,16);memcpy(event_output+21,bike+0x898,12);event_output[24]=get32(0x8a4);memcpy(event_output+25,bike+0x890,4);event_output[26]=get32(0x884);
  memcpy(event_output+27,bike+0x218,12);memcpy(event_output+30,bike+0x224,12);memcpy(event_output+33,bike+0x540,12);memcpy(event_output+36,bike+0x54c,12);
  memcpy(event_output+39,target_node+0x84,64);memcpy(event_output+55,target_node+0xc4,64);memcpy(event_output+71,source_node+0xc4,64);memcpy(event_output+87,source_node+0x104,4);memcpy(event_output+88,target_node+0x104,4);
  memcpy(event_output+89,rider+0x70,12);memcpy(event_output+92,rider+0x7c,12);memcpy(event_output+95,rider+0x58,12);memcpy(event_output+98,rider+0x160,12);memcpy(event_output+101,rider+0x13c,4);memcpy(event_output+102,rider+0x16c,4);memcpy(event_output+103,rider+0x170,4);
  for(int k=0;k<2;k++){memcpy(event_output+104+k*33,child_nodes[k]+0x84,64);memcpy(event_output+120+k*33,child_nodes[k]+0xc4,64);memcpy(event_output+136+k*33,child_nodes[k]+0x104,4);}
  for(int k=0;k<3;k++)memcpy(event_output+170+k*9,child_records[k]+8,36);
  memcpy(event_output+197,bike+0x818,4);event_output[198]=get32(0xb4c);
  for(int j=0;j<5;j++){event_output[199+j]=get32(anim_offsets[j]);memcpy(event_output+204+j,trick_proxy+anim_offsets[j],4);}
  event_output[200]=((uintptr_t)get32(0x10)-(uintptr_t)trick_records[0])/0x6c+1;event_output[205]=(*(uintptr_t*)(trick_proxy+0x10)-(uintptr_t)trick_records[16])/0x6c+1;
  if(fwrite(event_output,sizeof event_output,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
