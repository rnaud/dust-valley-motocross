#define main unused_helper_main
#include "oracle.c"
#undef main
float start_input[311];uint32_t start_output[257],query_count,query_log[12],random_calls;
unsigned char engine[0x1f0],rider[0x144],controller[0x28],device[4];float analog_filter[2],acceleration_filter[2];
int __cdecl draw_random(void){random_calls++;return (int)start_input[57];}
int __attribute__((thiscall)) supplied_device(void*self,int action,int option,int extra){
 if(self!=device||option||extra||(action!=4&&action!=5)||query_count>=12)fail("query");
 query_log[query_count++]=action;return (int)start_input[action==5?58:59];
}
void patch(uint32_t address,void*target){unsigned char*p=(void*)(uintptr_t)address;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)target-address-5;}
unsigned char prep_nodes[6][0x114],front_component[0x60],rear_component[0x60];
void run_start(void);void start_exit(void);
void setup_start(unsigned char*s){float*v=start_input;memset(bike,0,sizeof bike);memset(engine,0,sizeof engine);memset(rider,0,sizeof rider);memset(controller,0,sizeof controller);query_count=random_calls=0;memset(query_log,0,sizeof query_log);
 memcpy(s+0x10,v,4);memcpy(s+0x48,v+1,4);memcpy(s+0xc4,v+2,4);
 put32(0x844,(int)v[3]);memcpy(bike+0x5e4,v+4,4);put32(0xb04,(int)v[5]);put32(0xb08,(int)v[6]);
 memcpy(bike+0x558,v+7,4);memcpy(bike+0x55c,v+8,4);memcpy(bike+0x680,v+9,4);memcpy(bike+0x678,v+10,4);memcpy(bike+0x684,v+11,4);memcpy(bike+0x694,v+12,4);
 *(int*)(rider+0x13c)=(int)v[13];*(int*)(rider+0x140)=(int)v[14];put32(0x874,(uintptr_t)rider);
 memcpy(bike+0x6a4,v+15,4);memcpy(bike+0x564,v+16,4);memcpy(bike+0x510,v+17,12);memcpy(bike+0x84c,v+20,4);memcpy(acceleration_filter,v+21,8);memcpy(bike+0x848,v+23,4);put32(0x8fc,(uintptr_t)acceleration_filter);
 memcpy(engine+0x168,v+24,4);*(int*)(engine+0x150)=(int)v[25];memcpy(engine+0x160,v+26,4);memcpy(engine+0x15c,v+27,4);memcpy(engine+0x7c,v+28,4);memcpy(engine+0x154,v+29,4);*(int*)(engine+0x158)=(int)v[30];memcpy(analog_filter,v+31,8);
 *(void**)engine=bike;*(void**)(engine+4)=analog_filter;put32(0x8f0,(uintptr_t)engine);
 for(int k=0;k<5;k++){memcpy(engine+8+k*4,v+33+k,4);memcpy(engine+0x20+k*8,v+38+k,4);memcpy(engine+0x50+k*4,v+43+k,4);memcpy(engine+0x64+k*4,v+48+k,4);}
 memcpy(engine+0x78,v+53,4);memcpy(engine+0x80,v+54,4);*(int*)(engine+0x148)=(int)v[55];*(int*)(engine+0x14c)=(int)v[56];*(int*)(engine+0x84)=5;
 put32(0x614,(int)v[60]);put32(0x618,(int)v[61]);put32(0x6e4,(uintptr_t)controller);*(void**)(controller+0x24)=device;
 memset(prep_nodes,0,sizeof prep_nodes);memset(front_component,0,sizeof front_component);memset(rear_component,0,sizeof rear_component);
 for(int k=0;k<6;k++){memcpy(prep_nodes[k]+0x84,v+62+k*33,64);memcpy(prep_nodes[k]+0xc4,v+78+k*33,64);*(int*)(prep_nodes[k]+0x104)=(int)v[94+k*33];}
 for(int k=0;k<6;k++){int parent=(int)v[260+k];if(parent>=0){*(void**)(prep_nodes[k]+0x108)=prep_nodes[parent];*(void**)(prep_nodes[k]+0x110)=*(void**)(prep_nodes[parent]+0x10c);*(void**)(prep_nodes[parent]+0x10c)=prep_nodes[k];}}
 *(void**)front_component=prep_nodes[(int)v[266]];*(void**)rear_component=prep_nodes[(int)v[267]];
 memcpy(rear_component+4,v+269,64);*(int*)(front_component+0x44)=(int)v[285];*(int*)(rear_component+0x44)=(int)v[286];
 put32(0x8e4,(uintptr_t)front_component);put32(0x8e8,(uintptr_t)rear_component);put32(0xcc4,(uintptr_t)prep_nodes[(int)v[268]]);memcpy(bike+0x504,v+287,12);
 int scratch_offsets[]={0x858,0x870,0x504,0x510,0x4f8,0x7ec,0x864};for(int k=0;k<7;k++)memcpy(s+scratch_offsets[k],v+290+k*3,12);

}
void copy_start(unsigned char*s){
 memcpy(start_output,engine+0x168,4);memcpy(start_output+1,engine+0x150,4);memcpy(start_output+2,engine+0x160,4);memcpy(start_output+3,engine+0x15c,4);memcpy(start_output+4,engine+0x7c,4);memcpy(start_output+5,engine+0x154,4);memcpy(start_output+6,engine+0x158,4);memcpy(start_output+7,analog_filter,4);
 int offsets[]={0x5e4,0x558,0x55c,0x694,0x564,0x510,0x514,0x518,0x848,0x84c};for(int k=0;k<10;k++)memcpy(start_output+8+k,bike+offsets[k],4);memcpy(start_output+18,acceleration_filter,4);start_output[19]=random_calls;start_output[20]=query_count;memcpy(start_output+21,query_log,sizeof query_log);
 for(int k=0;k<6;k++){memcpy(start_output+33+k*33,prep_nodes[k]+0x84,64);memcpy(start_output+49+k*33,prep_nodes[k]+0xc4,64);memcpy(start_output+65+k*33,prep_nodes[k]+0x104,4);}
 memcpy(start_output+231,front_component+0x44,4);memcpy(start_output+232,rear_component+0x44,4);memcpy(start_output+233,bike+0x504,12);
 int scratch_offsets[]={0x858,0x870,0x504,0x510,0x4f8,0x7ec,0x864};for(int k=0;k<7;k++)memcpy(start_output+236+k*3,s+scratch_offsets[k],12);

}
__asm__(".text\n_run_start:\n push %ebp\n push %ebx\n push %esi\n push %edi\n sub $0xc00,%esp\n mov %esp,%eax\n push %eax\n call _setup_start\n add $4,%esp\n mov $_bike,%esi\n mov $0x200a5bd7,%eax\n jmp *%eax\n_start_exit:\n mov %esp,%eax\n push %eax\n call _copy_start\n add $4,%esp\n add $0xc00,%esp\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n");
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);patch(0x200a5ea5,start_exit);patch(0x200bf190,draw_random);patch(0x20052670,supplied_device);
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){if(fread(start_input,sizeof start_input,1,in)!=1)fail("input");run_start();if(fwrite(start_output,sizeof start_output,1,out)!=1)fail("output");}
 if(fclose(out))fail("close");
 return 0;
}
