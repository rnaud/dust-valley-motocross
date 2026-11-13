#define main unused_helper_main
#include "oracle.c"
#undef main
#include "oracle-imports.h"
unsigned char terrain_nodes[3][0x58],samples[17*17*16],terrain[0xa08],node[0x114],component[0x60],front[0x50],rear[0x50];void*children[2][256];
float center_input[18];uint32_t center_output[16];
float balance_input[20],balance_filter[2];uint32_t balance_output[13];
float response_input[16];uint32_t response_output[16];
float chassis_input[33];uint32_t chassis_output[24];
unsigned char suspension[4];uint32_t geometry_output[9];
float step_values[10];uint32_t force_output[13];
float points[10][3],heights[2],frame_local[6],normal_seed[18],rear_normal[3],probe_samples[12],refined[12];
void frame_exit(void);void copy_frame(unsigned char*s){memcpy(frame_local,s+0x80,12);memcpy(frame_local+3,s+0x8c,12);memcpy(rear_normal,s+0xa4,12);memcpy(probe_samples,s+0x5c,12);memcpy(probe_samples+3,s+0x68,12);memcpy(probe_samples+6,s+0x44,24);memcpy(refined,s+0x74,12);memcpy(refined+3,s+0x98,12);memcpy(refined+6,s+0xb0,24);}
__asm__(".text\n_frame_exit:\n mov %esp,%eax\n push %eax\n call _copy_frame\n add $4,%esp\n pop %ebp\n pop %edi\n pop %esi\n pop %ebx\n add $0xb8,%esp\n ret $0x34\n");
/* Seed the third normal destination at routine entry without replacing any
 * terrain call. Its initial contents matter only when terrain is absent. */
void frame_entry(void);
__asm__(".text\n_frame_entry:\n sub $0xb8,%esp\n push %eax\n mov _normal_seed,%eax\n mov %eax,0x74(%esp)\n mov _normal_seed+4,%eax\n mov %eax,0x78(%esp)\n mov _normal_seed+8,%eax\n mov %eax,0x7c(%esp)\n mov _normal_seed+12,%eax\n mov %eax,0x98(%esp)\n mov _normal_seed+16,%eax\n mov %eax,0x9c(%esp)\n mov _normal_seed+20,%eax\n mov %eax,0xa0(%esp)\n mov _normal_seed+24,%eax\n mov %eax,0x38(%esp)\n mov _normal_seed+28,%eax\n mov %eax,0x3c(%esp)\n mov _normal_seed+32,%eax\n mov %eax,0x40(%esp)\n mov _normal_seed+36,%eax\n mov %eax,0x44(%esp)\n mov _normal_seed+40,%eax\n mov %eax,0x48(%esp)\n mov _normal_seed+44,%eax\n mov %eax,0x4c(%esp)\n mov _normal_seed+48,%eax\n mov %eax,0x68(%esp)\n mov _normal_seed+52,%eax\n mov %eax,0x6c(%esp)\n mov _normal_seed+56,%eax\n mov %eax,0x70(%esp)\n mov _normal_seed+60,%eax\n mov %eax,0x8c(%esp)\n mov _normal_seed+64,%eax\n mov %eax,0x90(%esp)\n mov _normal_seed+68,%eax\n mov %eax,0x94(%esp)\n pop %eax\n push $0x200a0136\n ret\n");
void patch(uint32_t address,void*target){unsigned char*p=(void*)(uintptr_t)address;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)target-address-5;}
unsigned char extra_nodes[3][0x114];
static const unsigned point_offsets[10]={0x504,0x510,0x324,0x348,0x300,0x2e8,0x2dc,0x30c,0x7ec,0x4f8};
void seed_phase(unsigned char*s){memcpy(s+900,center_input+5,4);memcpy(s+904,center_input+6,4);memcpy(s+908,center_input+7,4);memcpy(s+600,center_input+8,4);memcpy(s+2064,center_input+9,4);memcpy(s+2068,center_input+10,4);memcpy(s+2072,center_input+11,4);memcpy(s+2052,center_input+12,4);memcpy(s+2056,center_input+13,4);memcpy(s+2060,center_input+14,4);memcpy(s+2040,center_input+15,4);memcpy(s+2044,center_input+16,4);memcpy(s+2048,center_input+17,4);memcpy(s+604,balance_input+16,4);memcpy(s+440,balance_input+17,4);memcpy(s+436,balance_input+18,4);memcpy(s+112,balance_input+19,4);memcpy(s+612,response_input+12,4);memcpy(s+608,response_input+13,4);memcpy(s+448,response_input+14,4);memcpy(s+444,response_input+15,4);*(int*)(s+32)=(int)chassis_input[0];*(int*)(s+28)=(int)chassis_input[1];*(int*)(s+48)=(int)chassis_input[2];*(int*)(s+44)=(int)chassis_input[3];memcpy(s+876,chassis_input+13,4);memcpy(s+880,chassis_input+14,4);memcpy(s+884,chassis_input+15,4);memcpy(s+996,chassis_input+16,4);memcpy(s+1000,chassis_input+17,4);memcpy(s+1004,chassis_input+18,4);memcpy(s+672,chassis_input+19,4);memcpy(s+676,chassis_input+20,4);memcpy(s+680,chassis_input+21,4);memcpy(s+708,chassis_input+22,4);memcpy(s+712,chassis_input+23,4);memcpy(s+716,chassis_input+24,4);memcpy(s+1200,chassis_input+25,4);memcpy(s+1204,chassis_input+26,4);memcpy(s+1208,chassis_input+27,4);memcpy(s+1752,chassis_input+28,4);memcpy(s+1756,chassis_input+29,4);memcpy(s+1760,chassis_input+30,4);memcpy(s+188,chassis_input+31,4);memcpy(s+404,chassis_input+32,4);memcpy(s+0x10,step_values,4);memcpy(s+0x28,step_values+1,4);for(int j=0;j<10;j++)memcpy(s+point_offsets[j],points[j],12);}
void copy_phase(unsigned char*s){memcpy(center_output,bike+0x504,12);memcpy(center_output+3,s+900,4);memcpy(center_output+4,s+904,4);memcpy(center_output+5,s+908,4);memcpy(center_output+6,s+600,4);memcpy(center_output+7,s+2064,4);memcpy(center_output+8,s+2068,4);memcpy(center_output+9,s+2072,4);memcpy(center_output+10,s+2052,4);memcpy(center_output+11,s+2056,4);memcpy(center_output+12,s+2060,4);memcpy(center_output+13,s+2040,4);memcpy(center_output+14,s+2044,4);memcpy(center_output+15,s+2048,4);memcpy(balance_output,bike+0x6b8,24);memcpy(balance_output+6,balance_filter,4);memcpy(balance_output+7,s+604,4);memcpy(balance_output+8,s+440,4);memcpy(balance_output+9,s+436,4);memcpy(balance_output+10,s+112,4);memcpy(balance_output+11,bike+0x5a8,8);memcpy(response_output+0,bike+0x4bc,4);memcpy(response_output+1,bike+0x870,4);memcpy(response_output+2,bike+0x718,4);memcpy(response_output+3,bike+0x8c4,4);memcpy(response_output+4,bike+0xb4c,4);memcpy(response_output+5,bike+0xc6c,4);memcpy(response_output+6,bike+0x714,4);memcpy(response_output+7,bike+0xc78,4);memcpy(response_output+8,bike+0xc70,4);memcpy(response_output+9,bike+0xc74,4);memcpy(response_output+10,bike+0x53c,4);memcpy(response_output+11,s+0x28,4);memcpy(response_output+12,s+612,4);memcpy(response_output+13,s+608,4);memcpy(response_output+14,s+448,4);memcpy(response_output+15,s+444,4);memcpy(chassis_output+0,s+32,4);memcpy(chassis_output+1,s+28,4);memcpy(chassis_output+2,s+48,4);memcpy(chassis_output+3,s+44,4);memcpy(chassis_output+4,s+876,4);memcpy(chassis_output+5,s+880,4);memcpy(chassis_output+6,s+884,4);memcpy(chassis_output+7,s+996,4);memcpy(chassis_output+8,s+1000,4);memcpy(chassis_output+9,s+1004,4);memcpy(chassis_output+10,s+672,4);memcpy(chassis_output+11,s+676,4);memcpy(chassis_output+12,s+680,4);memcpy(chassis_output+13,s+708,4);memcpy(chassis_output+14,s+712,4);memcpy(chassis_output+15,s+716,4);memcpy(chassis_output+16,s+1200,4);memcpy(chassis_output+17,s+1204,4);memcpy(chassis_output+18,s+1208,4);memcpy(chassis_output+19,s+1752,4);memcpy(chassis_output+20,s+1756,4);memcpy(chassis_output+21,s+1760,4);memcpy(chassis_output+22,s+188,4);memcpy(chassis_output+23,s+404,4);memcpy(geometry_output,s+0x858,12);memcpy(geometry_output+3,s+0x870,12);memcpy(geometry_output+6,s+0x864,12);memcpy(force_output,s+0x14,4);memcpy(force_output+1,s+0x18,4);memcpy(force_output+2,s+0x34,4);memcpy(force_output+3,s+0x24,4);memcpy(force_output+4,bike+0x894,4);memcpy(force_output+5,s+0x100,4);memcpy(force_output+6,s+0x294,12);memcpy(force_output+9,s+0x4c,4);memcpy(force_output+10,s+0x45c,12);for(int j=0;j<10;j++)memcpy(points[j],s+point_offsets[j],12);memcpy(heights,bike+0x590,8);}
void phase(void);void phase_exit(void);
__asm__(".text\n_phase:\n push %ebx\n push %esi\n push %edi\n push %ebp\n sub $0xc00,%esp\n mov %esp,%eax\n push %eax\n call _seed_phase\n add $4,%esp\n mov $_bike,%esi\n lea 0x54c(%esi),%edi\n push $0x200a63d2\n ret\n_phase_exit:\n mov %esp,%eax\n push %eax\n call _copy_phase\n add $4,%esp\n add $0xc00,%esp\n pop %ebp\n pop %edi\n pop %esi\n pop %ebx\n ret\n");
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);bind_oracle_kernel_imports();if(!((int (__cdecl *)(void))0x200c5230)())fail("CRT heap");if(!((int (__cdecl *)(void))0x200c24e0)())fail("CRT thread");HMODULE d3drm=LoadLibraryA("d3drm.dll");if(!d3drm)fail("d3drm load");char module_path[MAX_PATH],copy_path[MAX_PATH];if(!GetModuleFileNameA(d3drm,module_path,sizeof module_path))fail("d3drm path");if(snprintf(copy_path,sizeof copy_path,"%s.d3drm.dll",argv[3])>=(int)sizeof copy_path||!CopyFileA(module_path,copy_path,TRUE))fail("copy loaded d3drm");FARPROC rotate=GetProcAddress(d3drm,"D3DRMVectorRotate");if(!rotate)fail("vector rotate");*(FARPROC*)0x201278b8=rotate;patch(0x200a0130,frame_entry);patch(0x200a13b0,frame_exit);patch(0x200a7221,phase_exit);
 ((void (__cdecl *)(void))0x20001720)();((void (__cdecl *)(void))0x2009d650)();((void (__cdecl *)(void))0x2009d680)();
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  float v[326];uint32_t r[307];if(fread(v,sizeof v,1,in)!=1)fail("input");
  memset(bike,0,sizeof bike);memset(terrain_nodes,0,sizeof terrain_nodes);memset(children,0,sizeof children);memset(terrain,0,sizeof terrain);memset(node,0,sizeof node);memset(component,0,sizeof component);memset(front,0,sizeof front);
  int mode=(int)v[0];memcpy(terrain_nodes[0]+0xc,v+2,8);*(void**)(terrain_nodes[0]+0x50)=samples;
  for(int j=0;j<289;j++){uint16_t h=(uint16_t)((int)v[1]+j*137);memcpy(samples+j*16+2,&h,2);memcpy(samples+j*16+4,v+6+3*((j%17%2)+2*(j/17%2)),12);}
  for(int j=1;j<3;j++){*(int*)(terrain_nodes[j]+0x20)=j;*(void**)(terrain_nodes[j]+0x54)=children[j-1];for(int k=0;k<256;k++)children[j-1][k]=terrain_nodes[j-1];}
  unsigned char*root=terrain_nodes[mode<3?mode:1];if(mode==3)*(void**)(root+0x54)=NULL;if(mode==4)memset(children[0],0,sizeof children[0]);
  *(void**)(terrain+0x44)=mode==5?NULL:root;memcpy(terrain+0xa04,v+4,4);memcpy(terrain+0x40,v+5,4);put32(0x8f4,(uintptr_t)terrain);
  memcpy(node+0x84,v+18,64);memcpy(node+0xc4,v+34,64);*(int*)(node+0x104)=(int)v[50];*(void**)(component+0x50)=node;put32(0x8ec,(uintptr_t)component);memcpy(front+0x44,v+51,4);put32(0x8dc,(uintptr_t)front);
  memcpy(points,v+52,sizeof points);memcpy(heights,v+82,8);memcpy(normal_seed,v+84,8);normal_seed[2]=3;memcpy(normal_seed+3,v+93,12);memset(rear,0,sizeof rear);memcpy(rear+0x44,v+86,4);put32(0x8e0,(uintptr_t)rear);put32(0x434,(uintptr_t)node);memcpy(bike+0x4c0,v+87,24);memcpy(bike+0x4dc,v+96,12);memcpy(normal_seed+6,v+99,24);memcpy(normal_seed+12,v+105,24);
  memset(extra_nodes,0,sizeof extra_nodes);unsigned char*nodes[4]={node,extra_nodes[0],extra_nodes[1],extra_nodes[2]};
  for(int j=1;j<4;j++){memcpy(nodes[j]+0x84,v+111+(j-1)*33,128);*(int*)(nodes[j]+0x104)=(int)v[111+(j-1)*33+32];}
  for(int j=0;j<4;j++){int parent=(int)v[210+j];*(void**)(nodes[j]+0x108)=parent<0?NULL:nodes[parent];if(parent>=0){*(void**)(nodes[j]+0x110)=*(void**)(nodes[parent]+0x10c);*(void**)(nodes[parent]+0x10c)=nodes[j];}}
  *(void**)front=nodes[(int)v[214]];*(void**)rear=nodes[(int)v[215]];memcpy(bike+0x590,heights,8);memcpy(bike+0x6b0,v+216,4);
  memcpy(step_values,v+217,sizeof step_values);put32(0x844,(int)v[219]);put32(0x434,(uintptr_t)nodes[(int)v[220]]);memcpy(component+0x44,v+221,4);memcpy(component+0x54,v+222,12);memcpy(bike+0x888,v+225,4);put32(0x8ac,(int)v[226]);
  memcpy(bike+0x564,v+227,4);memcpy(bike+0x6a0,v+228,4);memcpy(bike+0x69c,v+229,4);memcpy(bike+0x510,v+230,12);memcpy(bike+0x690,v+233,12);
  memcpy(bike+0x4d8,v+236,4);
  *(void**)suspension=nodes[(int)v[237]];put32(0x8e8,(uintptr_t)suspension);*(void**)component=nodes[(int)v[238]];
  memcpy(chassis_input,v+239,sizeof chassis_input);memcpy(bike+0x630,chassis_input+4,36);
  memcpy(response_input,v+272,sizeof response_input);put32(0x4bc,(int)response_input[0]);put32(0x870,(int)response_input[1]);memcpy(bike+0x718,response_input+2,4);put32(0x8c4,(int)response_input[3]);put32(0xb4c,(int)response_input[4]);put32(0xc6c,(int)response_input[5]);put32(0x714,(int)response_input[6]);put32(0xc78,(int)response_input[7]);memcpy(bike+0xc70,response_input+8,4);memcpy(bike+0xc74,response_input+9,4);memcpy(bike+0x53c,response_input+10,4);memcpy(component+0x48,response_input+11,4);
  memcpy(balance_input,v+288,sizeof balance_input);memcpy(bike+0x4f8,balance_input,12);memcpy(bike+0x6b8,balance_input+3,24);memcpy(bike+0x6ec,balance_input+9,4);put32(0x710,(int)balance_input[10]);memcpy(bike+0x684,balance_input+11,12);memcpy(balance_filter,balance_input+14,8);put32(0x8f8,(uintptr_t)balance_filter);
  memcpy(center_input,v+308,sizeof center_input);memcpy(bike+0x5d8,center_input,4);put32(0xcc4,(uintptr_t)nodes[(int)center_input[1]]);memcpy(bike+0x504,center_input+2,12);
  phase();
  memcpy(r,points,sizeof points);memcpy(r+30,heights,8);memcpy(r+32,bike+0x578,12);memcpy(r+35,bike+0x54c,12);memcpy(r+38,bike+0x540,12);memcpy(r+41,node+0x84,64);memcpy(r+57,node+0xc4,64);memcpy(r+73,node+0x104,4);memcpy(r+74,frame_local,sizeof frame_local);memcpy(r+80,bike+0x584,12);memcpy(r+83,rear_normal,12);memcpy(r+86,probe_samples,48);memcpy(r+98,refined,48);
  for(int j=1;j<4;j++){memcpy(r+110+(j-1)*33,nodes[j]+0x84,128);memcpy(r+110+(j-1)*33+32,nodes[j]+0x104,4);}memcpy(r+209,bike+0x6b0,4);
  memcpy(r+210,component+0x44,4);memcpy(r+211,bike+0x888,4);r[212]=get32(0x8ac);r[213]=get32(0x844);
  memcpy(r+214,force_output,sizeof force_output);
  memcpy(r+227,bike+0x4f0,8);
  memcpy(r+229,geometry_output,sizeof geometry_output);
  memcpy(r+238,chassis_output,sizeof chassis_output);
  memcpy(r+262,response_output,sizeof response_output);
  memcpy(r+278,balance_output,sizeof balance_output);
  memcpy(r+291,center_output,sizeof center_output);
  if(fwrite(r,sizeof r,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
