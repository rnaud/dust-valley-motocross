#define main unused_helper_main
#include "oracle.c"
#undef main
unsigned char terrain_nodes[3][0x58],samples[17*17*16],terrain[0xa08],node[0x114],component[0x60],front[0x50],rear[0x50];void*children[2][256];
float points[10][3],heights[2],frame_local[6],normal_seed[18],rear_normal[3],probe_samples[12],refined[12];
void frame_exit(void);void copy_frame(unsigned char*s){memcpy(frame_local,s+0x80,12);memcpy(frame_local+3,s+0x8c,12);memcpy(rear_normal,s+0xa4,12);memcpy(probe_samples,s+0x5c,12);memcpy(probe_samples+3,s+0x68,12);memcpy(probe_samples+6,s+0x44,24);memcpy(refined,s+0x74,12);memcpy(refined+3,s+0x98,12);memcpy(refined+6,s+0xb0,24);}
__asm__(".text\n_frame_exit:\n mov %esp,%eax\n push %eax\n call _copy_frame\n add $4,%esp\n pop %ebp\n pop %edi\n pop %esi\n pop %ebx\n add $0xb8,%esp\n ret $0x34\n");
/* Seed the third normal destination at routine entry without replacing any
 * terrain call. Its initial contents matter only when terrain is absent. */
void frame_entry(void);
__asm__(".text\n_frame_entry:\n sub $0xb8,%esp\n push %eax\n mov _normal_seed,%eax\n mov %eax,0x74(%esp)\n mov _normal_seed+4,%eax\n mov %eax,0x78(%esp)\n mov _normal_seed+8,%eax\n mov %eax,0x7c(%esp)\n mov _normal_seed+12,%eax\n mov %eax,0x98(%esp)\n mov _normal_seed+16,%eax\n mov %eax,0x9c(%esp)\n mov _normal_seed+20,%eax\n mov %eax,0xa0(%esp)\n mov _normal_seed+24,%eax\n mov %eax,0x38(%esp)\n mov _normal_seed+28,%eax\n mov %eax,0x3c(%esp)\n mov _normal_seed+32,%eax\n mov %eax,0x40(%esp)\n mov _normal_seed+36,%eax\n mov %eax,0x44(%esp)\n mov _normal_seed+40,%eax\n mov %eax,0x48(%esp)\n mov _normal_seed+44,%eax\n mov %eax,0x4c(%esp)\n mov _normal_seed+48,%eax\n mov %eax,0x68(%esp)\n mov _normal_seed+52,%eax\n mov %eax,0x6c(%esp)\n mov _normal_seed+56,%eax\n mov %eax,0x70(%esp)\n mov _normal_seed+60,%eax\n mov %eax,0x8c(%esp)\n mov _normal_seed+64,%eax\n mov %eax,0x90(%esp)\n mov _normal_seed+68,%eax\n mov %eax,0x94(%esp)\n pop %eax\n push $0x200a0136\n ret\n");
void patch(uint32_t address,void*target){unsigned char*p=(void*)(uintptr_t)address;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)target-address-5;}
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);HMODULE d3drm=LoadLibraryA("d3drm.dll");if(!d3drm)fail("d3drm load");char module_path[MAX_PATH],copy_path[MAX_PATH];if(!GetModuleFileNameA(d3drm,module_path,sizeof module_path))fail("d3drm path");if(snprintf(copy_path,sizeof copy_path,"%s.d3drm.dll",argv[3])>=(int)sizeof copy_path||!CopyFileA(module_path,copy_path,TRUE))fail("copy loaded d3drm");FARPROC rotate=GetProcAddress(d3drm,"D3DRMVectorRotate");if(!rotate)fail("vector rotate");*(FARPROC*)0x201278b8=rotate;patch(0x200a0130,frame_entry);patch(0x200a13b0,frame_exit);
 ((void (__cdecl *)(void))0x20001720)();((void (__cdecl *)(void))0x2009d650)();((void (__cdecl *)(void))0x2009d680)();
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  float v[111];uint32_t r[110];if(fread(v,sizeof v,1,in)!=1)fail("input");
  memset(bike,0,sizeof bike);memset(terrain_nodes,0,sizeof terrain_nodes);memset(children,0,sizeof children);memset(terrain,0,sizeof terrain);memset(node,0,sizeof node);memset(component,0,sizeof component);memset(front,0,sizeof front);
  int mode=(int)v[0];memcpy(terrain_nodes[0]+0xc,v+2,8);*(void**)(terrain_nodes[0]+0x50)=samples;
  for(int j=0;j<289;j++){uint16_t h=(uint16_t)((int)v[1]+j*137);memcpy(samples+j*16+2,&h,2);memcpy(samples+j*16+4,v+6+3*((j%17%2)+2*(j/17%2)),12);}
  for(int j=1;j<3;j++){*(int*)(terrain_nodes[j]+0x20)=j;*(void**)(terrain_nodes[j]+0x54)=children[j-1];for(int k=0;k<256;k++)children[j-1][k]=terrain_nodes[j-1];}
  unsigned char*root=terrain_nodes[mode<3?mode:1];if(mode==3)*(void**)(root+0x54)=NULL;if(mode==4)memset(children[0],0,sizeof children[0]);
  *(void**)(terrain+0x44)=mode==5?NULL:root;memcpy(terrain+0xa04,v+4,4);memcpy(terrain+0x40,v+5,4);put32(0x8f4,(uintptr_t)terrain);
  memcpy(node+0x84,v+18,64);memcpy(node+0xc4,v+34,64);*(int*)(node+0x104)=(int)v[50];*(void**)(component+0x50)=node;put32(0x8ec,(uintptr_t)component);memcpy(front+0x44,v+51,4);put32(0x8dc,(uintptr_t)front);
  memcpy(points,v+52,sizeof points);memcpy(heights,v+82,8);memcpy(normal_seed,v+84,8);normal_seed[2]=3;memcpy(normal_seed+3,v+93,12);memset(rear,0,sizeof rear);memcpy(rear+0x44,v+86,4);put32(0x8e0,(uintptr_t)rear);put32(0x434,(uintptr_t)node);memcpy(bike+0x4c0,v+87,24);memcpy(bike+0x4dc,v+96,12);memcpy(normal_seed+6,v+99,24);memcpy(normal_seed+12,v+105,24);
  typedef void (__attribute__((thiscall))*Frame)(void*,float,void*,void*,void*,void*,void*,void*,void*,void*,void*,void*,void*,void*);
  ((Frame)0x200a0130)(bike,0,points[0],points[1],points[2],points[3],points[4],points[5],points[6],points[7],points[8],points[9],heights,heights+1);
  memcpy(r,points,sizeof points);memcpy(r+30,heights,8);memcpy(r+32,bike+0x578,12);memcpy(r+35,bike+0x54c,12);memcpy(r+38,bike+0x540,12);memcpy(r+41,node+0x84,64);memcpy(r+57,node+0xc4,64);memcpy(r+73,node+0x104,4);memcpy(r+74,frame_local,sizeof frame_local);memcpy(r+80,bike+0x584,12);memcpy(r+83,rear_normal,12);memcpy(r+86,probe_samples,48);memcpy(r+98,refined,48);
  if(fwrite(r,sizeof r,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
