#define main unused_helper_main
#include "oracle.c"
#undef main
float event_input[502];uint32_t event_output[234],random_calls,input_calls;
unsigned char other_bike[0xcc8],event_terrain[0x958];int event_frame;
int __cdecl supplied_random(void){unsigned n=random_calls++;if(event_input[21]){if(n<2)return (int)event_input[52+n];n-=2;}if(n>=3)fail("random overflow");return (int)event_input[170+n];}
uint32_t queries[3];unsigned char input_controller[0x28],blend_component[0x4c],rider_tricks[32][0x6c];
int __attribute__((thiscall)) supplied_input(void*self,int code,int option,int extra){
 (void)self;if(option||extra||input_calls>=3)fail("unexpected input query");queries[input_calls++]=code;
 if(code==9)return (int)event_input[497];
 if(code==6)return (int)event_input[498];
 if(code==7)return (int)event_input[499];
 fail("action");return 0;
}
static void patch(uint32_t address,void*target){unsigned char*p=(void*)(uintptr_t)address;p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)(uintptr_t)target-address-5;}
unsigned char source_node[0x114],target_node[0x114],rider[0x500],bounds[0x34];float envelope[4];
unsigned char child_nodes[2][0x114],child_records[3][0x30],child_components[2*0x40];
unsigned char trick_proxy[0x440],trick_records[2][0x70],near_frames[2][8][0x34],near_settings[0x1080],near_game[0x40];
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);
 patch(0x20052670,supplied_input);((void (__cdecl *)(void))0x20001640)();
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
  memset(trick_proxy,0,sizeof trick_proxy);memset(trick_records,0,sizeof trick_records);memset(near_frames,0,sizeof near_frames);
  memset(near_settings,0,sizeof near_settings);memset(near_game,0,sizeof near_game);
  *(void**)0x200e4fb4=near_settings;*(int*)(near_settings+0x314)=1;*(short*)(near_settings+0x107a)=1;
  void*others[2]={v[35]?other_bike:NULL,NULL};*(void**)(near_game+0x30)=bike;*(void**)(near_game+0x38)=others;put32(0xc84,(uintptr_t)near_game);
  memcpy(other_bike+0x4f8,v+3,12);memcpy(bike+0x834,v+38,4);memcpy(bike+0x82c,v+44,4);memcpy(bike+0x830,v+43,4);put32(0x824,(int)v[36]);
  put32(0xc8c,(uintptr_t)trick_proxy);memcpy(bike+0x818,v+421,4);put32(0xb4c,(int)v[422]);
  const unsigned anim_offsets[]={4,0x10,0x14,0x30,0x2c};for(int j=0;j<5;j++){put32(anim_offsets[j],(int)v[423+j]);*(int*)(trick_proxy+anim_offsets[j])=(int)v[428+j];}
  *(uint32_t*)trick_proxy=0x200d7b14;*(void**)(trick_proxy+0x234)=child_components;*(void**)(trick_proxy+0x434)=target_node;
  for(int k=0;k<2;k++)*(int*)(child_components+k*0x40+0x38)=((int)v[420]>>k)&1;
  int frame_count=1+(int)v[420]%8;
  for(int k=0;k<2;k++){
   *(void**)(trick_records[k]+0x68)=near_frames[k][0];*(int*)(trick_records[k]+0x6c)=frame_count;
   for(int j=0;j<frame_count;j++){
    unsigned char*r=near_frames[k][j];*(int*)r=j;if(j+1<frame_count)*(void**)(r+0x18)=near_frames[k][j+1];
    if(j%3)*(void**)(r+0xc)=child_records[0];
    for(int t=0;t<6;t++)*(float*)(r+0x1c+t*4)=v[137+k*3+t%3]+j*(t+1);
   }
  }
  put32(0x790,(uintptr_t)trick_records[0]);put32(0x778,(uintptr_t)trick_records[1]);
  memset(rider_tricks,0,sizeof rider_tricks);
  for(int k=0;k<16;k++){*(int*)(rider_tricks[k]+0x68)=(int)v[433+k];*(int*)(rider_tricks[16+k]+0x68)=(int)v[449+k];put32(0x7d4+k*4,(uintptr_t)rider_tricks[k]);put32(0x794+k*4,(uintptr_t)rider_tricks[16+k]);}
  float*u=v+465;
  put32(0x820,(int)u[0]);memcpy(bike+0x6f4,u+1,4);memcpy(bike+0x730,u+2,4);memcpy(bike+0x708,u+3,4);memcpy(bike+0x704,u+4,4);memcpy(envelope,u+5,16);memcpy(bike+0x8cc,u+9,4);memcpy(blend_component+0x44,u+10,8);put32(0x8ec,(uintptr_t)blend_component);
  put32(0x4bc,(int)u[13]);memcpy(bike+0x71c,u+14,4);memcpy(bike+0x720,u+15,4);memcpy(bike+0x738,u+16,4);put32(0x724,(int)u[17]);memcpy(bike+0x728,u+18,4);put32(0x72c,(int)u[19]);memcpy(bike+0x734,u+20,4);
  put32(0x844,(int)u[23]);put32(0x710,(int)u[24]);put32(0xbfc,(int)u[25]);put32(0x614,(int)u[26]);put32(0x618,(int)u[27]);memcpy(bike+0x590,u+28,8);put32(0xc68,(int)u[30]);put32(0xb4c,(int)u[31]);memcpy(bike+0x6e8,u+35,8);
  memset(input_controller,0,sizeof input_controller);*(void**)(input_controller+0x24)=bike;put32(0x6e4,(uintptr_t)input_controller);memset(queries,0,sizeof queries);
  typedef void (__attribute__((thiscall))*Update)(void*,float,float,float);
  ((Update)0x200aecb0)(bike,u[21],u[22],u[12]);event_output[0]=get32(0x844);
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
  if(get32(0x10)==(uintptr_t)trick_records[0]){event_output[200]=1;event_output[201]=*(int*)(uintptr_t)get32(0x14)+1;}
  if(*(uintptr_t*)(trick_proxy+0x10)==(uintptr_t)trick_records[1]){event_output[205]=1;event_output[206]=**(int**)(trick_proxy+0x14)+1;}
  for(int k=0;k<16;k++){
   if(get32(0x10)==(uintptr_t)rider_tricks[k])event_output[200]=k+1;
   if(*(uintptr_t*)(trick_proxy+0x10)==(uintptr_t)rider_tricks[16+k])event_output[205]=k+1;
  }
  event_output[209]=get32(0x838)!=0;event_output[210]=get32(0x834);event_output[211]=get32(0x824);event_output[212]=get32(0x82c);event_output[213]=get32(0x830);memcpy(event_output+214,trick_proxy+0x218,24);
  memcpy(event_output+220,bike+0x730,4);memcpy(event_output+221,bike+0x708,4);memcpy(event_output+222,bike+0x704,4);memcpy(event_output+223,envelope,16);memcpy(event_output+227,bike+0x724,12);memcpy(event_output+230,bike+0x734,4);memcpy(event_output+231,queries,12);
  if(fwrite(event_output,sizeof event_output,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
