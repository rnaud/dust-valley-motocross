#define main unused_helper_main
#include "oracle.c"
#undef main
static unsigned char settings[0x1100],world[0x40],actors[3][0xcc8];static uint32_t nodes[3][3][11],tables[3][3],actor_table[3],closed,cursor;
static const char*folder="Z:\\tmp";static const char*path="Z:\\tmp\\mcm-ai-aid-oracle-case.aid";
static int __cdecl close_aid(FILE*f){cursor=(uint32_t)ftell(f);closed++;return fclose(f);}
static void patch(uint32_t at,void*fn){unsigned char*p=(void*)(uintptr_t)at;p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)(uintptr_t)fn-at-5;}
int main(int argc,char**argv){if(argc!=4)return 2;map_image(argv[1]);if(memcmp((void*)0x2006bdc0,"\x81\xec\x10\x01\x00\x00",6))fail("loader guard");patch(0x200be9a0,sprintf);patch(0x200be960,fopen);patch(0x200be4e0,fread);patch(0x200be860,close_aid);*(void**)0x200e4fb4=settings;*(const char**)(settings+0x620)=folder;strcpy((char*)settings+0x107f,"mcm-ai-aid-oracle-case");*(void**)(world+0x38)=actor_table;
FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t header[5],initial[36],result[39];size_t n;unsigned count=0;const unsigned offsets[]={5,6,7,9};
while((n=fread(header,1,sizeof header,in))==sizeof header){if(fread(initial,sizeof initial,1,in)!=1)fail("initial");uint32_t length=header[4];if(length!=0xffffffff&&length>4096)fail("length");unsigned char bytes[4096];if(length!=0xffffffff&&fread(bytes,1,length,in)!=length)fail("bytes");remove(path);if(length!=0xffffffff){FILE*f=fopen(path,"wb");if(!f)fail("create aid");if(fwrite(bytes,1,length,f)!=length||fclose(f))fail("write aid");}*(uint16_t*)(settings+0x107a)=header[0];closed=cursor=0;memset(actors,0,sizeof actors);memset(nodes,0,sizeof nodes);for(unsigned a=0;a<3;a++){if(header[a+1]>3)fail("nodes");actor_table[a]=(uint32_t)(uintptr_t)actors[a];*(uint32_t*)(actors[a]+0xb00)=header[a+1];*(void**)(actors[a]+0xaf4)=tables[a];for(unsigned j=0;j<3;j++){tables[a][j]=(uint32_t)(uintptr_t)nodes[a][j];for(unsigned k=0;k<4;k++)nodes[a][j][offsets[k]]=initial[(a*3+j)*4+k];}}
result[0]=((uint32_t(__cdecl*)(void*))0x2006bdc0)(world);result[1]=cursor;result[2]=closed;for(unsigned a=0;a<3;a++)for(unsigned j=0;j<3;j++)for(unsigned k=0;k<4;k++)result[3+(a*3+j)*4+k]=nodes[a][j][offsets[k]];if(fwrite(result,sizeof result,1,out)!=1)fail("output");count++;}
remove(path);if(n||ferror(in)||fclose(out))fail("finish");fprintf(stderr,"cases=%u\n",count);return 0;}
