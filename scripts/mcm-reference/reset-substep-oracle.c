#define main unused_helper_main
#include "oracle.c"
#undef main
#include "oracle-imports.h"
unsigned char parts[4][0x60],engine[0x1f0],effect[16];uint32_t random_value,random_calls;
int __cdecl draw_random(void){random_calls++;return random_value;}
unsigned char nodes[4][0x114],component[0x60];float pose[9];
unsigned char terrain_nodes[3][0x58],samples[289*16],terrain[0xa08];void*children[2][256];float points[10][3],heights[2];
float normal_seed[18];
unsigned char bounds[0x34],bound_records[3][0x30],bound_components[4*0x40];
unsigned char grid_object[0xf8],grid_manager[0x394c],grid_cells[65][0x18],grid_markers[65][0x18],grid_entries[4][0x18],proxy[0x438];
unsigned char settings[0x107c],context[0x18c0],others[4][0xcc8],observer[0x84],target_manager[0x8c],targets[2][0x34],target_nodes[2][0x114];
void*primary[8],*secondary[8];float*selection;uint32_t control_output[4];
unsigned point_offsets[10]={0x504,0x510,0x324,0x348,0x300,0x2e8,0x2dc,0x30c,0x7ec,0x4f8};
uint32_t token(void*p){if(!p)return 0;for(int i=0;i<65;i++){if(p==grid_cells[i])return 1000+i;if(p==grid_markers[i])return 2000+i;}for(int i=0;i<4;i++)if(p==grid_entries[i])return i+1;fail("unknown pointer");return 0;}
void setup_substep(unsigned char*s){
 *(int*)(s+0x8c)=(int)selection[7];*(int*)(s+0x1c)=(int)selection[116];*(int*)(s+0x30)=(int)selection[117];*(int*)(s+0x2c)=(int)selection[118];
 memcpy(s+0x378,pose,12);memcpy(s+0x2f4,pose+3,12);for(int j=0;j<10;j++)memcpy(s+point_offsets[j],points[j],12);
}
void copy_substep(unsigned char*s){
 memcpy(pose,s+0x378,12);memcpy(pose+3,s+0x2f4,12);for(int j=0;j<10;j++)memcpy(points[j],s+point_offsets[j],12);
 memcpy(heights,bike+0x590,8);memcpy(control_output,s+0x1c,4);memcpy(control_output+1,s+0x30,4);memcpy(control_output+2,s+0x2c,4);memcpy(control_output+3,s+0x8c,4);
}
void run_substep(void);void substep_exit(void);
__asm__(".text\n_run_substep:\n push %ebp\n push %ebx\n push %esi\n push %edi\n sub $0xc00,%esp\n mov %esp,%eax\n push %eax\n call _setup_substep\n add $4,%esp\n mov $_bike,%esi\n mov $0x200a5eb4,%eax\n jmp *%eax\n_substep_exit:\n mov %esp,%eax\n push %eax\n call _copy_substep\n add $4,%esp\n add $0xc00,%esp\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n");
void frame_entry(void);
__asm__(".text\n_frame_entry:\n sub $0xb8,%esp\n push %eax\n mov _normal_seed,%eax\n mov %eax,0x74(%esp)\n mov _normal_seed+4,%eax\n mov %eax,0x78(%esp)\n mov _normal_seed+8,%eax\n mov %eax,0x7c(%esp)\n mov _normal_seed+12,%eax\n mov %eax,0x98(%esp)\n mov _normal_seed+16,%eax\n mov %eax,0x9c(%esp)\n mov _normal_seed+20,%eax\n mov %eax,0xa0(%esp)\n mov _normal_seed+24,%eax\n mov %eax,0x38(%esp)\n mov _normal_seed+28,%eax\n mov %eax,0x3c(%esp)\n mov _normal_seed+32,%eax\n mov %eax,0x40(%esp)\n mov _normal_seed+36,%eax\n mov %eax,0x44(%esp)\n mov _normal_seed+40,%eax\n mov %eax,0x48(%esp)\n mov _normal_seed+44,%eax\n mov %eax,0x4c(%esp)\n mov _normal_seed+48,%eax\n mov %eax,0x68(%esp)\n mov _normal_seed+52,%eax\n mov %eax,0x6c(%esp)\n mov _normal_seed+56,%eax\n mov %eax,0x70(%esp)\n mov _normal_seed+60,%eax\n mov %eax,0x8c(%esp)\n mov _normal_seed+64,%eax\n mov %eax,0x90(%esp)\n mov _normal_seed+68,%eax\n mov %eax,0x94(%esp)\n pop %eax\n push $0x200a0136\n ret\n");
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);unsigned char*exit_patch=(void*)0x200a64dc;exit_patch[0]=0xe9;*(uint32_t*)(exit_patch+1)=(uintptr_t)substep_exit-0x200a64dc-5;((void (__cdecl *)(void))0x20001640)();((void (__cdecl *)(void))0x20012910)();bind_oracle_kernel_imports();
 if(!((int (__cdecl *)(void))0x200c5230)())fail("CRT heap");
 if(!((int (__cdecl *)(void))0x200c24e0)())fail("CRT thread");
 HMODULE d3drm=LoadLibraryA("d3drm.dll");if(!d3drm)fail("d3drm load");char module_path[MAX_PATH],copy_path[MAX_PATH];if(!GetModuleFileNameA(d3drm,module_path,sizeof module_path))fail("d3drm path");if(snprintf(copy_path,sizeof copy_path,"%s.d3drm.dll",argv[3])>=(int)sizeof copy_path||!CopyFileA(module_path,copy_path,TRUE))fail("copy loaded d3drm");FARPROC rotate=GetProcAddress(d3drm,"D3DRMVectorRotate");if(!rotate)fail("vector rotate");*(FARPROC*)0x201278b8=rotate;
unsigned char*p=(void*)0x200bf190;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)draw_random-0x200bf190-5;
 ((void (__cdecl *)(void))0x20001720)();((void (__cdecl *)(void))0x2009d650)();((void (__cdecl *)(void))0x2009d620)();
 p=(void*)0x200a0130;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)frame_entry-0x200a0130-5;
 ((void (__cdecl *)(void))0x2009d680)();
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  uint32_t v[1466],r[1566];if(fread(v,sizeof v,1,in)!=1)fail("input");
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
  *(void**)parts[0]=nodes[(int)t[18]];*(void**)parts[1]=nodes[(int)t[19]];memcpy(points,t+20,sizeof points);memcpy(heights,t+50,8);memcpy(normal_seed,v+1247,72);put32(0xcc4,(uintptr_t)nodes[(int)((float*)v)[1265]]);
  memset(bounds,0,sizeof bounds);memset(bound_records,0,sizeof bound_records);memset(bound_components,0,sizeof bound_components);
  float*bc=(float*)(v+1266);memcpy(bounds+0x1c,bc,12);memcpy(bounds+0x28,bc+3,12);
  put32(0x23c,(uintptr_t)bounds);put32(0x234,(uintptr_t)bound_components);put32(0,0x200d9a94);
  for(int j=0;j<4;j++)*(void**)(bound_components+j*0x40+0x34)=nodes[j];
  for(int j=0;j<3;j++){float*q=bc+7+j*11;unsigned char*r=bound_records[j];r[0]=(uint8_t)q[0];*(int*)(r+4)=(int)q[1];memcpy(r+8,q+2,36);if(j+1<(int)bc[6])*(void**)(r+0x2c)=bound_records[j+1];}
  if(bc[6])*(void**)(bounds+0xc)=bound_records[0];
  float*g=(float*)(v+1306);
  memset(grid_object,0,sizeof grid_object);memset(grid_manager,0,sizeof grid_manager);memset(grid_cells,0,sizeof grid_cells);memset(grid_markers,0,sizeof grid_markers);memset(grid_entries,0,sizeof grid_entries);memset(proxy,0,sizeof proxy);
  put32(0xc88,g[0]?(uintptr_t)grid_object:0);put32(0xc8c,(uintptr_t)proxy);*(void**)(proxy+0x434)=nodes[(int)g[1]];
  memcpy(grid_object+0x1c,g+2,64);memcpy(grid_object+0x70,g+18,12);memcpy(grid_object+0x7c,g+21,12);memcpy(grid_object+0x5c,g+24,4);*(int*)(grid_object+0x88)=(int)g[39];
  memcpy(grid_manager+0x3938,g+25,8);*(int*)(grid_manager+0x3940)=(int)g[27];memcpy(grid_manager+0x3944,g+28,4);*(void**)(grid_manager+0x3948)=grid_cells;
  *(int*)0x200e3754=(int)g[29];*(int*)(grid_object+0xf4)=(int)g[30];*(void**)(grid_object+0x98)=grid_manager;*(void**)(grid_object+0x8c)=grid_entries;*(int*)(grid_object+0x90)=4;
  for(int k=0;k<65;k++){*(void**)(grid_cells[k]+4)=grid_markers[k];*(void**)grid_markers[k]=grid_cells[k];}
  for(int k=0;k<4;k++){unsigned char*e=grid_entries[k];*(int*)(e+8)=123;*(int*)(e+12)=(int)g[31+k];*(int*)(e+16)=77+k;*(int*)(e+20)=(int)g[35+k];if(g[35+k]){unsigned char*tail=grid_cells[(int)g[31+k]];while(*(void**)(tail+4))tail=*(void**)(tail+4);*(void**)(tail+4)=e;*(void**)e=tail;}}
  selection=(float*)(v+1346);float*q=selection;
  memset(settings,0,sizeof settings);memset(context,0,sizeof context);memset(others,0,sizeof others);memset(primary,0,sizeof primary);memset(secondary,0,sizeof secondary);memset(observer,0,sizeof observer);
  *(void**)0x200e4fb4=settings;*(short*)(settings+0x1072)=(short)q[0];*(short*)(settings+0x1070)=(short)q[1];*(int*)(settings+0x314)=(int)q[2];*(short*)(settings+0x107a)=(short)q[3];*(int*)(settings+0x614)=(int)q[4];
  put32(0xbb8,(int)q[5]);put32(0x88c,(int)q[6]);put32(0x614,(int)q[8]);put32(0xc08,(int)q[9]);put32(0xbe4,(int)q[10]);put32(0xc84,(uintptr_t)context);memcpy(context+0x18bc,q+11,4);
  for(int j=0;j<4;j++){memcpy(others[j]+0x4f8,q+12+j*4,12);*(int*)(others[j]+0xc30)=(int)q[15+j*4];}
  primary[0]=bike;primary[1]=others[0];primary[2]=others[1];for(int j=0;j<4;j++)secondary[j]=others[(int)q[2]==1?j:j+2<4?j+2:0];
  *(void**)(context+0x30)=bike;*(void**)(context+0x34)=primary;*(void**)(context+0x38)=secondary;
  memcpy(bike+0x898,q+28,12);memcpy(bike+0xbc0,q+31,12);memcpy(bike+0xbcc,q+34,12);memcpy(bike+0x4f8,q+37,12);memcpy(bike+0x4c0,q+40,12);memcpy(bike+0x4cc,q+43,12);
  memset(target_manager,0,sizeof target_manager);memset(targets,0,sizeof targets);memset(target_nodes,0,sizeof target_nodes);
  *(void**)(settings+0x600)=q[46]?target_manager:NULL;*(int*)(target_manager+0x88)=(int)q[47];
  for(int j=0;j<2;j++){*(void**)(target_manager+0x80+j*4)=targets[j];*(void**)(targets[j]+0x30)=target_nodes[j];memcpy(target_nodes[j]+0x84,q+48+j*33,128);*(int*)(target_nodes[j]+0x104)=(int)q[80+j*33];}
  if(q[114]){*(void**)(target_nodes[1]+0x108)=target_nodes[0];*(void**)(target_nodes[0]+0x10c)=target_nodes[1];}
  *(void**)(settings+0x608)=q[115]?observer:NULL;*(void**)(observer+0x80)=q[115]==1?bike:others[0];
  run_substep();put32(0xc84,v[2+0xc84/4]);
  put32(0xc88,v[2+0xc88/4]);put32(0xc8c,v[2+0xc8c/4]);
  put32(0,v[2]);put32(0x23c,v[2+0x23c/4]);put32(0x234,v[2+0x234/4]);
  memcpy(parts[0],v+820,4);memcpy(parts[1],v+844,4);put32(0x8f4,v[2+0x8f4/4]);
  put32(0xcc4,v[2+0xcc4/4]);put32(0x434,v[2+0x434/4]);put32(0x8ec,v[2+0x8ec/4]);
  for(int j=0;j<6;j++)put32(offsets[j],v[2+offsets[j]/4]);
  memcpy(r,bike,sizeof bike);memcpy(r+818,parts,sizeof parts);memcpy(r+914,engine,sizeof engine);memcpy(r+1038,effect,16);r[1042]=random_calls;for(int j=0;j<4;j++){memcpy(r+1043+j*33,nodes[j]+0x84,128);memcpy(r+1043+j*33+32,nodes[j]+0x104,4);}memcpy(r+1175,component+0x44,4);memcpy(r+1176,points,sizeof points);memcpy(r+1206,heights,8);
  for(int j=0;j<3;j++)memcpy(r+1208+j*9,bound_records[j]+8,36);
  memcpy(r+1235,grid_object+0x1c,64);memcpy(r+1251,grid_object+0x88,4);memcpy(r+1252,grid_object+0x7c,12);
  for(int k=0;k<4;k++){unsigned char*e=grid_entries[k];r[1255+k*6]=token(*(void**)e);r[1256+k*6]=token(*(void**)(e+4));memcpy(r+1257+k*6,e+8,16);}
  for(int k=0;k<65;k++){r[1279+k*3]=token(*(void**)(grid_cells[k]+4));r[1280+k*3]=token(*(void**)grid_markers[k]);r[1281+k*3]=token(*(void**)(grid_markers[k]+4));}
  memcpy(r+1474,pose,24);memcpy(r+1480,control_output,16);
  for(int j=0;j<4;j++){memcpy(r+1484+j*4,others[j]+0x4f8,12);memcpy(r+1487+j*4,others[j]+0xc30,4);}
  for(int j=0;j<2;j++){memcpy(r+1500+j*33,target_nodes[j]+0x84,128);memcpy(r+1532+j*33,target_nodes[j]+0x104,4);}
  if(fwrite(r,sizeof r,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
