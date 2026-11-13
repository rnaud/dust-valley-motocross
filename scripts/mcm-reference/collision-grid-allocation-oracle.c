#define main unused_helper_main
#include "oracle.c"
#undef main
#include "oracle-imports.h"
unsigned char grid_object[0xf8],grid_manager[0x394c],grid_cells[65][0x18],grid_markers[65][0x18],grid_entries[4][0x18];
unsigned char*active_entries;
uint32_t token(void*p){
 if(!p)return 0;
 for(int i=0;i<65;i++){if(p==grid_cells[i])return 1000+i;if(p==grid_markers[i])return 2000+i;}
 for(int i=0;i<4;i++)if(active_entries&&p==active_entries+i*0x18)return i+1;
 fail("unknown pointer");return 0;
}
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);bind_oracle_kernel_imports();
 if(!((int (__cdecl *)(void))0x200c5230)())fail("CRT heap");
 if(!((int (__cdecl *)(void))0x200c24e0)())fail("CRT thread");
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  float v[38];uint32_t r[223]={0};if(fread(v,sizeof v,1,in)!=1)fail("input");
  memset(grid_object,0,sizeof grid_object);memset(grid_manager,0,sizeof grid_manager);memset(grid_cells,0,sizeof grid_cells);memset(grid_markers,0,sizeof grid_markers);memset(grid_entries,0,sizeof grid_entries);
  memcpy(grid_object+0x1c,v,64);memcpy(grid_object+0x70,v+16,12);memcpy(grid_object+0x7c,v+19,12);memcpy(grid_object+0x5c,v+22,4);
  memcpy(grid_manager+0x3938,v+23,8);*(int*)(grid_manager+0x3940)=(int)v[25];memcpy(grid_manager+0x3944,v+26,4);*(void**)(grid_manager+0x3948)=grid_cells;
  *(int*)0x200e3754=(int)v[27];*(int*)(grid_object+0xf4)=(int)v[28];*(void**)(grid_object+0x98)=grid_manager;*(void**)(grid_object+0x8c)=grid_entries;*(int*)(grid_object+0x90)=4;
  for(int k=0;k<65;k++){*(void**)(grid_cells[k]+4)=grid_markers[k];*(void**)grid_markers[k]=grid_cells[k];}
  *(int*)grid_object=123;
  for(int k=0;k<4&&!v[37];k++){
   unsigned char*e=grid_entries[k];*(int*)(e+8)=123;*(int*)(e+0xc)=(int)v[29+k];*(int*)(e+0x10)=77+k;*(int*)(e+0x14)=(int)v[33+k];
   if(v[33+k]){unsigned char*tail=grid_cells[(int)v[29+k]];while(*(void**)(tail+4))tail=*(void**)(tail+4);*(void**)(tail+4)=e;*(void**)e=tail;}
  }
  if(v[37]){*(void**)(grid_object+0x8c)=NULL;*(int*)(grid_object+0x90)=0;}
  typedef void (__attribute__((thiscall))*Update)(void*);((Update)0x2002a550)(grid_object);
  active_entries=*(void**)(grid_object+0x8c);r[222]=*(int*)(grid_object+0x90);
  memcpy(r,grid_object+0x7c,12);
  for(int k=0;k<4&&active_entries;k++){unsigned char*e=active_entries+k*0x18;r[3+k*6]=token(*(void**)e);r[4+k*6]=token(*(void**)(e+4));memcpy(r+5+k*6,e+8,16);if(v[37]&&!*(int*)(e+0x14))r[6+k*6]=0;}
  for(int k=0;k<65;k++){r[27+k*3]=token(*(void**)(grid_cells[k]+4));r[28+k*3]=token(*(void**)grid_markers[k]);r[29+k*3]=token(*(void**)(grid_markers[k]+4));}
  if(fwrite(r,sizeof r,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
