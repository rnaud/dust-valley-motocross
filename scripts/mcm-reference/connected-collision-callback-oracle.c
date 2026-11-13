#define main unused_helper_main
#include "oracle.c"
#undef main
unsigned char callback_game[0x800];
unsigned char other_bike[0xcc8],other_object[0x110],other_interface[0x160],other_proxy[0xcc8],rider[0x144];
unsigned char nodes[4][0x114],proxy[0xcc8],owner[0x40],audio[0x40],audio_world[0x200];
unsigned char object[0x110],manager[0x394c],cells[17][0x18],markers[17][0x18],entries[4][0x18];
uint32_t token(void*p){if(!p)return 0;for(int i=0;i<17;i++){if(p==cells[i])return 1000+i;if(p==markers[i])return 2000+i;}for(int i=0;i<4;i++)if(p==entries[i])return i+1;fail("pointer");return 0;}
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);((void (__cdecl *)(void))0x20001720)();
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  float v[251];uint32_t r[264];if(fread(v,sizeof v,1,in)!=1)fail("input");
  memset(nodes,0,sizeof nodes);memset(bike,0,sizeof bike);memset(proxy,0,sizeof proxy);memset(owner,0,sizeof owner);memset(audio,0,sizeof audio);memset(audio_world,0,sizeof audio_world);memset(object,0,sizeof object);memset(manager,0,sizeof manager);memset(cells,0,sizeof cells);memset(markers,0,sizeof markers);memset(entries,0,sizeof entries);
  for(int k=0;k<2;k++){memcpy(nodes[k]+0x84,v+k*33,64);memcpy(nodes[k]+0xc4,v+k*33+16,64);*(int*)(nodes[k]+0x104)=(int)v[k*33+32];}
  *(void**)(bike+0x434)=nodes[0];*(void**)(bike+0xc88)=object;*(void**)(bike+0xc8c)=proxy;*(void**)(proxy+0x434)=nodes[1];
  *(void**)(bike+0x41c)=owner;*(void**)(owner+0x3c)=audio;*(void**)(audio+0x3c)=audio_world;
  *(int*)(bike+0x844)=(int)v[66];*(int*)(bike+0x618)=(int)v[67];*(int*)(bike+0x8a8)=(int)v[68];memcpy(bike+0x564,v+69,4);
  int offsets[]={0x4f8,0x510,0x534,0x528,0x540,0x654};for(int k=0;k<6;k++)memcpy(bike+offsets[k],v+70+k*3,12);
  memcpy(bike+0x6a4,v+88,4);memcpy(bike+0x5e0,v+89,4);memcpy(bike+0x55c,v+90,4);memcpy(bike+0x5f0,v+91,12);memcpy(bike+0x5fc,v+94,12);
  memcpy(object+0xcc,v+97,36);memcpy(object+0x70,v+106,12);memcpy(object+0x5c,v+109,4);memcpy(object+0x7c,v+110,12);memcpy(object+0x1c,v+113,64);
  *(int*)object=123;*(int*)(object+0xf4)=1;*(void**)(object+0x98)=manager;*(void**)(object+0x8c)=entries;*(int*)(object+0x90)=4;
  *(int*)(manager+0x3940)=4;*(float*)(manager+0x3944)=10;*(void**)(manager+0x3948)=cells;*(int*)0x200e3754=(int)v[129];
  for(int k=0;k<17;k++){*(void**)(cells[k]+4)=markers[k];*(void**)markers[k]=cells[k];}
  for(int k=0;k<4;k++){unsigned char*e=entries[k];*(int*)(e+8)=123;*(int*)(e+12)=(int)v[130+k];*(int*)(e+16)=77+k;*(int*)(e+20)=(int)v[134+k];if(v[134+k]){unsigned char*tail=cells[(int)v[130+k]];while(*(void**)(tail+4))tail=*(void**)(tail+4);*(void**)(tail+4)=e;*(void**)e=tail;}}
  memset(other_bike,0,sizeof other_bike);memset(other_object,0,sizeof other_object);memset(other_interface,0,sizeof other_interface);memset(other_proxy,0,sizeof other_proxy);memset(rider,0,sizeof rider);
  memcpy(bike+0x4e0,v+138,4);
  memcpy(nodes[2]+0x84,v+140,64);memcpy(nodes[2]+0xc4,v+156,64);*(int*)(nodes[2]+0x104)=(int)v[172];
  memcpy(nodes[3]+0x84,v+198,64);memcpy(nodes[3]+0xc4,v+214,64);*(int*)(nodes[3]+0x104)=(int)v[230];
  *(int*)(other_bike+0x844)=(int)v[173];memcpy(other_bike+0x55c,v+174,4);memcpy(other_bike+0x678,v+175,4);memcpy(other_bike+0x67c,v+176,4);
  memcpy(other_bike+0x5f0,v+177,12);memcpy(other_bike+0x5fc,v+180,12);memcpy(other_bike+0x608,v+183,12);
  memcpy(other_bike+0x4f8,v+186,12);memcpy(other_bike+0x510,v+189,12);memcpy(other_bike+0x528,v+192,12);memcpy(other_bike+0x534,v+195,12);
  memcpy(rider+0x40,v+231,12);memcpy(rider+0x58,v+234,12);memcpy(rider+0x64,v+237,12);memcpy(rider+0x70,v+240,12);memcpy(rider+0x7c,v+243,12);*(int*)(rider+0x13c)=(int)v[246];*(int*)(rider+0x140)=(int)v[247];
  *(void**)(other_bike+0x434)=nodes[2];*(void**)(other_bike+0xc8c)=other_proxy;*(void**)(other_proxy+0x434)=nodes[3];*(void**)(other_bike+0x874)=rider;
  *(void**)(object+0x88)=other_object;*(void**)(other_object+0x94)=v[139]?other_interface:other_bike;*(void**)(other_interface+0x15c)=other_bike;
  *(void**)0x200e4fb4=callback_game;
  *(int*)(other_object+0x104)=(int)v[139];
  *(int*)(bike+0x8ac)=(int)v[249];*(int*)(other_bike+0x8ac)=(int)v[250];
  typedef void (__cdecl *Callback)(void*);((Callback)(v[248]?0x2009e610:0x2009e490))(bike);
  for(int k=0;k<6;k++)memcpy(r+k*3,bike+offsets[k],12);
  memcpy(r+18,bike+0x6a4,4);
  for(int k=0;k<2;k++){memcpy(r+19+k*33,nodes[k]+0x84,64);memcpy(r+35+k*33,nodes[k]+0xc4,64);memcpy(r+51+k*33,nodes[k]+0x104,4);}
  memcpy(r+85,object+0x1c,64);memcpy(r+101,object+0x7c,12);
  for(int k=0;k<4;k++){unsigned char*e=entries[k];r[104+k*6]=token(*(void**)e);r[105+k*6]=token(*(void**)(e+4));memcpy(r+106+k*6,e+8,16);}
  for(int k=0;k<17;k++){r[128+k*3]=token(*(void**)(cells[k]+4));r[129+k*3]=token(*(void**)markers[k]);r[130+k*3]=token(*(void**)(markers[k]+4));}
  for(int k=0;k<2;k++){memcpy(r+179+k*33,nodes[k+2]+0x84,64);memcpy(r+195+k*33,nodes[k+2]+0xc4,64);memcpy(r+211+k*33,nodes[k+2]+0x104,4);}
  memcpy(r+245,other_bike+0x510,12);memcpy(r+248,other_bike+0x534,12);memcpy(r+251,rider+0x58,12);memcpy(r+254,rider+0x64,12);memcpy(r+257,rider+0x70,12);memcpy(r+260,rider+0x7c,12);
  r[263]=*(int*)(bike+0x8a8);
  if(fwrite(r,sizeof r,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
