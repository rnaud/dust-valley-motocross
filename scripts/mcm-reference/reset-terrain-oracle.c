#define main unused_helper_main
#include "oracle.c"
#undef main
unsigned char parts[4][0x60],engine[0x1f0],effect[16];uint32_t random_value,random_calls;
int __cdecl draw_random(void){random_calls++;return random_value;}
unsigned char nodes[4][0x114],component[0x60];float pose[9];
unsigned char terrain_nodes[3][0x58],samples[289*16],terrain[0xa08];void*children[2][256];float points[10][3],heights[2];
void pose_exit(void);
__asm__(".text\n_pose_exit:\n pop %ebp\n pop %edi\n pop %esi\n pop %ebx\n add $0x44,%esp\n ret $0x3c\n");
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);unsigned char*p=(void*)0x200bf190;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)draw_random-0x200bf190-5;
 p=(void*)0x2009fcd0;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)pose_exit-0x2009fcd0-5;
 ((void (__cdecl *)(void))0x20001720)();((void (__cdecl *)(void))0x2009d650)();((void (__cdecl *)(void))0x2009d620)();
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  uint32_t v[1247],r[1208];if(fread(v,sizeof v,1,in)!=1)fail("input");
  memcpy(bike,v+2,sizeof bike);memcpy(parts,v+820,sizeof parts);memcpy(engine,v+916,sizeof engine);memcpy(effect,v+1040,16);random_value=v[1];random_calls=0;
  unsigned offsets[6]={0x8dc,0x8e0,0x8e4,0x8e8,0x8f0,0x904};void*ptrs[6]={parts[0],parts[1],parts[2],parts[3],engine,effect};
  for(int j=0;j<6;j++)put32(offsets[j],v[0]&(1u<<j)?(uintptr_t)ptrs[j]:0);
  float*extra=(float*)(v+1044);memset(nodes,0,sizeof nodes);memset(component,0,sizeof component);
  for(int j=0;j<4;j++){memcpy(nodes[j]+0x84,extra+j*33,128);*(int*)(nodes[j]+0x104)=(int)extra[j*33+32];}
  for(int j=0;j<4;j++){int parent=(int)extra[132+j];if(parent>=0){*(void**)(nodes[j]+0x108)=nodes[parent];*(void**)(nodes[j]+0x110)=*(void**)(nodes[parent]+0x10c);*(void**)(nodes[parent]+0x10c)=nodes[j];}}
  put32(0x434,(uintptr_t)nodes[(int)extra[136]]);put32(0x8ec,(uintptr_t)component);*(void**)(component+0x50)=nodes[(int)extra[137]];memcpy(pose,extra+138,36);memcpy(component+0x54,extra+147,12);memcpy(component+0x44,extra+150,4);
  float*t=(float*)(v+1195);int mode=(int)t[0];memset(terrain_nodes,0,sizeof terrain_nodes);memset(children,0,sizeof children);memset(terrain,0,sizeof terrain);memcpy(terrain_nodes[0]+0xc,t+2,8);*(void**)(terrain_nodes[0]+0x50)=samples;
  for(int j=0;j<289;j++){uint16_t h=(uint16_t)((int)t[1]+j*137);memcpy(samples+j*16+2,&h,2);memcpy(samples+j*16+4,t+6+3*((j%17%2)+2*(j/17%2)),12);}
  for(int j=1;j<3;j++){*(int*)(terrain_nodes[j]+0x20)=j;*(void**)(terrain_nodes[j]+0x54)=children[j-1];for(int k=0;k<256;k++)children[j-1][k]=terrain_nodes[j-1];}
  unsigned char*root=terrain_nodes[mode<3?mode:1];if(mode==3)*(void**)(root+0x54)=NULL;if(mode==4)memset(children[0],0,sizeof children[0]);
  *(void**)(terrain+0x44)=mode==5?NULL:root;memcpy(terrain+0xa04,t+4,4);memcpy(terrain+0x40,t+5,4);put32(0x8f4,(uintptr_t)terrain);
  *(void**)parts[0]=nodes[(int)t[18]];*(void**)parts[1]=nodes[(int)t[19]];memcpy(points,t+20,sizeof points);memcpy(heights,t+50,8);
  typedef void (__attribute__((thiscall))*Pose)(void*,void*,void*,void*,void*,void*,void*,void*,void*,void*,void*,void*,void*,void*,void*,void*);
  ((Pose)0x2009f8f0)(bike,pose,pose+3,pose+6,points[0],points[1],points[2],points[3],points[4],points[5],points[6],points[7],points[8],points[9],heights,heights+1);
  memcpy(parts[0],v+820,4);memcpy(parts[1],v+844,4);put32(0x8f4,v[2+0x8f4/4]);
  put32(0x434,v[2+0x434/4]);put32(0x8ec,v[2+0x8ec/4]);
  for(int j=0;j<6;j++)put32(offsets[j],v[2+offsets[j]/4]);
  memcpy(r,bike,sizeof bike);memcpy(r+818,parts,sizeof parts);memcpy(r+914,engine,sizeof engine);memcpy(r+1038,effect,16);r[1042]=random_calls;for(int j=0;j<4;j++){memcpy(r+1043+j*33,nodes[j]+0x84,128);memcpy(r+1043+j*33+32,nodes[j]+0x104,4);}memcpy(r+1175,component+0x44,4);memcpy(r+1176,points,sizeof points);memcpy(r+1206,heights,8);
  if(fwrite(r,sizeof r,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
