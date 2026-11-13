#define main unused_helper_main
#include "oracle.c"
#undef main
#include "oracle-imports.h"
float event_input[318];uint32_t event_output[104],random_calls,input_calls;
unsigned char event_other_bike[0xcc8],event_terrain[0x958];int event_frame;
int __cdecl supplied_random(void){unsigned n=random_calls++;if(event_input[21]){if(n<2)return (int)event_input[52+n];n-=2;}if(n>=3)fail("random overflow");return (int)event_input[170+n];}
int __attribute__((thiscall)) supplied_input(void*self,int code,int unused){
 (void)self;if(code!=8||unused!=0)fail("unexpected input query");input_calls++;return (int)event_input[23];
}
static void patch(uint32_t address,void*target){unsigned char*p=(void*)(uintptr_t)address;p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)(uintptr_t)target-address-5;}
unsigned char source_node[0x114],event_rider[0x500],bounds[0x34];float envelope[4];
unsigned char other_bike[0xcc8],other_object[0x110],other_interface[0x160],other_proxy[0xcc8],other_rider[0x144];
unsigned char nodes[4][0x114],proxy[0xcc8],owner[0x40],audio[0x40],audio_world[0x200];
unsigned char object[0x110],manager[0x3988],cells[17][0x18],markers[17][0x18],entries[4][0x18];
unsigned char second_entries[4][0x18],disabled_object[0x110];
uint32_t token(void*p){if(!p)return 0;for(int i=0;i<17;i++){if(p==cells[i])return 1000+i;if(p==markers[i])return 2000+i;}for(int i=0;i<4;i++){if(p==entries[i])return i+1;if(p==second_entries[i])return i+101;}fail("pointer");return 0;}

unsigned char step_context[0x74],tail_settings[0x1074],front_component[0x60],rear_component[0x60];float step_input[19];uint32_t step_remaining,finish_output[16];
void run_collision_step(void);void collision_step_exit(void);
void setup_collision_step(unsigned char*s){
 *(int*)(s+0x20)=(int)step_input[3];memcpy(s+0x10,step_input+6,4);memcpy(s+0x48,step_input+7,4);*(int*)(s+0x34)=(int)step_input[8];
 put32(0xbfc,(int)step_input[9]);put32(0x870,(int)step_input[10]);memcpy(bike+0x718,step_input+11,4);memcpy(bike+0x818,step_input+12,4);memcpy(bike+0xc7c,step_input+13,4);
 *(short*)(tail_settings+0x1072)=(short)step_input[14];*(void**)0x200e4fb4=tail_settings;
 memcpy(bike+0x590,step_input+15,4);memcpy(bike+0x594,step_input+16,4);put32(0x8e4,(uintptr_t)front_component);put32(0x8e8,(uintptr_t)rear_component);
 memcpy(front_component+0x58,step_input+17,4);memcpy(rear_component+0x5c,step_input+18,4);
}
void copy_collision_step(unsigned char*s){
 step_remaining=*(int*)(s+0x20);
 memcpy(finish_output,s+0x20,4);finish_output[1]=get32(0x8c8);memcpy(finish_output+2,s+0x10,4);memcpy(finish_output+3,s+0x48,4);
 memcpy(finish_output+4,bike+0x4c0,24);finish_output[10]=get32(0x4e0);finish_output[11]=get32(0x4dc);finish_output[12]=get32(0x4d8);memcpy(finish_output+13,bike+0x4e4,12);
}
__asm__(".text\n_run_collision_step:\n push %ebp\n push %ebx\n push %esi\n push %edi\n sub $0xc00,%esp\n mov %esp,%eax\n push %eax\n call _setup_collision_step\n add $4,%esp\n mov $_bike,%esi\n mov $0x200ac6cd,%eax\n jmp *%eax\n_collision_step_exit:\n add $0x30,%esp\n mov %esp,%eax\n push %eax\n call _copy_collision_step\n add $4,%esp\n add $0xc00,%esp\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n");

#define target_node nodes[0]
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);patch(0x200ac94b,collision_step_exit);bind_oracle_kernel_imports();
 if(!((int (__cdecl *)(void))0x200c5230)())fail("CRT heap");
 if(!((int (__cdecl *)(void))0x200c24e0)())fail("CRT thread");
 ((void (__cdecl *)(void))0x20001640)();
 patch(0x200bf190,supplied_random);patch(0x20054f70,supplied_input);
 ((void (__cdecl *)(void))0x2009d650)();((void (__cdecl *)(void))0x20001720)();
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  if(fread(event_input,sizeof event_input,1,in)!=1)fail("input");
  float*v=event_input;memset(bike,0,sizeof bike);memset(event_other_bike,0,sizeof event_other_bike);random_calls=input_calls=0;
  memcpy(bike+0x4f8,v,12);memcpy(bike+0xbc0,v+3,12);memcpy(bike+0x510,v+6,12);memcpy(bike+0x534,v+9,12);memcpy(bike+0x4cc,v+12,12);memcpy(event_other_bike+0x510,v+15,12);
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
  memcpy(event_other_bike+0x6a4,v+20,4);put32(0x6e4,v[22]?(uintptr_t)bike:0);bike[0x814]=(uint8_t)v[26];event_frame=(int)v[27];put32(0x14,(uintptr_t)&event_frame);
  put32(0x8b0,v[35]?(uintptr_t)event_other_bike:0);put32(0x8f4,(uintptr_t)event_terrain);*(int*)(event_terrain+0x954)=(int)v[40];
  memset(source_node,0,sizeof source_node);memset(target_node,0,sizeof target_node);memset(bounds,0,sizeof bounds);memset(event_rider,0,sizeof event_rider);
  memcpy(source_node+0x84,v+54,64);memcpy(source_node+0xc4,v+70,64);memcpy(target_node+0x84,v+86,64);memcpy(target_node+0xc4,v+102,64);
  *(uint32_t*)(source_node+0x104)=(uint32_t)v[119];*(uint32_t*)(target_node+0x104)=(uint32_t)v[120];
  if(v[118]){*(void**)(source_node+0x108)=target_node;*(void**)(target_node+0x10c)=source_node;}
  void*component=source_node;put32(0x8d8,(uintptr_t)&component);put32(0x434,(uintptr_t)target_node);put32(0x874,(uintptr_t)event_rider);put32(0x904,(uintptr_t)envelope);put32(0x23c,(uintptr_t)bounds);
  memcpy(bike+0x4c0,v+121,12);memcpy(bike+0x4e0,v+124,4);memcpy(envelope,v+125,16);memcpy(bike+0x898,v+129,12);put32(0x8a4,(int)v[132]);memcpy(bike+0x890,v+133,4);put32(0x884,(int)v[134]);put32(0x878,(int)v[135]);put32(0x880,(int)v[136]);
  memcpy(bounds+0x1c,v+137,12);memcpy(bounds+0x28,v+140,12);memcpy(bike+0x218,v+143,12);memcpy(bike+0x224,v+146,12);memcpy(bike+0x540,v+149,12);memcpy(bike+0x54c,v+152,12);
  memcpy(event_rider+0x70,v+155,12);memcpy(event_rider+0x7c,v+158,12);memcpy(event_rider+0x58,v+161,12);for(int j=0;j<3;j++)*(int*)(event_rider+0x160+j*4)=(int)v[164+j];*(int*)(event_rider+0x13c)=(int)v[167];*(int*)(event_rider+0x16c)=(int)v[168];*(int*)(event_rider+0x170)=(int)v[169];
  for(int k=0;k<8;k++)for(int g=0;g<3;g++)for(int j=0;j<6;j++)*(int*)(event_rider+0x174+k*0x5c+g*0x18+j*4)=(int)v[173+k*18+g*6+j];
  float cv[248];uint32_t r[392];if(fread(cv,sizeof cv,1,in)!=1)fail("input");
  memset(nodes,0,sizeof nodes);memset(proxy,0,sizeof proxy);memset(owner,0,sizeof owner);memset(audio,0,sizeof audio);memset(audio_world,0,sizeof audio_world);memset(object,0,sizeof object);memset(manager,0,sizeof manager);memset(cells,0,sizeof cells);memset(markers,0,sizeof markers);memset(entries,0,sizeof entries);
  for(int k=0;k<2;k++){memcpy(nodes[k]+0x84,cv+k*33,64);memcpy(nodes[k]+0xc4,cv+k*33+16,64);*(int*)(nodes[k]+0x104)=(int)cv[k*33+32];}
  if(event_input[118]){*(void**)(source_node+0x108)=target_node;*(void**)(target_node+0x10c)=source_node;}
  *(void**)(bike+0x434)=nodes[0];*(void**)(bike+0xc88)=object;*(void**)(bike+0xc8c)=proxy;*(void**)(proxy+0x434)=nodes[1];
  *(void**)(bike+0x41c)=owner;*(void**)(owner+0x3c)=audio;*(void**)(audio+0x3c)=audio_world;
  *(int*)(bike+0x844)=(int)cv[66];*(int*)(bike+0x618)=(int)cv[67];*(int*)(bike+0x8a8)=(int)cv[68];memcpy(bike+0x564,cv+69,4);
  int offsets[]={0x4f8,0x510,0x534,0x528,0x540,0x654};for(int k=0;k<6;k++)memcpy(bike+offsets[k],cv+70+k*3,12);
  memcpy(bike+0x6a4,cv+88,4);memcpy(bike+0x5e0,cv+89,4);memcpy(bike+0x55c,cv+90,4);memcpy(bike+0x5f0,cv+91,12);memcpy(bike+0x5fc,cv+94,12);
  memcpy(object+0xcc,cv+97,36);memcpy(object+0x70,cv+106,12);memcpy(object+0x5c,cv+109,4);memcpy(object+0x7c,cv+110,12);memcpy(object+0x1c,cv+113,64);
  *(int*)object=123;*(int*)(object+0xf4)=1;*(void**)(object+0x98)=manager;*(void**)(object+0x8c)=entries;*(int*)(object+0x90)=4;
  *(int*)(manager+0x3940)=4;*(float*)(manager+0x3944)=10;*(void**)(manager+0x3948)=cells;*(int*)0x200e3754=(int)cv[129];
  for(int k=0;k<17;k++){*(void**)(cells[k]+4)=markers[k];*(void**)markers[k]=cells[k];}
  for(int k=0;k<4;k++){unsigned char*e=entries[k];*(int*)(e+8)=123;*(int*)(e+12)=(int)cv[130+k];*(int*)(e+16)=77+k;*(int*)(e+20)=(int)cv[134+k];if(cv[134+k]){unsigned char*tail=cells[(int)cv[130+k]];while(*(void**)(tail+4))tail=*(void**)(tail+4);*(void**)(tail+4)=e;*(void**)e=tail;}}
  memset(other_bike,0,sizeof other_bike);memset(other_object,0,sizeof other_object);memset(other_interface,0,sizeof other_interface);memset(other_proxy,0,sizeof other_proxy);memset(other_rider,0,sizeof other_rider);
  memcpy(bike+0x4e0,cv+138,4);
  memcpy(nodes[2]+0x84,cv+140,64);memcpy(nodes[2]+0xc4,cv+156,64);*(int*)(nodes[2]+0x104)=(int)cv[172];
  memcpy(nodes[3]+0x84,cv+198,64);memcpy(nodes[3]+0xc4,cv+214,64);*(int*)(nodes[3]+0x104)=(int)cv[230];
  *(int*)(other_bike+0x844)=(int)cv[173];memcpy(other_bike+0x55c,cv+174,4);memcpy(other_bike+0x678,cv+175,4);memcpy(other_bike+0x67c,cv+176,4);
  memcpy(other_bike+0x5f0,cv+177,12);memcpy(other_bike+0x5fc,cv+180,12);memcpy(other_bike+0x608,cv+183,12);
  memcpy(other_bike+0x4f8,cv+186,12);memcpy(other_bike+0x510,cv+189,12);memcpy(other_bike+0x528,cv+192,12);memcpy(other_bike+0x534,cv+195,12);
  memcpy(other_rider+0x40,cv+231,12);memcpy(other_rider+0x58,cv+234,12);memcpy(other_rider+0x64,cv+237,12);memcpy(other_rider+0x70,cv+240,12);memcpy(other_rider+0x7c,cv+243,12);*(int*)(other_rider+0x13c)=(int)cv[246];*(int*)(other_rider+0x140)=(int)cv[247];
  *(void**)(other_bike+0x434)=nodes[2];*(void**)(other_bike+0xc8c)=other_proxy;*(void**)(other_proxy+0x434)=nodes[3];*(void**)(other_bike+0x874)=other_rider;
  *(void**)(object+0x88)=other_object;*(void**)(other_object+0x94)=cv[139]?other_interface:other_bike;*(void**)(other_interface+0x15c)=other_bike;
  memcpy(bike+0x8d0,event_input+49,4);
  if(fread(step_input,sizeof step_input,1,in)!=1)fail("step input");
  *(int*)object=0;for(int k=0;k<4;k++)*(int*)(entries[k]+8)=0;
  for(int k=0;k<17;k++)*(int*)(markers[k]+8)=2;
  *(int*)(object+0xc8)=(int)step_input[1];*(void**)(object+0x94)=bike;*(void**)(object+0x108)=(void*)0x2009e490;
  *(float*)(object+0x60)=cv[109]*cv[109];for(int k=0;k<3;k++)*(float*)(object+0x64+k*4)=cv[109];
  memset(second_entries,0,sizeof second_entries);memset(disabled_object,0,sizeof disabled_object);
  *(int*)other_object=1;*(int*)(other_object+0xf4)=1;*(int*)(other_object+0x104)=0;*(int*)(other_object+0xc8)=1;
  *(void**)(other_object+0x94)=other_bike;*(void**)(other_object+0x10c)=(void*)0x2009e610;
  *(void**)(other_object+0x98)=manager;*(void**)(other_object+0x8c)=second_entries;*(int*)(other_object+0x90)=4;
  for(int k=0;k<4;k++)*(int*)(second_entries[k]+8)=1;
  *(float*)(other_object+0x5c)=cv[109];*(float*)(other_object+0x60)=cv[109]*cv[109];
  for(int k=0;k<3;k++)*(float*)(other_object+0x64+k*4)=cv[109];
  *(void**)(other_bike+0xc88)=other_object;*(void**)(other_bike+0x41c)=owner;
  *(float*)(other_bike+0x4d0)=1;*(float*)(other_bike+0x8cc)=1;
  memcpy(other_bike+0x4e0,cv+138,4);memcpy(other_bike+0x5e0,cv+89,4);memcpy(other_bike+0x6a4,cv+88,4);
  *(float*)(bike+0x678)=cv[90]*2;
  typedef void (__attribute__((thiscall))*GetWorld)(void*,void*,void*);
  ((GetWorld)0x200b7a20)(nodes[2],NULL,other_object+0x1c);
  typedef void (__attribute__((thiscall))*Grid)(void*);((Grid)0x2002a550)(other_object);

  *(void**)(manager+8)=object;*(void**)(manager+12)=other_object;*(void**)(manager+16)=disabled_object;
  for(int a=0;a<3;a++)for(int b=0;b<3;b++)*(int*)(manager+0xf8+(a*60+b)*4)=(int)step_input[5];
  for(int k=0;k<12;k++)*(float*)(manager+0x3950+k*4)=1000+k;
  *(void**)(step_context+0x4c)=manager;*(void**)(bike+0xc84)=step_context;
  *(int*)0x200e3758=(int)step_input[2];memcpy(bike+0x8c8,step_input+4,4);
  if(!step_input[0])*(void**)(bike+0xc88)=NULL;
  run_collision_step();
  event_output[0]=get32(0x844);
  event_output[1]=get32(0x8b8);event_output[2]=get32(0x8b4);event_output[3]=get32(0x8b0)!=0;event_output[4]=get32(0x710);event_output[5]=get32(0x714);
  memcpy(event_output+6,bike+0x510,12);memcpy(event_output+9,bike+0x534,12);event_output[12]=random_calls;event_output[13]=input_calls;
  event_output[14]=get32(0x844);event_output[15]=get32(0x820);event_output[16]=bike[0x814];memcpy(event_output+17,envelope,16);memcpy(event_output+21,bike+0x898,12);event_output[24]=get32(0x8a4);memcpy(event_output+25,bike+0x890,4);event_output[26]=get32(0x884);
  memcpy(event_output+27,bike+0x218,12);memcpy(event_output+30,bike+0x224,12);memcpy(event_output+33,bike+0x540,12);memcpy(event_output+36,bike+0x54c,12);
  memcpy(event_output+39,target_node+0x84,64);memcpy(event_output+55,target_node+0xc4,64);memcpy(event_output+71,source_node+0xc4,64);memcpy(event_output+87,source_node+0x104,4);memcpy(event_output+88,target_node+0x104,4);
  memcpy(event_output+89,event_rider+0x70,12);memcpy(event_output+92,event_rider+0x7c,12);memcpy(event_output+95,event_rider+0x58,12);memcpy(event_output+98,event_rider+0x160,12);memcpy(event_output+101,event_rider+0x13c,4);memcpy(event_output+102,event_rider+0x16c,4);memcpy(event_output+103,event_rider+0x170,4);
  for(int k=0;k<6;k++)memcpy(r+k*3,bike+offsets[k],12);
  memcpy(r+18,bike+0x6a4,4);
  for(int k=0;k<2;k++){memcpy(r+19+k*33,nodes[k]+0x84,64);memcpy(r+35+k*33,nodes[k]+0xc4,64);memcpy(r+51+k*33,nodes[k]+0x104,4);}
  memcpy(r+85,object+0x1c,64);memcpy(r+101,object+0x7c,12);
  for(int k=0;k<4;k++){unsigned char*e=entries[k];r[104+k*6]=token(*(void**)e);r[105+k*6]=token(*(void**)(e+4));memcpy(r+106+k*6,e+8,16);}
  for(int k=0;k<17;k++){r[128+k*3]=token(*(void**)(cells[k]+4));r[129+k*3]=token(*(void**)markers[k]);r[130+k*3]=token(*(void**)(markers[k]+4));}
  for(int k=0;k<2;k++){memcpy(r+179+k*33,nodes[k+2]+0x84,64);memcpy(r+195+k*33,nodes[k+2]+0xc4,64);memcpy(r+211+k*33,nodes[k+2]+0x104,4);}
  memcpy(r+245,other_bike+0x510,12);memcpy(r+248,other_bike+0x534,12);memcpy(r+251,other_rider+0x58,12);memcpy(r+254,other_rider+0x64,12);memcpy(r+257,other_rider+0x70,12);memcpy(r+260,other_rider+0x7c,12);
  r[263]=step_remaining;memcpy(r+264,bike+0x8c8,4);r[265]=get32(0x8a8);r[266]=*(void**)(object+0x88)==other_object;
  for(int k=0;k<4;k++)memcpy(r+267+k,manager+0xf8+((k/2)*60+k%2)*4,4);
  memcpy(r+271,manager+0x394c,52);memcpy(r+284,object+0xcc,36);memcpy(r+293,other_object+0xcc,36);
  r[302]=*(void**)(other_object+0x88)==object;
  r[303]=*(void**)(manager+0x3980)==object;r[304]=*(void**)(manager+0x3984)==other_object;
  for(int k=0;k<6;k++)memcpy(r+305+k*3,other_bike+offsets[k],12);
  memcpy(r+323,other_bike+0x6a4,4);r[324]=*(int*)(other_bike+0x8a8);
  memcpy(r+325,other_object+0x1c,64);memcpy(r+341,other_object+0x7c,12);
  for(int k=0;k<4;k++){unsigned char*e=second_entries[k];r[344+k*6]=token(*(void**)e);r[345+k*6]=token(*(void**)(e+4));memcpy(r+346+k*6,e+8,16);}
  r[368]=*(int*)(other_bike+0x844);
  memcpy(r+369,finish_output,sizeof finish_output);r[385]=get32(0x714);r[386]=get32(0x870);memcpy(r+387,bike+0x718,4);memcpy(r+388,bike+0xc7c,4);
  memcpy(r+389,front_component+0x58,4);memcpy(r+390,rear_component+0x5c,4);memcpy(r+391,bike+0x8d0,4);
  if(fwrite(r,sizeof r,1,out)!=1)fail("collision output");
  if(fwrite(event_output,sizeof event_output,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
