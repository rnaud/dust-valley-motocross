#define main unused_helper_main
#include "oracle.c"
#undef main
#include "oracle-imports.h"
unsigned char parts[4][0x60],engine[0x1f0],effect[16];uint32_t random_value,random_calls;
unsigned char rider[0x500];float*rider_input;float*event_input;uint32_t event_triggered,event_input_calls;
float start_input[62],analog_filter[2],acceleration_filter[2];uint32_t controls_next[170],normal_redirected;unsigned char normal_forward[4],first_rider[0x500];uint32_t motion_next[273];uint32_t tires_next[332];uint32_t response_next[202];uint32_t contact_next[185];float loop_component_rate;unsigned char first_nodes[4][0x114],first_parts[4][0x60],first_component[0x60];uint32_t next_output[33],looped,entry_count,first_bike[818],first_engine[124],first_filters[2];uint32_t start_output[33],query_count,query_log[12],engine_random_calls,engine_entry_active;
unsigned char controller[0x28],device[4];
int __attribute__((thiscall)) supplied_device(void*self,int action,int option,int extra){
 (void)self;if(option||extra)fail("device options");
 if(action==8){event_input_calls++;return (int)event_input[1];}
 if((action!=4&&action!=5)||query_count>=12)fail("query");
 query_log[query_count++]=action;return (int)start_input[action==5?58:59];
}
int __cdecl draw_random(void){
 if(engine_entry_active){engine_random_calls++;return (int)start_input[57];}
 unsigned index=random_calls++;if(!index||!event_input)return (int)random_value;index--;
 if(get32(0xc40)){if(index<2)return (int)event_input[3+index];index-=2;}
 if(index>=3)fail("rider random overflow");
 return (int)rider_input[16+index];
}
int __attribute__((thiscall)) supplied_event_input(void*self,int code,int unused){(void)self;if(code!=8||unused)fail("input query");event_input_calls++;return (int)event_input[1];}
unsigned char nodes[4][0x114],component[0x60];float pose[9];
unsigned char terrain_nodes[3][0x58],samples[289*16],terrain[0xa08];void*children[2][256];float points[10][3],heights[2];
unsigned char dispatch_wall[0x110],dispatch_owner[0x40],dispatch_audio[0x40],dispatch_audio_world[0x200];uint32_t dispatch_callbacks,dispatch_prior_state,dispatch_prior_kind,dispatch_prior_angular;
float normal_seed[18];uint32_t award_called;uint32_t join_called,join_arguments[3];
unsigned char bounds[0x34],bound_records[3][0x30],bound_components[4*0x40];
unsigned char grid_object[0x110],grid_manager[0x3988],grid_cells[65][0x18],grid_markers[65][0x18],grid_entries[4][0x18],proxy[0x438];
unsigned char settings[0x107c],context[0x18c0],others[4][0xcc8],observer[0x84],target_manager[0x8c],targets[2][0x34],target_nodes[2][0x114];
void*primary[8],*secondary[8];float*selection;float*contact_input;float*balance_input;float*suspension_input;float*tire_input;float*impulse_input;float*integration_input;float*alignment_input;uint32_t alignment_output[3],finish_output[4];float*motion_input;uint32_t motion_output[3];uint32_t integration_output[63];uint32_t impulse_output[25],impulse_count,impulse_enabled;uint32_t tire_output[58];uint32_t suspension_output[44];float balance_filter[2];uint32_t balance_output[28];uint32_t control_output[4],contact_output[42];
unsigned point_offsets[10]={0x504,0x510,0x324,0x348,0x300,0x2e8,0x2dc,0x30c,0x7ec,0x4f8};
uint32_t token(void*p){if(!p)return 0;for(int i=0;i<65;i++){if(p==grid_cells[i])return 1000+i;if(p==grid_markers[i])return 2000+i;}for(int i=0;i<4;i++)if(p==grid_entries[i])return i+1;fail("unknown pointer");return 0;}
void setup_start(unsigned char*s){float*v=start_input;memset(controller,0,sizeof controller);query_count=engine_random_calls=0;engine_entry_active=1;entry_count=looped=0;memset(next_output,0,sizeof next_output);memset(contact_next,0,sizeof contact_next);memset(response_next,0,sizeof response_next);memset(tires_next,0,sizeof tires_next);memset(motion_next,0,sizeof motion_next);memset(controls_next,0,sizeof controls_next);normal_redirected=0;memset(query_log,0,sizeof query_log);
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
}
void copy_start(void){engine_entry_active=0;
 uint32_t*saved=start_output;uint32_t*start_output=entry_count?next_output:saved;entry_count++;
 memcpy(start_output,engine+0x168,4);memcpy(start_output+1,engine+0x150,4);memcpy(start_output+2,engine+0x160,4);memcpy(start_output+3,engine+0x15c,4);memcpy(start_output+4,engine+0x7c,4);memcpy(start_output+5,engine+0x154,4);memcpy(start_output+6,engine+0x158,4);memcpy(start_output+7,analog_filter,4);
 int offsets[]={0x5e4,0x558,0x55c,0x694,0x564,0x510,0x514,0x518,0x848,0x84c};for(int k=0;k<10;k++)memcpy(start_output+8+k,bike+offsets[k],4);memcpy(start_output+18,acceleration_filter,4);start_output[19]=engine_random_calls;start_output[20]=query_count;memcpy(start_output+21,query_log,sizeof query_log);
}
void engine_entry_exit(void);
__asm__(".text\n_engine_entry_exit:\n call _copy_start\n  mov 0x8e4(%esi),%ecx\n push $0x200a5e2d\n ret\n");
void setup_substep(unsigned char*s){
 setup_start(s);memcpy(s+0x28,&loop_component_rate,4);
 memcpy(s+0x48,alignment_input,4);memcpy(s+0x420,alignment_input+1,12);
 memcpy(s+124,motion_input,4);memcpy(s+108,motion_input+1,4);memcpy(s+160,motion_input+2,4);
 const int integration_offsets[]={400,1032,1036,1040,2196,2200,2204,1044,1048,1052,2184,2188,2192,720,724,728,1164,1168,1172,1152,1156,1160,1476,1480,1484,1440,1444,1448,560,564,552,556,548,396,1404,1408,1412,1128,1132,1136,1140,1144,1148,2808,2812,2816,2820,2824,2828,88,948,952,956,1080,1084,1088,1068,1072,1076,1248,1252,1256,120};
 for(int j=0;j<63;j++)memcpy(s+integration_offsets[j],integration_input+j,4);
 *(int*)(s+88)=(int)integration_input[49];

 const int impulse_offsets[]={144,1500,1504,1508,2220,2224,2228,2208,2212,2216,1488,1492,1496};
 for(int j=0;j<13;j++)memcpy(s+impulse_offsets[j],impulse_input+j,4);
 const int response_offsets[]={240,236,128,184,180,244,176,232,172};
 for(int j=0;j<9;j++)memcpy(s+response_offsets[j],impulse_input+14+j,4);
 memcpy(s+576,impulse_input+23,4);memcpy(s+116,impulse_input+24,4);

 const int tire_offsets[]={84,960,964,968,1092,1096,1100,696,700,704,96,972,976,980,428,816,820,824,-1852,-1848,1260,1264,1268,68,104,192,592,588,420,416,424,276,584,280,412,308,204,268,1212,1216,1220,864,868,872,1812,1816,1820,264,260,408,924,928,932,248,252,912,916,920};
 for(int j=0;j<58;j++){if(tire_offsets[j]>=0)memcpy(s+tire_offsets[j],tire_input+j,4);}

 const int suspension_offsets[]={ 1020,1024,1028,1104,1108,1112,852,856,860,684,688,692,92,984,988,992,432,80,1236,1240,1244,828,832,836,56,596,200,272,1224,1228,1232,1932,1936,1940,1176,1180,1184,2112,2116,2120,132,568,64,164 };
 for(int j=0;j<42;j++)memcpy(s+suspension_offsets[j],suspension_input+j,4);
 *(int*)(s+64)=(int)suspension_input[42];*(int*)(s+164)=(int)suspension_input[43];

 const int balance_offsets[]={0x25c,0x1b8,0x1b4,0x70,0x384,0x388,0x38c,0x258,0x810,0x814,0x818,0x804,0x808,0x80c,0x7f8,0x7fc,0x800,0x4a4,0x4a8,0x4ac,0x84c,0x850,0x854,0x88,0x23c};
 for(int j=0;j<25;j++)memcpy(s+balance_offsets[j],balance_input+2+j,4);
 *(int*)(s+0x3c)=(int)balance_input[27];*(int*)(s+0xa8)=(int)balance_input[28];

 *(int*)(s+0x20)=(int)contact_input[1];memcpy(s+0x10,contact_input+26,4);
 const int offsets[]={0x36c,0x3e4,0x2a0,0x2c4,0x4b0,0x6d8,0xbc,0x194};
 for(int j=0;j<6;j++)memcpy(s+offsets[j],contact_input+2+j*3,12);
 memcpy(s+0xbc,contact_input+20,4);memcpy(s+0x194,contact_input+21,4);
 memcpy(s+0x264,contact_input+22,4);memcpy(s+0x260,contact_input+23,4);memcpy(s+0x1c0,contact_input+24,4);memcpy(s+0x1bc,contact_input+25,4);

 *(int*)(s+0x8c)=(int)selection[7];*(int*)(s+0x1c)=(int)selection[116];*(int*)(s+0x30)=(int)selection[117];*(int*)(s+0x2c)=(int)selection[118];
 memcpy(s+0x378,pose,12);memcpy(s+0x2f4,pose+3,12);for(int j=0;j<10;j++)memcpy(s+point_offsets[j],points[j],12);
}
void copy_substep(unsigned char*s){
 memcpy(finish_output,s+0x10,4);memcpy(finish_output+1,s+0x48,4);
 memcpy(alignment_output,s+0x420,12);
 memcpy(motion_output,s+124,4);memcpy(motion_output+1,s+108,4);memcpy(motion_output+2,s+160,4);
 const int integration_offsets[]={400,1032,1036,1040,2196,2200,2204,1044,1048,1052,2184,2188,2192,720,724,728,1164,1168,1172,1152,1156,1160,1476,1480,1484,1440,1444,1448,560,564,552,556,548,396,1404,1408,1412,1128,1132,1136,1140,1144,1148,2808,2812,2816,2820,2824,2828,88,948,952,956,1080,1084,1088,1068,1072,1076,1248,1252,1256,120};
 for(int j=0;j<63;j++)memcpy(integration_output+j,s+integration_offsets[j],4);

 const int impulse_offsets[]={144,1500,1504,1508,2220,2224,2228,2208,2212,2216,1488,1492,1496};
 for(int j=0;j<13;j++)memcpy(impulse_output+j,s+impulse_offsets[j],4);
 impulse_output[13]=impulse_count;impulse_output[14]=impulse_enabled;
 const int response_offsets[]={240,236,128,184,180,244,176,232,172};
 for(int j=0;j<9;j++)memcpy(impulse_output+15+j,s+response_offsets[j],4);
 memcpy(impulse_output+24,s+576,4);

 const int tire_offsets[]={84,960,964,968,1092,1096,1100,696,700,704,96,972,976,980,428,816,820,824,-1852,-1848,1260,1264,1268,68,104,192,592,588,420,416,424,276,584,280,412,308,204,268,1212,1216,1220,864,868,872,1812,1816,1820,264,260,408,924,928,932,248,252,912,916,920};
 for(int j=0;j<58;j++)memcpy(tire_output+j,tire_offsets[j]<0?bike-tire_offsets[j]:s+tire_offsets[j],4);

 const int suspension_offsets[]={ 1020,1024,1028,1104,1108,1112,852,856,860,684,688,692,92,984,988,992,432,80,1236,1240,1244,828,832,836,56,596,200,272,1224,1228,1232,1932,1936,1940,1176,1180,1184,2112,2116,2120,132,568,64,164 };
 for(int j=0;j<44;j++)memcpy(suspension_output+j,s+suspension_offsets[j],4);

 memcpy(balance_output,balance_filter,4);
 const int balance_offsets[]={0x25c,0x1b8,0x1b4,0x70,0x384,0x388,0x38c,0x258,0x810,0x814,0x818,0x804,0x808,0x80c,0x7f8,0x7fc,0x800,0x4a4,0x4a8,0x4ac,0x84c,0x850,0x854,0x88,0x23c,0x3c,0xa8};
 for(int j=0;j<27;j++)memcpy(balance_output+1+j,s+balance_offsets[j],4);

 const int offsets[]={0x14,0x18,0x34,0x24,0x100,0x294,0x298,0x29c,0x4c,0x45c,0x460,0x464,0x858,0x85c,0x860,0x864,0x868,0x86c,0x870,0x874,0x878,0x36c,0x370,0x374,0x3e4,0x3e8,0x3ec,0x2a0,0x2a4,0x2a8,0x2c4,0x2c8,0x2cc,0x4b0,0x4b4,0x4b8,0x6d8,0x6dc,0x6e0,0xbc,0x194,0x20};
 for(int j=0;j<42;j++)memcpy(contact_output+j,s+offsets[j],4);

 memcpy(pose,s+0x378,12);memcpy(pose+3,s+0x2f4,12);for(int j=0;j<10;j++)memcpy(points[j],s+point_offsets[j],12);
 memcpy(heights,bike+0x590,8);memcpy(control_output,s+0x1c,4);memcpy(control_output+1,s+0x30,4);memcpy(control_output+2,s+0x2c,4);memcpy(control_output+3,s+0x8c,4);
}
void run_substep(void);void substep_exit(void);
__asm__(".text\n_run_substep:\n push %ebp\n push %ebx\n push %esi\n push %edi\n sub $0xc00,%esp\n mov %esp,%eax\n push %eax\n call _setup_substep\n add $4,%esp\n mov $_bike,%esi\n lea 0x54c(%esi),%edi\n mov $0x200a5bd7,%eax\n jmp *%eax\n_substep_exit:\n add $0xc00,%esp\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n");
void contact_boundary(void);void copy_next_contact(unsigned char*s){
 uint32_t*r=contact_next;memcpy(r,bike+0x504,12);
 for(int j=0;j<10;j++)memcpy(r+3+j*3,s+point_offsets[j],12);
 memcpy(r+33,bike+0x590,8);memcpy(r+35,bike+0x578,24);memcpy(r+41,bike+0x54c,12);memcpy(r+44,bike+0x540,12);
 memcpy(r+47,bike+0x6b0,4);memcpy(r+48,component+0x44,4);memcpy(r+49,bike+0x888,4);memcpy(r+50,bike+0x8ac,4);
 for(int j=0;j<4;j++){memcpy(r+51+j*33,nodes[j]+0x84,128);memcpy(r+83+j*33,nodes[j]+0x104,4);}
 memcpy(r+183,parts[2]+0x44,4);memcpy(r+184,parts[3]+0x44,4);
}
__asm__(".text\n_contact_boundary:\n cmpl $2,_entry_count\n je 1f\n xor %eax,%eax\n mov 0x594(%esi),%ecx\n push $0x200a64e4\n ret\n1:\n mov %esp,%eax\n push %eax\n call _copy_next_contact\n add $4,%esp\n xor %eax,%eax\n mov 0x594(%esi),%ecx\n push $0x200a64e4\n ret\n");
void response_boundary(void);void copy_next_response(unsigned char*s){
 uint32_t*r=response_next;
 const int offsets[]={0x14,0x18,0x34,0x24,0x100,0x294,0x298,0x29c,0x4c,0x45c,0x460,0x464,0x858,0x85c,0x860,0x864,0x868,0x86c,0x870,0x874,0x878,0x36c,0x370,0x374,0x3e4,0x3e8,0x3ec,0x2a0,0x2a4,0x2a8,0x2c4,0x2c8,0x2cc,0x4b0,0x4b4,0x4b8,0x6d8,0x6dc,0x6e0,0xbc,0x194,0x20};
 for(int j=0;j<42;j++)memcpy(r+j,s+offsets[j],4);
 const int fields[]={0x894,0x4f0,0x4f4,0x4bc,0x870,0x718,0x8c4,0xb4c,0xc6c,0x714,0xc78,0xc70,0xc74,0x53c};
 for(int j=0;j<14;j++)memcpy(r+42+j,bike+fields[j],4);
 const int controls[]={0x1c,0x30,0x2c,0x28,0x264,0x260,0x1c0,0x1bc};
 for(int j=0;j<8;j++)memcpy(r+56+j,s+controls[j],4);
 memcpy(r+64,bike+0x54c,12);memcpy(r+67,bike+0x540,12);
 for(int j=0;j<4;j++){memcpy(r+70+j*33,nodes[j]+0x84,128);memcpy(r+102+j*33,nodes[j]+0x104,4);}
}
__asm__(".text\n_response_boundary:\n cmpl $2,_entry_count\n je 1f\n mov 0x4bc(%esi),%eax\n push $0x200a6eb2\n ret\n1:\n mov %esp,%eax\n push %eax\n call _copy_next_response\n add $4,%esp\n mov 0x4bc(%esi),%eax\n push $0x200a6eb2\n ret\n");
void tires_boundary(void);void copy_next_tires(unsigned char*s){
 const int tire_offsets[]={84,960,964,968,1092,1096,1100,696,700,704,96,972,976,980,428,816,820,824,-1852,-1848,1260,1264,1268,68,104,192,592,588,420,416,424,276,584,280,412,308,204,268,1212,1216,1220,864,868,872,1812,1816,1820,264,260,408,924,928,932,248,252,912,916,920};
 for(int j=0;j<58;j++)memcpy(tires_next+72+j,tire_offsets[j]<0?bike-tire_offsets[j]:s+tire_offsets[j],4);

 const int suspension_offsets[]={ 1020,1024,1028,1104,1108,1112,852,856,860,684,688,692,92,984,988,992,432,80,1236,1240,1244,828,832,836,56,596,200,272,1224,1228,1232,1932,1936,1940,1176,1180,1184,2112,2116,2120,132,568,64,164 };
 for(int j=0;j<44;j++)memcpy(tires_next+28+j,s+suspension_offsets[j],4);

 memcpy(tires_next,balance_filter,4);
 const int balance_offsets[]={0x25c,0x1b8,0x1b4,0x70,0x384,0x388,0x38c,0x258,0x810,0x814,0x818,0x804,0x808,0x80c,0x7f8,0x7fc,0x800,0x4a4,0x4a8,0x4ac,0x84c,0x850,0x854,0x88,0x23c,0x3c,0xa8};
 for(int j=0;j<27;j++)memcpy(tires_next+1+j,s+balance_offsets[j],4);


 uint32_t*r=tires_next+130;
 const int fields[]={0x4bc,0x870,0x5a8,0x5ac,0x6b0,0x6b4,0x560,0x620,0x73c,0x738};
 for(int j=0;j<10;j++)memcpy(r+j,bike+fields[j],4);
 const int vectors[]={0x504,0x6b8,0x6c4,0x66c,0x654,0x540,0x510};
 for(int j=0;j<7;j++)memcpy(r+10+j*3,bike+vectors[j],12);
 memcpy(r+31,bike+0x590,8);memcpy(r+33,parts[2]+0x4c,12);memcpy(r+36,parts[2]+0x5c,4);memcpy(r+37,parts[2]+0x44,4);memcpy(r+38,parts[3]+0x58,4);memcpy(r+39,parts[3]+0x44,4);
 for(int j=0;j<4;j++){memcpy(r+40+j*33,nodes[j]+0x84,128);memcpy(r+72+j*33,nodes[j]+0x104,4);}
 for(int j=0;j<10;j++)memcpy(r+172+j*3,s+point_offsets[j],12);
}
__asm__(".text\n_tires_boundary:\n cmpl $2,_entry_count\n je 1f\n flds 0x74(%esp)\n fabs\n push $0x200a8be6\n ret\n1:\n mov %esp,%eax\n push %eax\n call _copy_next_tires\n add $4,%esp\n flds 0x74(%esp)\n fabs\n push $0x200a8be6\n ret\n");
void motion_boundary(void);void copy_next_motion(unsigned char*s){
 const int integration_offsets[]={400,1032,1036,1040,2196,2200,2204,1044,1048,1052,2184,2188,2192,720,724,728,1164,1168,1172,1152,1156,1160,1476,1480,1484,1440,1444,1448,560,564,552,556,548,396,1404,1408,1412,1128,1132,1136,1140,1144,1148,2808,2812,2816,2820,2824,2828,88,948,952,956,1080,1084,1088,1068,1072,1076,1248,1252,1256,120};
 for(int j=0;j<63;j++)memcpy(motion_next+25+j,s+integration_offsets[j],4);

 const int impulse_offsets[]={144,1500,1504,1508,2220,2224,2228,2208,2212,2216,1488,1492,1496};
 for(int j=0;j<13;j++)memcpy(motion_next+j,s+impulse_offsets[j],4);
 motion_next[13]=impulse_count;motion_next[14]=impulse_enabled;
 const int response_offsets[]={240,236,128,184,180,244,176,232,172};
 for(int j=0;j<9;j++)memcpy(motion_next+15+j,s+response_offsets[j],4);
 memcpy(motion_next+24,s+576,4);


 uint32_t*r=motion_next;memcpy(r+88,s+124,4);memcpy(r+89,s+108,4);memcpy(r+90,s+160,4);
 const int vectors[]={0x4f8,0x504,0x510,0x51c,0x534,0x528,0x654,0x54c,0x540,0x660};
 for(int j=0;j<10;j++)memcpy(r+91+j*3,bike+vectors[j],12);
 const int fields[]={0x844,0x6a4,0x8bc,0x6ac,0x6d8,0x6dc,0x6e0};
 for(int j=0;j<7;j++)memcpy(r+121+j,bike+fields[j],4);
 memcpy(r+128,parts[0]+0x4c,4);memcpy(r+129,parts[1]+0x4c,4);
 for(int j=0;j<4;j++){memcpy(r+130+j*33,nodes[j]+0x84,128);memcpy(r+162+j*33,nodes[j]+0x104,4);}
 memcpy(r+262,s+0x294,12);memcpy(r+265,s+0x360,12);
 memcpy(r+268,parts[2]+0x4c,12);memcpy(r+271,parts[2]+0x5c,4);memcpy(r+272,parts[3]+0x58,4);
}
__asm__(".text\n_motion_boundary:\n cmpl $2,_entry_count\n je 1f\n mov 0x844(%esi),%eax\n push $0x200ab803\n ret\n1:\n mov %esp,%eax\n push %eax\n call _copy_next_motion\n add $4,%esp\n mov 0x844(%esi),%eax\n push $0x200ab803\n ret\n");
void copy_next_controls(unsigned char*s,int route){
 uint32_t*r=controls_next;r[0]=route;
 const int vectors[]={0x510,0x534,0x54c,0x540};for(int j=0;j<4;j++)memcpy(r+1+j*3,bike+vectors[j],12);
 memcpy(r+13,bike+0x6a4,4);
 const int fields[]={0x6b0,0x6a8,0x6ac,0xc6c,0xc70,0xc74,0xc78};for(int j=0;j<7;j++)memcpy(r+14+j,bike+fields[j],4);
 memcpy(r+21,rider+0x70,24);memcpy(r+27,bike+0x624,12);
 if(route==1){memcpy(r+30,s+0x318,12);memcpy(r+33,s+0x94,4);}
 memcpy(r+34,s+0x420,12);
 for(int j=0;j<4;j++){memcpy(r+37+j*33,nodes[j]+0x84,128);memcpy(r+69+j*33,nodes[j]+0x104,4);}
 r[169]=normal_redirected;
}
void normal_redirect_entry(void);
__asm__(".text\n_normal_redirect_entry:\n movl $1,_normal_redirected\n flds (%ecx)\n fchs\n mov 0x548(%esi),%eax\n push $0x200abd78\n ret\n");
void controls_air(void);
__asm__(".text\n_controls_air:\n cmpl $2,_entry_count\n je 1f\n mov 0x10(%esp),%eax\n push $0\n push $0x200ac181\n ret\n1:\n mov %esp,%eax\n push $1\n push %eax\n call _copy_next_controls\n add $8,%esp\n jmp _substep_exit\n");
void controls_ground(void);
__asm__(".text\n_controls_ground:\n cmpl $2,_entry_count\n je 1f\n mov 0x10(%esp),%eax\n push $0\n push $0x200ac5cb\n ret\n1:\n mov %esp,%eax\n push $2\n push %eax\n call _copy_next_controls\n add $8,%esp\n jmp _substep_exit\n");
void controls_limited(void);
__asm__(".text\n_controls_limited:\n cmpl $2,_entry_count\n je 1f\n mov 0x10(%esp),%eax\n push $0\n push $0x200ac650\n ret\n1:\n mov %esp,%eax\n push $3\n push %eax\n call _copy_next_controls\n add $8,%esp\n jmp _substep_exit\n");
void controls_crash(void);
__asm__(".text\n_controls_crash:\n cmpl $2,_entry_count\n je 1f\n lea 0x4f8(%esi),%eax\n push $0x200ac6d3\n ret\n1:\n mov %esp,%eax\n push $4\n push %eax\n call _copy_next_controls\n add $8,%esp\n jmp _substep_exit\n");
void loop_boundary(void);void copy_loop_boundary(unsigned char*s){
 copy_substep(s);memcpy(first_nodes,nodes,sizeof nodes);memcpy(first_parts,parts,sizeof parts);memcpy(first_component,component,sizeof component);memcpy(first_bike,bike,sizeof first_bike);memcpy(first_engine,engine,sizeof first_engine);
 memcpy(first_rider,rider,sizeof rider);memcpy(first_filters,analog_filter,4);memcpy(first_filters+1,acceleration_filter,4);
 impulse_enabled=0;looped=*(int*)(s+0x20)>0;engine_entry_active=looped;engine_random_calls=query_count=0;memset(query_log,0,sizeof query_log);
}
__asm__(".text\n_loop_boundary:\n pushal\n lea 0x50(%esp),%eax\n push %eax\n call _copy_loop_boundary\n add $4,%esp\n popal\n mov 0x50(%esp),%ecx\n add $0x30,%esp\n push $0x200ac952\n ret\n");
void finish_entry(void);
__asm__(".text\n_finish_entry:\n mov 0x20(%esp),%eax\n mov %eax,_finish_output+8\n mov 0x8c8(%esi),%eax\n mov %eax,_finish_output+12\n mov 0x20(%esp),%eax\n dec %eax\n push $0x200ac8a3\n ret\n");
void dispatch_primary_entry(void);void dispatch_state_entry(void);
__asm__(".text\n_dispatch_state_entry:\n mov 0x844(%esi),%ecx\n mov %ecx,_dispatch_prior_state\n mov 0x8b8(%esi),%ecx\n mov %ecx,_dispatch_prior_kind\n mov 0x534(%esi),%ecx\n mov %ecx,_dispatch_prior_angular\n mov 0x8a8(%esi),%ecx\n push $0x200ac821\n ret\n");
__asm__(".text\n_dispatch_primary_entry:\n incl _dispatch_callbacks\n push %ebx\n push %esi\n mov 0xc(%esp),%esi\n push $0x2009e496\n ret\n");
void award_entry(void);
__asm__(".text\n_award_entry:\n movl $1,_award_called\n sub $4,%esp\n push %esi\n mov %ecx,%esi\n push $0x200b1a46\n ret\n");
void join_rider_entry(void);
__asm__(".text\n_join_rider_entry:\n movl $1,_join_called\n mov 4(%esp),%eax\n mov %eax,_join_arguments\n mov 8(%esp),%eax\n mov %eax,_join_arguments+4\n mov 12(%esp),%eax\n mov %eax,_join_arguments+8\n sub $0xac,%esp\n push $0x200aecb6\n ret\n");
void event_decision_exit(void);
__asm__(".text\n_event_decision_exit:\n mov %eax,_event_triggered\n mov %eax,0x844(%esi)\n push $0x200a4bb0\n ret\n");
void frame_entry(void);
__asm__(".text\n_frame_entry:\n sub $0xb8,%esp\n push %eax\n mov _normal_seed,%eax\n mov %eax,0x74(%esp)\n mov _normal_seed+4,%eax\n mov %eax,0x78(%esp)\n mov _normal_seed+8,%eax\n mov %eax,0x7c(%esp)\n mov _normal_seed+12,%eax\n mov %eax,0x98(%esp)\n mov _normal_seed+16,%eax\n mov %eax,0x9c(%esp)\n mov _normal_seed+20,%eax\n mov %eax,0xa0(%esp)\n mov _normal_seed+24,%eax\n mov %eax,0x38(%esp)\n mov _normal_seed+28,%eax\n mov %eax,0x3c(%esp)\n mov _normal_seed+32,%eax\n mov %eax,0x40(%esp)\n mov _normal_seed+36,%eax\n mov %eax,0x44(%esp)\n mov _normal_seed+40,%eax\n mov %eax,0x48(%esp)\n mov _normal_seed+44,%eax\n mov %eax,0x4c(%esp)\n mov _normal_seed+48,%eax\n mov %eax,0x68(%esp)\n mov _normal_seed+52,%eax\n mov %eax,0x6c(%esp)\n mov _normal_seed+56,%eax\n mov %eax,0x70(%esp)\n mov _normal_seed+60,%eax\n mov %eax,0x8c(%esp)\n mov _normal_seed+64,%eax\n mov %eax,0x90(%esp)\n mov _normal_seed+68,%eax\n mov %eax,0x94(%esp)\n pop %eax\n push $0x200a0136\n ret\n");
void observe_contact(void);
__asm__(".text\n_observe_contact:\n mov %eax,_impulse_count\n movl $1,_impulse_enabled\n mov 0x2c(%esp),%ecx\n test %ecx,%ecx\n push $0x200a8de5\n ret\n");
__asm__(".data");
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);{unsigned char*p=(void*)0x200ac17b;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)controls_air-0x200ac17b-5;}{unsigned char*p=(void*)0x200ac5c5;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)controls_ground-0x200ac5c5-5;}{unsigned char*p=(void*)0x200ac64a;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)controls_limited-0x200ac64a-5;}{unsigned char*p=(void*)0x200ac6cd;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)controls_crash-0x200ac6cd-5;}{unsigned char*p=(void*)0x200abd6e;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)normal_redirect_entry-0x200abd6e - 5;}unsigned char*mp=(void*)0x200ab7fd;mp[0]=0xe9;*(uint32_t*)(mp+1)=(uintptr_t)motion_boundary - 0x200ab7fd - 5;unsigned char*tp=(void*)0x200a8be0;tp[0]=0xe9;*(uint32_t*)(tp+1)=(uintptr_t)tires_boundary - 0x200a8be0 - 5;unsigned char*rp=(void*)0x200a6eac;rp[0]=0xe9;*(uint32_t*)(rp+1)=(uintptr_t)response_boundary - 0x200a6eac - 5;unsigned char*cp=(void*)0x200a64dc;cp[0]=0xe9;*(uint32_t*)(cp+1)=(uintptr_t)contact_boundary - 0x200a64dc - 5;unsigned char*done=(void*)0x200ac95a;done[0]=0xe9;*(uint32_t*)(done+1)=(uintptr_t)substep_exit - 0x200ac95a - 5;unsigned char*ob=(void*)0x200a8ddf;ob[0]=0xe9;*(uint32_t*)(ob+1)=(uintptr_t)observe_contact-0x200a8ddf-5;uint32_t exits[]={0x200a4baa};for(int j=0;j<1;j++){unsigned char*exit_patch=(void*)(uintptr_t)exits[j];exit_patch[0]=0xe9;*(uint32_t*)(exit_patch+1)=(uintptr_t)event_decision_exit-exits[j]-5;}unsigned char*fp=(void*)0x200ac89e;fp[0]=0xe9;*(uint32_t*)(fp+1)=(uintptr_t)finish_entry - 0x200ac89e - 5;uint32_t ends[]={0x200ac94b};for(int j=0;j<1;j++){unsigned char*ep=(void*)(uintptr_t)ends[j];ep[0]=0xe9;*(uint32_t*)(ep+1)=(uintptr_t)loop_boundary-ends[j]-5;}
 unsigned char*jp=(void*)0x200aecb0;jp[0]=0xe9;*(uint32_t*)(jp+1)=(uintptr_t)join_rider_entry-0x200aecb0-5;
 unsigned char*ap=(void*)0x200b1a40;ap[0]=0xe9;*(uint32_t*)(ap+1)=(uintptr_t)award_entry-0x200b1a40-5;
 unsigned char*dp=(void*)0x2009e490;dp[0]=0xe9;*(uint32_t*)(dp+1)=(uintptr_t)dispatch_primary_entry-0x2009e490-5;
 dp=(void*)0x200ac81b;dp[0]=0xe9;*(uint32_t*)(dp+1)=(uintptr_t)dispatch_state_entry-0x200ac81b-5;
 ((void (__cdecl *)(void))0x20001640)();((void (__cdecl *)(void))0x20012910)();bind_oracle_kernel_imports();
 if(!((int (__cdecl *)(void))0x200c5230)())fail("CRT heap");
 if(!((int (__cdecl *)(void))0x200c24e0)())fail("CRT thread");
 HMODULE d3drm=LoadLibraryA("d3drm.dll");if(!d3drm)fail("d3drm load");char module_path[MAX_PATH],copy_path[MAX_PATH];if(!GetModuleFileNameA(d3drm,module_path,sizeof module_path))fail("d3drm path");if(snprintf(copy_path,sizeof copy_path,"%s.d3drm.dll",argv[3])>=(int)sizeof copy_path||!CopyFileA(module_path,copy_path,TRUE))fail("copy loaded d3drm");FARPROC rotate=GetProcAddress(d3drm,"D3DRMVectorRotate");if(!rotate)fail("vector rotate");*(FARPROC*)0x201278b8=rotate;
unsigned char*p=(void*)0x200bf190;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)draw_random-0x200bf190-5;
 p=(void*)0x20052670;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)supplied_device-0x20052670-5;
 p=(void*)0x200a5e27;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)engine_entry_exit-0x200a5e27-5;
 ((void (__cdecl *)(void))0x20001720)();((void (__cdecl *)(void))0x2009d650)();((void (__cdecl *)(void))0x2009d620)();
 p=(void*)0x200a0130;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)frame_entry-0x200a0130-5;
 ((void (__cdecl *)(void))0x2009d680)();
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  uint32_t v[1965],r[3133];if(fread(v,sizeof v,1,in)!=1)fail("input");
  memcpy(&loop_component_rate,v+1964,4);memcpy(start_input,v+1902,sizeof start_input);memcpy(bike,v+2,sizeof bike);memcpy(parts,v+820,sizeof parts);memcpy(engine,v+916,sizeof engine);memcpy(effect,v+1040,16);random_value=v[1];random_calls=0;
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
  for(int k=0;k<65;k++){*(void**)(grid_cells[k]+4)=grid_markers[k];*(void**)grid_markers[k]=grid_cells[k];*(int*)(grid_markers[k]+8)=1;}
  for(int k=0;k<4;k++){unsigned char*e=grid_entries[k];*(int*)(e+8)=0;*(int*)(e+12)=(int)g[31+k];*(int*)(e+16)=77+k;*(int*)(e+20)=(int)g[35+k];if(g[35+k]){unsigned char*tail=grid_cells[(int)g[31+k]];while(*(void**)(tail+4))tail=*(void**)(tail+4);*(void**)(tail+4)=e;*(void**)e=tail;}}
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
  *(void**)parts[2]=nodes[(int)((float*)v)[1466]];*(void**)parts[3]=nodes[(int)((float*)v)[1467]];
  contact_input=(float*)(v+1468);*(void**)component=nodes[(int)contact_input[0]];
  balance_input=(float*)(v+1495);memcpy(balance_filter,balance_input,8);put32(0x8f8,(uintptr_t)balance_filter);
  suspension_input=(float*)(v+1524);
  tire_input=(float*)(v+1568);
  impulse_input=(float*)(v+1626);impulse_count=(int)impulse_input[13];impulse_enabled=0;
  integration_input=(float*)(v+1651);
  motion_input=(float*)(v+1714);alignment_input=(float*)(v+1717);
  event_input=(float*)(v+1721);event_triggered=event_input_calls=0;put32(0x6e4,event_input[0]?(uintptr_t)bike:0);*(int*)(terrain+0x954)=(int)event_input[2];
  rider_input=(float*)(v+1726);memset(rider,0,sizeof rider);
  memcpy(rider+0x58,rider_input,12);memcpy(rider+0x70,rider_input+3,24);
  *(int*)(rider+0x13c)=(int)rider_input[9];*(int*)(rider+0x140)=(int)rider_input[10];
  for(int j=0;j<5;j++)*(int*)(rider+0x160+j*4)=(int)rider_input[11+j];
  for(int k=0;k<8;k++)for(int g=0;g<3;g++)for(int j=0;j<6;j++)*(int*)(rider+0x174+k*0x5c+g*0x18+j*4)=(int)rider_input[19+k*18+g*6+j];
  put32(0x874,(uintptr_t)rider);
  join_called=0;memcpy(join_arguments,v+1889,12);
  memcpy(component+0x48,v+1892,4);
  award_called=0;
  float*dv=(float*)(v+1893);dispatch_callbacks=0;dispatch_prior_state=dispatch_prior_kind=0xffffffff;dispatch_prior_angular=0;
  memset(dispatch_wall,0,sizeof dispatch_wall);memset(dispatch_owner,0,sizeof dispatch_owner);memset(dispatch_audio,0,sizeof dispatch_audio);memset(dispatch_audio_world,0,sizeof dispatch_audio_world);
  *(int*)(grid_object+0xc8)=(int)dv[0];*(void**)(grid_object+0x94)=bike;*(void**)(grid_object+0x108)=(void*)0x2009e490;
  float radius=*(float*)(grid_object+0x5c);*(float*)(grid_object+0x60)=radius*radius;for(int k=0;k<3;k++)*(float*)(grid_object+0x64+k*4)=radius;
  *(int*)0x200e3758=(int)dv[1];for(int k=0;k<4;k++)*(int*)(grid_manager+0xf8+((k/2)*60+k%2)*4)=(int)dv[2];
  *(int*)dispatch_wall=1;memcpy(dispatch_wall+4,dv+3,12);memcpy(dispatch_wall+16,dv+6,12);*(int*)(dispatch_wall+0xf4)=3;*(int*)(dispatch_wall+0x104)=2;*(int*)(dispatch_wall+0xc8)=1;
  *(void**)(grid_manager+8)=grid_object;*(void**)(grid_manager+12)=dispatch_wall;
  for(int k=0;k<12;k++)*(float*)(grid_manager+0x3950+k*4)=1000+k;
  *(void**)(context+0x4c)=grid_manager;put32(0x41c,(uintptr_t)dispatch_owner);*(void**)(dispatch_owner+0x3c)=dispatch_audio;*(void**)(dispatch_audio+0x3c)=dispatch_audio_world;
  *(void**)normal_forward=*(void**)(bike+0x434);put32(0x8d8,(uintptr_t)normal_forward);run_substep();memcpy(rider,first_rider,sizeof rider);put32(0x8d8,v[2+0x8d8/4]);memcpy(nodes,first_nodes,sizeof nodes);memcpy(parts,first_parts,sizeof parts);memcpy(component,first_component,sizeof component);memcpy(bike,first_bike,sizeof first_bike);put32(0x8d8,v[2+0x8d8/4]);memcpy(engine,first_engine,sizeof first_engine);memcpy(engine,v+916,8);put32(0x8fc,v[2+0x8fc/4]);put32(0x41c,v[2+0x41c/4]);put32(0x874,v[2+0x874/4]);put32(0x6e4,v[2+0x6e4/4]);put32(0x8f8,v[2+0x8f8/4]);put32(0xc84,v[2+0xc84/4]);
  put32(0xc88,v[2+0xc88/4]);put32(0xc8c,v[2+0xc8c/4]);
  put32(0,v[2]);put32(0x23c,v[2+0x23c/4]);put32(0x234,v[2+0x234/4]);
  memcpy(parts[2],v+868,4);memcpy(parts[3],v+892,4);
  memcpy(parts[0],v+820,4);memcpy(parts[1],v+844,4);put32(0x8f4,v[2+0x8f4/4]);
  put32(0xcc4,v[2+0xcc4/4]);put32(0x434,v[2+0x434/4]);put32(0x8ec,v[2+0x8ec/4]);
  for(int j=0;j<6;j++)put32(offsets[j],v[2+offsets[j]/4]);
  memcpy(r,bike,sizeof bike);memcpy(r+818,parts,sizeof parts);memcpy(r+914,engine,sizeof engine);memcpy(r+1038,effect,16);r[1042]=random_calls;for(int j=0;j<4;j++){memcpy(r+1043+j*33,nodes[j]+0x84,128);memcpy(r+1043+j*33+32,nodes[j]+0x104,4);}memcpy(r+1175,component+0x44,4);memcpy(r+1176,points,sizeof points);memcpy(r+1206,heights,8);
  for(int j=0;j<3;j++)memcpy(r+1208+j*9,bound_records[j]+8,36);
  memcpy(r+1235,grid_object+0x1c,64);memcpy(r+1251,grid_object+0x88,4);if(*(void**)(grid_object+0x88)==dispatch_wall)r[1251]=1;memcpy(r+1252,grid_object+0x7c,12);
  for(int k=0;k<4;k++){unsigned char*e=grid_entries[k];r[1255+k*6]=token(*(void**)e);r[1256+k*6]=token(*(void**)(e+4));memcpy(r+1257+k*6,e+8,16);}
  for(int k=0;k<65;k++){r[1279+k*3]=token(*(void**)(grid_cells[k]+4));r[1280+k*3]=token(*(void**)grid_markers[k]);r[1281+k*3]=token(*(void**)(grid_markers[k]+4));}
  memcpy(r+1474,pose,24);memcpy(r+1480,control_output,16);
  for(int j=0;j<4;j++){memcpy(r+1484+j*4,others[j]+0x4f8,12);memcpy(r+1487+j*4,others[j]+0xc30,4);}
  for(int j=0;j<2;j++){memcpy(r+1500+j*33,target_nodes[j]+0x84,128);memcpy(r+1532+j*33,target_nodes[j]+0x104,4);}
  memcpy(r+1566,contact_output,sizeof contact_output);memcpy(r+1608,balance_output,sizeof balance_output);memcpy(r+1636,suspension_output,sizeof suspension_output);memcpy(r+1680,tire_output,sizeof tire_output);memcpy(r+1738,impulse_output,sizeof impulse_output);memcpy(r+1763,integration_output,sizeof integration_output);memcpy(r+1826,motion_output,sizeof motion_output);memcpy(r+1829,alignment_output,sizeof alignment_output);
  r[1832]=event_triggered;r[1833]=event_input_calls;r[1834]=random_calls-1;
  memcpy(r+1835,rider+0x58,12);memcpy(r+1838,rider+0x70,24);memcpy(r+1844,rider+0x13c,8);memcpy(r+1846,rider+0x160,20);
  r[1851]=join_called;memcpy(r+1852,join_arguments,12);
  r[1855]=award_called;
  r[1856]=dispatch_callbacks;r[1857]=dispatch_prior_state;
  for(int k=0;k<4;k++)memcpy(r+1858+k,grid_manager+0xf8+((k/2)*60+k%2)*4,4);
  memcpy(r+1862,grid_manager+0x394c,52);memcpy(r+1875,grid_object+0xcc,36);memcpy(r+1884,dispatch_wall+0xcc,36);
  r[1893]=*(void**)(dispatch_wall+0x88)==grid_object;r[1894]=*(void**)(grid_manager+0x3980)==grid_object;r[1895]=*(void**)(grid_manager+0x3984)==dispatch_wall;
  r[1896]=dispatch_prior_kind;r[1897]=dispatch_prior_angular;
  memcpy(r+1898,finish_output,sizeof finish_output);
  memcpy(r+1902,start_output,sizeof start_output);memcpy(r+1935,first_filters,8);r[1937]=looped;memcpy(r+1938,next_output,sizeof next_output);
  memcpy(r+1971,contact_next,sizeof contact_next);
  memcpy(r+2156,response_next,sizeof response_next);
  memcpy(r+2358,tires_next,sizeof tires_next);
  memcpy(r+2690,motion_next,sizeof motion_next);memcpy(r+2963,controls_next,sizeof controls_next);
  if(fwrite(r,sizeof r,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
