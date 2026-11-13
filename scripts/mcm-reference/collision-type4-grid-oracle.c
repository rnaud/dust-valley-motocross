#define main unused_helper_main
#include "oracle.c"
#undef main
#include "oracle-imports.h"
unsigned char line_object[0xf8],line_manager[0x394c],line_cells[65][0x18],line_markers[65][2][0x18];
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);bind_oracle_kernel_imports();
 if(!((int (__cdecl *)(void))0x200c5230)())fail("CRT heap");
 if(!((int (__cdecl *)(void))0x200c24e0)())fail("CRT thread");
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  float v[12];uint32_t r[1236]={0};if(fread(v,sizeof v,1,in)!=1)fail("input");
  memset(line_object,0,sizeof line_object);memset(line_manager,0,sizeof line_manager);memset(line_cells,0,sizeof line_cells);memset(line_markers,0,sizeof line_markers);
  *(int*)line_object=123;memcpy(line_object+4,v,4);memcpy(line_object+0xc,v+1,4);memcpy(line_object+0x10,v+2,4);memcpy(line_object+0x18,v+3,4);
  memcpy(line_manager+0x3938,v+4,8);*(int*)(line_manager+0x3940)=(int)v[6];memcpy(line_manager+0x3944,v+7,4);*(void**)(line_manager+0x3948)=line_cells;
  *(int*)0x200e3754=(int)v[8];*(int*)(line_object+0xf4)=4;*(void**)(line_object+0x98)=line_manager;
  for(int k=0;k<65;k++){
   *(int*)(line_cells[k]+8)=(k+(int)v[10])%7==0?123:900;
   unsigned char*tail=line_cells[k];
   for(int j=0;j<(int)v[9];j++){unsigned char*e=line_markers[k][j];*(void**)(tail+4)=e;*(void**)e=tail;*(int*)(e+8)=(k+j+(int)v[11])%3==0?123:500+j;*(int*)(e+0x10)=77+j;*(int*)(e+0x14)=2;tail=e;}
  }
  typedef void (__attribute__((thiscall))*Update)(void*);((Update)0x2002a550)(line_object);
  for(int k=0;k<65;k++){
   unsigned char*previous=line_cells[k],*e=*(void**)(previous+4);int j=0;
   while(e){if(j>=6)fail("long list");if(*(void**)e!=previous)fail("broken previous");r[k*19+1+j*3]=*(int*)(e+8);r[k*19+2+j*3]=*(int*)(e+0x10);r[k*19+3+j*3]=*(int*)(e+0x14);previous=e;e=*(void**)(e+4);j++;}
   r[k*19]=j;
  }
  r[1235]=*(int*)(line_object+0x90);
  if(fwrite(r,sizeof r,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
