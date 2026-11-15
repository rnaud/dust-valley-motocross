// Intact pinned Wine 12fe0; caller-supplied unsigned-key comparator, logging off.
#include <windows.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
typedef struct Node {struct Node *parent,*left,*right;uint32_t flags,key;} Node;
typedef struct Tree {int(__cdecl *compare)(const uint32_t*,const Node*);Node*root;} Tree;
static Node nodes[16];
static int __cdecl compare(const uint32_t*k,const Node*n){return *k<n->key?-1:*k>n->key?1:0;}
static uint32_t index_of(Node*n){return n?(uint32_t)(n-nodes)+1:0;}
int main(int argc,char**argv){
 if(argc!=4)return 2;
 uint8_t*b=(void*)LoadLibraryExA(argv[1],NULL,DONT_RESOLVE_DLL_REFERENCES);if(!b)return 3;
 const uint8_t guard[]={0x55,0x89,0xe5,0x57,0x56,0x53,0x83,0xec,0x10};
 if(memcmp(b+0x12fe0,guard,sizeof guard))return 4;
 DWORD old;if(!VirtualProtect(b+0x216360,1,PAGE_READWRITE,&old))return 5;b[0x216360]=0;
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)return 6;
 uint32_t keys[16],result[65];size_t n;unsigned cases=0;
 while((n=fread(keys,1,sizeof keys,in))==sizeof keys){
  memset(nodes,0,sizeof nodes);for(unsigned j=0;j<16;j++){nodes[j].key=keys[j];nodes[j].flags=0xa5a50000u+j*2;}
  Tree tree={compare,NULL};
  for(unsigned step=0;step<16;step++){
   ((void(__cdecl*)(Tree*,Node*))(b+0x12fe0))(&tree,&nodes[step]);
   result[0]=index_of(tree.root);
   for(unsigned j=0;j<16;j++){result[1+j*4]=index_of(nodes[j].parent);result[2+j*4]=index_of(nodes[j].left);result[3+j*4]=index_of(nodes[j].right);result[4+j*4]=nodes[j].flags;}
   if(fwrite(result,1,sizeof result,out)!=sizeof result)return 7;
  }
  cases++;
 }
 fprintf(stderr,"cases=%u insertions=%u\n",cases,cases*16);int bad=n||ferror(in);fclose(in);return fclose(out)||bad?8:0;
}
