#define main unused_helper_main
#include "oracle.c"
#undef main
#include "oracle-imports.h"
#include <math.h>
#include <setjmp.h>
unsigned char parts[4][0x60],engine[0x1f0],effect[16];uint32_t random_value,random_calls;
unsigned char rider[0x500];float*rider_input;float*event_input;uint32_t event_triggered,event_input_calls;
unsigned char first_bound_records[3][0x30];
unsigned char trick_frames[32][32][0x34];
unsigned char near_records[2][0x70],near_frames[2][0x34];
uint32_t third_response[202],third_tires[332],third_motion[273],third_controls[170],third_event[188],third_rider[175],third_finished[498],third_event_base[2],third_nearby[11];
float next_frame_delta;uint32_t next_entry_output[151];volatile int next_stage;uint32_t next_recovery_output[228],next_steering_output[20],next_input_output[20],input_parameters[7];unsigned char input_device[0x60];
float raw_frame_delta;uint32_t frame_return_input[3],frame_return_output[143];
unsigned char return_manager[0x24],return_scene[0x1f8];
unsigned char pose_records[21][0x78],pose_frames[21][8][0x34],pose_children[21][8][0x30],trick_children[32][32][0x30];
uint32_t frame_rider_output[56+132+11+21*8*9+32*32*9+27];
float frame_input[3],frame_filter[2];uint32_t post_filter[147],rider_entry_words[56];
uint32_t saved_third[2068];
uint32_t third_looped,third_output[33],third_contact[185];
float start_input[62],analog_filter[2],acceleration_filter[2];uint32_t finished_next[498],first_finish[4],first_dispatch[4],first_award;unsigned char first_grid_object[0x110],first_grid_manager[0x3988],first_grid_cells[65][0x18],first_grid_markers[65][0x18],first_grid_entries[4][0x18],first_wall[0x110];uint32_t rider_next[175],rider_queries[3],rider_query_count,trick_selected;float*loop_rider_input;unsigned char trick_records[32][0x78];uint32_t event_next[188],first_event[7];unsigned char first_effect[16];uint32_t controls_next[170],normal_redirected;unsigned char normal_forward[4],first_rider[0x500];uint32_t motion_next[273];uint32_t tires_next[332];uint32_t response_next[202];uint32_t contact_next[185];float loop_component_rate;unsigned char first_nodes[4][0x114],first_parts[4][0x60],first_component[0x60];uint32_t next_output[33],looped,entry_count,first_bike[818],first_engine[124],first_filters[2];uint32_t start_output[33],query_count,query_log[12],engine_random_calls,engine_entry_active;
unsigned char controller[0x28],device[4];
int __attribute__((thiscall)) supplied_device(void*self,int action,int option,int extra){
 (void)self;if(option||extra)fail("device options");
 if(action==9||action==6||action==7){if(rider_query_count>=3)fail("rider query count");rider_queries[rider_query_count++]=action;return (int)loop_rider_input[action==9?0:action==6?1:2];}
 if(action==8){event_input_calls++;return (int)event_input[1];}
 if((action!=4&&action!=5)||query_count>=12)fail("query");
 query_log[query_count++]=action;return (int)start_input[action==5?58:59];
}
uint32_t next_contact_output[267],next_contact_random_calls;
uint32_t next_response_output[202],next_tires_output[332],next_motion_output[273],next_controls_output[170],next_event_output[188],next_event_active,next_event_random_calls,next_event_input_base;
static jmp_buf next_contact_abort;static uint32_t cycle_history[128][8],cycle_count;
int __cdecl draw_random(void){
 if(engine_entry_active){engine_random_calls++;return (int)start_input[57];}
 if(next_stage==2&&next_event_active){unsigned index=next_event_random_calls++;if(get32(0xc40)){if(index<2)return (int)event_input[3+index];index-=2;}if(index>=3)fail("next event random overflow");return (int)rider_input[16+index];}
 if(next_stage==2){next_contact_random_calls++;return (int)random_value;}
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
unsigned char settings[0x1300],context[0x18c0],others[4][0xcc8],observer[0x84],target_manager[0x8c],targets[2][0x34],target_nodes[2][0x114];
void*primary[8],*secondary[8];float*selection;float*contact_input;float*balance_input;float*suspension_input;float*tire_input;float*impulse_input;float*integration_input;float*alignment_input;uint32_t alignment_output[3],finish_output[4];float*motion_input;uint32_t motion_output[3];uint32_t integration_output[63];uint32_t impulse_output[25],impulse_count,impulse_enabled;uint32_t tire_output[58];uint32_t suspension_output[44];float balance_filter[2];uint32_t balance_output[28];uint32_t control_output[4],contact_output[42];
unsigned point_offsets[10]={0x504,0x510,0x324,0x348,0x300,0x2e8,0x2dc,0x30c,0x7ec,0x4f8};
uint32_t token(void*p){if(!p)return 0;for(int i=0;i<65;i++){if(p==grid_cells[i])return 1000+i;if(p==grid_markers[i])return 2000+i;}for(int i=0;i<4;i++)if(p==grid_entries[i])return i+1;fail("unknown pointer");return 0;}
void setup_start(unsigned char*s){float*v=start_input;memset(controller,0,sizeof controller);query_count=engine_random_calls=0;engine_entry_active=1;entry_count=looped=third_looped=0;memset(saved_third,0,sizeof saved_third);memset(third_nearby,0,sizeof third_nearby);memset(third_response,0,sizeof third_response);memset(third_tires,0,sizeof third_tires);memset(third_motion,0,sizeof third_motion);memset(third_controls,0,sizeof third_controls);memset(third_event,0,sizeof third_event);memset(third_rider,0,sizeof third_rider);memset(third_finished,0,sizeof third_finished);memset(third_output,0,sizeof third_output);memset(third_contact,0,sizeof third_contact);memset(next_output,0,sizeof next_output);memset(contact_next,0,sizeof contact_next);memset(response_next,0,sizeof response_next);memset(tires_next,0,sizeof tires_next);memset(motion_next,0,sizeof motion_next);memset(controls_next,0,sizeof controls_next);memset(event_next,0,sizeof event_next);memset(rider_next,0,sizeof rider_next);memset(finished_next,0,sizeof finished_next);memset(rider_queries,0,sizeof rider_queries);rider_query_count=trick_selected=0;normal_redirected=0;memset(query_log,0,sizeof query_log);
 memcpy(s+0xbfc,&raw_frame_delta,4);memcpy(s+0x64,frame_input,4);memcpy(frame_filter,frame_input+1,8);put32(0x900,(uintptr_t)frame_filter);put32(0xc90,0);memset(post_filter,0,sizeof post_filter);
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
 uint32_t*saved=start_output;uint32_t*start_output=entry_count>=2?third_output:entry_count?next_output:saved;entry_count++;
 memcpy(start_output,engine+0x168,4);memcpy(start_output+1,engine+0x150,4);memcpy(start_output+2,engine+0x160,4);memcpy(start_output+3,engine+0x15c,4);memcpy(start_output+4,engine+0x7c,4);memcpy(start_output+5,engine+0x154,4);memcpy(start_output+6,engine+0x158,4);memcpy(start_output+7,analog_filter,4);
 int offsets[]={0x5e4,0x558,0x55c,0x694,0x564,0x510,0x514,0x518,0x848,0x84c};for(int k=0;k<10;k++)memcpy(start_output+8+k,bike+offsets[k],4);memcpy(start_output+18,acceleration_filter,4);start_output[19]=engine_random_calls;start_output[20]=query_count;memcpy(start_output+21,query_log,sizeof query_log);
}
void copy_next_engine(unsigned char*s);void next_contact_before(unsigned char*s);
void engine_entry_exit(void);
__asm__(".text\n_engine_entry_exit:\n cmpl $2,_next_stage\n jne 1f\n pushal\n lea 32(%esp),%eax\n push %eax\n call _copy_next_engine\n call _next_contact_before\n add $4,%esp\n popal\n mov 0x8e4(%esi),%ecx\n push $0x200a5e2d\n ret\n1:\n call _copy_start\n  mov 0x8e4(%esi),%ecx\n push $0x200a5e2d\n ret\n");
uintptr_t retained_stack_base;
void setup_substep(unsigned char*s){
 retained_stack_base=(uintptr_t)s;
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
void start_next_frame(void){next_stage=1;next_entry_output[6]=get32(0x8c8);}
void run_substep(void);void substep_exit(void);void frame_return(void);
__asm__(".text\n_run_substep:\n push %ebp\n push %ebx\n push %esi\n push %edi\n sub $0xc00,%esp\n mov %esp,%eax\n push %eax\n call _setup_substep\n add $4,%esp\n movl $_frame_return,0xbf8(%esp)\n mov $_bike,%esi\n lea 0x54c(%esi),%edi\n mov $0x200a5bd7,%eax\n jmp *%eax\n_frame_return:\n call _copy_frame_return\n call _start_next_frame\n push _next_frame_delta\n mov $_bike,%ecx\n mov $0x200a52c0,%eax\n call *%eax\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n_substep_exit:\n add $0xc00,%esp\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n");
void copy_post_entry(void){post_filter[143]=get32(0x854);memcpy(post_filter+144,frame_filter,4);post_filter[145]=get32(0x850);post_filter[146]=get32(0x8c0);}
void copy_rider_entry(void){
 const int fields[]={0x844,0x710,0x714,0xbfc,0x614,0x618,0x724,0x72c,0x820,0x824,0x814,
  0x728,0x730,0x734,0x848,0x818,0x81c,0x82c,0x830,0x834,0x4e0,0x828};
 uint32_t*r=rider_entry_words;
 for(int k=0;k<22;k++)r[k]=get32(fields[k]);
 memcpy(r+22,bike+0x4f8,12);memcpy(r+25,bike+0x54c,12);memcpy(r+28,bike+0x540,12);memcpy(r+31,component+0x44,4);
 const int animation_fields[]={4,0x10,0x14,0x30,0x2c};
 for(int k=0;k<5;k++){r[32+k]=get32(animation_fields[k]);memcpy(r+37+k,proxy+animation_fields[k],4);}
 for(int k=0;k<16;k++){
  if(get32(0x10)==(uintptr_t)trick_records[k])r[33]=k+1;
  if(*(uintptr_t*)(proxy+0x10)==(uintptr_t)trick_records[16+k])r[38]=k+1;
  if(get32(0x14)==(uintptr_t)trick_frames[k])r[34]=*(uint32_t*)trick_frames[k][0];
  if(*(uintptr_t*)(proxy+0x14)==(uintptr_t)trick_frames[16+k])r[39]=*(uint32_t*)trick_frames[16+k][0];
 }
 if(get32(0x10)==(uintptr_t)near_records[0]){r[33]=17;r[34]=1;}
 if(*(uintptr_t*)(proxy+0x10)==(uintptr_t)near_records[1]){r[38]=17;r[39]=1;}
 for(int k=0;k<21;k++){if(get32(0x10)==(uintptr_t)pose_records[k])r[33]=100+k;if(*(uintptr_t*)(proxy+0x10)==(uintptr_t)pose_records[k])r[38]=100+k;}
 if(get32(0x14))r[34]=*(uint32_t*)(uintptr_t)get32(0x14);
 if(*(uintptr_t*)(proxy+0x14))r[39]=*(uint32_t*)*(uintptr_t*)(proxy+0x14);
 if(get32(0x10)==(uintptr_t)near_records[0])r[34]=1;
 if(*(uintptr_t*)(proxy+0x10)==(uintptr_t)near_records[1])r[39]=1;
 memcpy(r+42,bike+0x218,24);memcpy(r+48,proxy+0x218,24);r[54]=get32(8);memcpy(r+55,proxy+8,4);
}
void copy_post_filter(unsigned char*s){
 copy_rider_entry();
 post_filter[0]=get32(0x8c0);memcpy(post_filter+1,bike+0x540,12);memcpy(post_filter+4,s+0x1d4,4);memcpy(post_filter+5,bike+0x850,8);memcpy(post_filter+7,frame_filter,8);memcpy(post_filter+9,s+0x64,4);post_filter[10]=entry_count;
 for(int j=0;j<4;j++){memcpy(post_filter+11+j*33,nodes[j]+0x84,128);memcpy(post_filter+43+j*33,nodes[j]+0x104,4);}
}
void copy_next_frame_entry(unsigned char*s){
 if((uintptr_t)s!=retained_stack_base)fail("consecutive frame stack base changed");
 next_stage=2;next_recovery_output[223]=get32(0xbfc);next_recovery_output[224]=get32(0x820);uint32_t*r=next_entry_output;
 memcpy(r,s+0x20,4);memcpy(r+1,s+0x10,4);memcpy(r+2,s+0x48,4);memcpy(r+3,s+0x64,4);
 r[4]=get32(0x8c8);r[5]=get32(0x568);memcpy(r+7,&next_frame_delta,4);r[8]=get32(0x8cc);r[9]=get32(0x8d4);
 memcpy(r+10,s+0x1c,4);memcpy(r+11,s+0x30,4);memcpy(r+12,s+0x2c,4);
 memcpy(r+13,bike+0x4f8,12);memcpy(r+16,bike+0x56c,12);
 for(int k=0;k<4;k++){memcpy(r+19+k*33,nodes[k]+0x84,128);memcpy(r+51+k*33,nodes[k]+0x104,4);}
}
void next_frame_entry_exit(void);
__asm__(".text\n_next_frame_entry_exit:\n pushal\n lea 32(%esp),%eax\n push %eax\n call _copy_next_frame_entry\n add $4,%esp\n popal\n cmp $3,%ax\n je 1f\n cmp $2,%ax\n je 1f\n push $0x200a556e\n ret\n1:\n push $0x200a5578\n ret\n");
void copy_next_recovery(unsigned char*s){
 copy_rider_entry();memcpy(next_recovery_output,rider_entry_words,sizeof rider_entry_words);
 uint32_t*r=next_recovery_output+56;
 for(int j=0;j<4;j++){memcpy(r,nodes[j]+0x84,128);memcpy(r+32,nodes[j]+0x104,4);r+=33;}
 for(int j=0;j<2;j++){
  unsigned char*o=j?proxy:bike;
  const int fields[]={0x18,0x1c};for(int k=0;k<2;k++)*r++=*(uint32_t*)*(uintptr_t*)(o+fields[k]);
  memcpy(r,o+0x24,8);r+=2;
 }
 for(int a=0;a<3;a++){memcpy(r,bound_records[a]+8,36);r+=9;}
 next_recovery_output[225]=get32(0xbf8);next_recovery_output[226]=(int)*(short*)(settings+0x1072);memcpy(next_recovery_output+227,s+0x28,4);
}
void capture_input_before(void){next_input_output[16]=get32(0x710);next_input_output[17]=get32(0x714);memcpy(next_input_output+18,proxy+4,4);next_input_output[19]=get32(0x814);}
void copy_next_input(unsigned char*s,int branch){
 next_input_output[0]=branch;
 const int fields[]={0x844,0x710,0x714,0x614,0xc68,0x6f8,0xb6c,0xb04,0xb08,0x6ec,0x6e8,0x6f4,0x6f0};
 for(int k=0;k<13;k++)next_input_output[1+k]=get32(fields[k]);
 memcpy(next_input_output+14,s+0xc4,4);memcpy(next_input_output+15,s+0xbfc,4);
}
void input_player_exit(void);void input_ai_exit(void);void input_scripted_exit(void);void input_crash_exit(void);
void steering_before(void){next_steering_output[15]=get32(0x700);}
void copy_next_steering(unsigned char*s){
 uint32_t*r=next_steering_output;r[0]=1;r[1]=get32(0x844)?0:1;r[2]=get32(0x724);memcpy(r+3,component+0x48,4);memcpy(r+4,component+0x44,4);r[5]=get32(0x564);r[6]=get32(0x5ec);r[7]=get32(0x6f4);
 if(r[1])memcpy(r+8,s+0x1d0,4);else r[8]=0;
 memcpy(r+9,s+0x28,4);memcpy(r+10,s+0x20,4);memcpy(r+11,s+0x10,4);r[12]=get32(0x8c8);memcpy(r+13,s+0xbfc,4);memcpy(r+14,s+0x190,4);r[16]=get32(0x700);r[17]=get32(0x848);r[18]=get32(0x73c);
 if((int32_t)r[17]>0x41c80000&&(r[13]&0x7fffffff)&&(int32_t)r[18]>0x41f00000)memcpy(r+19,s+0x1cc,4);else r[19]=0;
}
uint32_t next_reset_output[155];int reset_queries,reset_cleanups,reset_pressed_value;
int __attribute__((thiscall)) reset_pressed(void*self,int action,int option,int extra){(void)self;if(action!=15||option||extra)fail("reset query");reset_queries++;return reset_pressed_value;}
void reset_cleanup_hook(void);
__asm__(".text\n_reset_cleanup_hook:\n incl _reset_cleanups\n push %ebx\n push %esi\n mov %ecx,%esi\n mov 0x34(%ecx),%ecx\n push $0x2000fbb7\n ret\n");
void reset_before(void){uint32_t*r=next_reset_output;r[0]=1;memcpy(r+1,rider+0x154,4);memcpy(r+2,rider+0xf8,4);memcpy(r+3,rider+0x138,4);memcpy(r+4,rider+0x144,4);reset_queries=reset_cleanups=0;}
void reset_after(int code){uint32_t*r=next_reset_output;r[5]=code;r[6]=get32(0x844);r[7]=get32(0x8b0);r[8]=get32(0x884);r[9]=get32(0xc40);memcpy(r+10,bike+0x4f8,12);
 const int fields[]={0x154,0xf8,0x138,0x13c,0x140,0x144,0x16c};for(int k=0;k<7;k++)memcpy(r+13+k,rider+fields[k],4);r[20]=reset_queries;r[21]=reset_cleanups;
 for(int k=0;k<4;k++){memcpy(r+23+k*33,nodes[k]+0x84,128);memcpy(r+55+k*33,nodes[k]+0x104,4);}}
uint32_t next_terrain_output[161];
void copy_next_terrain(unsigned char*s){uint32_t*r=next_terrain_output;r[0]=1;r[2]=*(uint32_t*)(s+0x1c);r[3]=*(uint32_t*)(s+0x30);r[4]=*(uint32_t*)(s+0x2c);r[5]=get32(0x8c4);memcpy(r+6,s+0x20,4);r[7]=get32(0x4d8);memcpy(r+8,s+0x8c,4);
 if(!r[8]&&!get32(0x844)&&r[6]!=1&&fabsf(value(r[7]))>0.2618f){r[1]=r[2]==1?2:3;const int fields[]={0x36c,0x3e4,0x2a0,0x2c4,0x4b0,0x6d8};for(int k=0;k<6;k++)memcpy(r+9+k*3,s+fields[k],12);memcpy(r+27,s+0xbc,4);memcpy(r+28,s+0x194,4);}
 for(int k=0;k<4;k++){memcpy(r+29+k*33,nodes[k]+0x84,128);memcpy(r+61+k*33,nodes[k]+0x104,4);}}
uint32_t next_engine_output[52];
void next_engine_before(unsigned char*s){uint32_t*r=next_engine_output;r[0]=*(int*)(s+0x20)>0?2:1;memcpy(r+1,s+0x20,4);memcpy(r+2,s+0x10,4);memcpy(r+3,s+0x48,4);memcpy(r+4,s+0xc4,4);memcpy(r+5,s+0x1c,4);memcpy(r+6,s+0x30,4);memcpy(r+7,s+0x2c,4);memcpy(r+8,s+0x8c,4);engine_entry_active=1;engine_random_calls=query_count=0;memset(query_log,0,sizeof query_log);if(r[0]==1)next_contact_output[0]=1;}
void copy_next_engine(unsigned char*s){uint32_t*r=next_engine_output+9;
 const int fields[]={0x168,0x150,0x160,0x15c,0x7c,0x154,0x158};for(int k=0;k<7;k++)memcpy(r+k,engine+fields[k],4);memcpy(r+7,analog_filter,4);
 const int offsets[]={0x5e4,0x558,0x55c,0x694,0x564,0x510,0x514,0x518,0x848,0x84c};for(int k=0;k<10;k++)r[8+k]=get32(offsets[k]);memcpy(r+18,acceleration_filter,4);r[19]=engine_random_calls;r[20]=query_count;memcpy(r+21,query_log,sizeof query_log);
 memcpy(r+33,s+0x360,12);const int scratch[]={0x44,0x74,0x58,0x134,0x254,0xc8,0xcc};for(int k=0;k<7;k++)memcpy(r+36+k,s+scratch[k],4);engine_entry_active=0;
}
void next_terrain_exit(void);
__asm__(".text\n_next_terrain_exit:\n movl $0,0x8c4(%esi)\n cmpl $2,_next_stage\n je 1f\n push $0x200a5bc5\n ret\n1:\n pushal\n lea 32(%esp),%eax\n push %eax\n call _copy_next_terrain\n call _next_engine_before\n add $4,%esp\n popal\n cmpl $0,0x20(%esp)\n jle _input_epilogue\n lea 0x54c(%esi),%edi\n push $0x200a5bd7\n ret\n");
void next_steering_exit(void);
__asm__(".text\n_input_player_exit:\n pushal\n lea 32(%esp),%eax\n push $1\n push %eax\n call _copy_next_input\n add $8,%esp\n call _steering_before\n popal\n mov 0x724(%esi),%eax\n push $0x200a57c6\n ret\n_input_crash_exit:\n pushal\n cmpl $0,0x844(%esi)\n je 1f\n lea 32(%esp),%eax\n push $0\n push %eax\n call _copy_next_input\n add $8,%esp\n call _steering_before\n1:\n popal\n movl $0,0x190(%esp)\n push $0x200a58d3\n ret\n_input_ai_exit:\n mov $2,%eax\n jmp _input_exit\n_input_scripted_exit:\n mov $3,%eax\n_input_exit:\n mov %esp,%edx\n push %eax\n push %edx\n call _copy_next_input\n add $8,%esp\n jmp _input_epilogue\n_next_steering_exit:\n pushal\n lea 36(%esp),%eax\n push %eax\n call _copy_next_steering\n add $4,%esp\n call _reset_before\n popal\n mov $0x200b0610,%eax\n call *%eax\n mov %eax,0x8c(%esp)\n pushal\n push %eax\n call _reset_after\n add $4,%esp\n popal\n push $0x200a599f\n ret\n_input_epilogue:\n pop %ebp\n pop %edi\n pop %esi\n pop %ebx\n add $0xbe8,%esp\n ret $4\n");

void next_recovery_exit(void);
__asm__(".text\n_next_recovery_exit:\n pushal\n lea 32(%esp),%eax\n push %eax\n call _copy_next_recovery\n add $4,%esp\n call _capture_input_before\n popal\n mov 0x844(%esi),%eax\n push $0x200a5678\n ret\n");

void copy_frame_return(void){
 uint32_t*r=frame_return_output;r[0]=get32(0x568);memcpy(r+1,bike+0x56c,12);
 for(int k=0;k<4;k++){memcpy(r+4+k*33,nodes[k]+0x84,128);memcpy(r+36+k*33,nodes[k]+0x104,4);}
 r[142]=1;
}
void copy_frame_rider(void){
 memcpy(frame_return_output+136,bike+0x56c,12);memcpy(frame_return_output+139,bike+0x4f8,12);
 copy_rider_entry();memcpy(frame_rider_output,rider_entry_words,sizeof rider_entry_words);
 uint32_t*r=frame_rider_output+56;
 for(int j=0;j<4;j++){memcpy(r,nodes[j]+0x84,128);memcpy(r+32,nodes[j]+0x104,4);r+=33;}
 for(int j=0;j<2;j++){
  unsigned char*o=j?proxy:bike;
  const int fields[]={0x18,0x1c};for(int k=0;k<2;k++)*r++=*(uint32_t*)*(uintptr_t*)(o+fields[k]);
  memcpy(r,o+0x24,8);r+=2;
 }
 *r++=rider_query_count;*r++=rider_query_count>0?rider_queries[0]:0;*r++=rider_query_count>1?rider_queries[1]:0;
 for(int a=0;a<21;a++)for(int b=0;b<8;b++){memcpy(r,pose_children[a][b]+8,36);r+=9;}
 for(int a=0;a<32;a++)for(int b=0;b<32;b++){memcpy(r,trick_children[a][b]+8,36);r+=9;}
 for(int a=0;a<3;a++){memcpy(r,bound_records[a]+8,36);r+=9;}
}
void post_loop_entry(void);void post_filter_exit(void);
__asm__(".text\n_post_loop_entry:\n pushal\n call _copy_post_entry\n popal\n xor %edi,%edi\n mov 0xc90(%esi),%eax\n push $0x200ac962\n ret\n_post_filter_exit:\n pushal\n lea 36(%esp),%eax\n push %eax\n call _copy_post_filter\n add $4,%esp\n movl $0,_rider_query_count\n popal\n mov $0x200af710,%eax\n call *%eax\n pushal\n call _copy_frame_rider\n popal\n push $0x200ad07f\n ret\n");
void next_contact_before(unsigned char*s){next_contact_output[0]=*(uint32_t*)(s+0x8c)?3:2;memcpy(next_contact_output+1,s+0x8c,4);next_contact_random_calls=0;cycle_count=0;}
void observe_reset_cycle(unsigned char*s){
 if(next_stage!=2)return;
 uint32_t key[8];memcpy(key,bike+0x4f8,12);memcpy(key+3,*(void**)(s+0x3c),12);void*nearest=*(void**)(s+0x30);key[6]=0xffffffff;for(int j=0;j<4;j++)if(nearest==others[j])key[6]=j+1;key[7]=get32(0x88c);
 for(unsigned j=0;j<cycle_count&&j<128;j++)if(!memcmp(key,cycle_history[j],sizeof key)){uint32_t reason=next_contact_output[1];memset(next_contact_output,0,sizeof next_contact_output);next_contact_output[0]=4;next_contact_output[1]=reason;memcpy(next_contact_output+8,key,sizeof key);longjmp(next_contact_abort,1);}
 memcpy(cycle_history[cycle_count++%128],key,sizeof key);
}
void observe_reset_cycle_other(unsigned char*s){unsigned char frame[0x40];memset(frame,0,sizeof frame);memcpy(frame+0x3c,s+0x34,4);memcpy(frame+0x30,s+0x28,4);observe_reset_cycle(frame);}
void reset_cycle_hook_other(void);
__asm__(".text\n_reset_cycle_hook_other:\n pushal\n lea 32(%esp),%eax\n push %eax\n call _observe_reset_cycle_other\n add $4,%esp\n popal\n lea 0x10(%esp),%ecx\n push %ecx\n push $0x200aebbb\n ret\n");
void reset_cycle_hook(void);
__asm__(".text\n_reset_cycle_hook:\n pushal\n lea 32(%esp),%eax\n push %eax\n call _observe_reset_cycle\n add $4,%esp\n popal\n lea 0x1c(%esp),%ecx\n movl $0,0x1c(%esp)\n push $0x200add15\n ret\n");
void copy_frame_contact(unsigned char*s){uint32_t*r=next_contact_output;r[2]=*(uint32_t*)(s+0x8c);r[3]=next_contact_random_calls;memcpy(r+4,s+0x1c,4);memcpy(r+5,s+0x30,4);memcpy(r+6,s+0x2c,4);memcpy(r+7,s+0x28,4);r+=8;
 memcpy(r,bike+0x504,12);for(int j=0;j<10;j++)memcpy(r+3+j*3,s+point_offsets[j],12);memcpy(r+33,bike+0x590,8);memcpy(r+35,bike+0x578,24);memcpy(r+41,bike+0x54c,12);memcpy(r+44,bike+0x540,12);r[47]=get32(0x6b0);memcpy(r+48,component+0x44,4);r[49]=get32(0x888);r[50]=get32(0x8ac);
 for(int j=0;j<4;j++){memcpy(r+51+j*33,nodes[j]+0x84,128);memcpy(r+83+j*33,nodes[j]+0x104,4);}memcpy(r+183,parts[2]+0x44,4);memcpy(r+184,parts[3]+0x44,4);r+=185;
 const int fields[]={0x844,0x88c,0x8c0,0xcb4,0x814,0x8ac};for(int j=0;j<6;j++)*r++=get32(fields[j]);
 const int vectors[]={0x4f8,0x56c,0x4c0,0x4cc,0x510,0x51c,0x534,0x528,0x654,0x624};for(int j=0;j<10;j++){memcpy(r,bike+vectors[j],12);r+=3;}
 const int ef[]={0x150,0x158,0x160,0x15c,0x7c,0x168,0x154};for(int j=0;j<7;j++){memcpy(r,engine+ef[j],4);r++;}memcpy(r,effect,16);r+=4;for(int j=0;j<3;j++){memcpy(r,bound_records[j]+8,36);r+=9;}
}
void contact_boundary(void);void copy_next_contact(unsigned char*s){
 uint32_t*r=entry_count>=3?third_contact:contact_next;memcpy(r,bike+0x504,12);
 for(int j=0;j<10;j++)memcpy(r+3+j*3,s+point_offsets[j],12);
 memcpy(r+33,bike+0x590,8);memcpy(r+35,bike+0x578,24);memcpy(r+41,bike+0x54c,12);memcpy(r+44,bike+0x540,12);
 memcpy(r+47,bike+0x6b0,4);memcpy(r+48,component+0x44,4);memcpy(r+49,bike+0x888,4);memcpy(r+50,bike+0x8ac,4);
 for(int j=0;j<4;j++){memcpy(r+51+j*33,nodes[j]+0x84,128);memcpy(r+83+j*33,nodes[j]+0x104,4);}
 memcpy(r+183,parts[2]+0x44,4);memcpy(r+184,parts[3]+0x44,4);
}
__asm__(".text\n_contact_boundary:\n cmpl $2,_next_stage\n jne 3f\n pushal\n lea 32(%esp),%eax\n push %eax\n call _copy_frame_contact\n add $4,%esp\n popal\n xor %eax,%eax\n mov 0x594(%esi),%ecx\n push $0x200a64e4\n ret\n3:\n cmpl $2,_entry_count\n jge 1f\n xor %eax,%eax\n mov 0x594(%esi),%ecx\n push $0x200a64e4\n ret\n1:\n mov %esp,%eax\n push %eax\n call _copy_next_contact\n add $4,%esp\n xor %eax,%eax\n mov 0x594(%esi),%ecx\n push $0x200a64e4\n ret\n2:\n mov %esp,%eax\n push %eax\n call _copy_next_contact\n add $4,%esp\n jmp _substep_exit\n");
void response_boundary(void);void copy_next_response(unsigned char*s){
 uint32_t*r=next_stage==2?next_response_output:entry_count>=3?third_response:response_next;
 const int offsets[]={0x14,0x18,0x34,0x24,0x100,0x294,0x298,0x29c,0x4c,0x45c,0x460,0x464,0x858,0x85c,0x860,0x864,0x868,0x86c,0x870,0x874,0x878,0x36c,0x370,0x374,0x3e4,0x3e8,0x3ec,0x2a0,0x2a4,0x2a8,0x2c4,0x2c8,0x2cc,0x4b0,0x4b4,0x4b8,0x6d8,0x6dc,0x6e0,0xbc,0x194,0x20};
 for(int j=0;j<42;j++)memcpy(r+j,s+offsets[j],4);
 const int fields[]={0x894,0x4f0,0x4f4,0x4bc,0x870,0x718,0x8c4,0xb4c,0xc6c,0x714,0xc78,0xc70,0xc74,0x53c};
 for(int j=0;j<14;j++)memcpy(r+42+j,bike+fields[j],4);
 const int controls[]={0x1c,0x30,0x2c,0x28,0x264,0x260,0x1c0,0x1bc};
 for(int j=0;j<8;j++)memcpy(r+56+j,s+controls[j],4);
 memcpy(r+64,bike+0x54c,12);memcpy(r+67,bike+0x540,12);
 for(int j=0;j<4;j++){memcpy(r+70+j*33,nodes[j]+0x84,128);memcpy(r+102+j*33,nodes[j]+0x104,4);}
}
__asm__(".text\n_response_boundary:\n cmpl $2,_next_stage\n jne 3f\n pushal\n lea 32(%esp),%eax\n push %eax\n call _copy_next_response\n add $4,%esp\n popal\n movl $0,_impulse_enabled\n mov 0x4bc(%esi),%eax\n push $0x200a6eb2\n ret\n3:\n cmpl $2,_entry_count\n jge 1f\n mov 0x4bc(%esi),%eax\n push $0x200a6eb2\n ret\n1:\n mov %esp,%eax\n push %eax\n call _copy_next_response\n add $4,%esp\n mov 0x4bc(%esi),%eax\n push $0x200a6eb2\n ret\n");
void tires_boundary(void);void copy_next_tires(unsigned char*s){
 uint32_t*out=next_stage==2?next_tires_output:entry_count>=3?third_tires:tires_next;
 const int tire_offsets[]={84,960,964,968,1092,1096,1100,696,700,704,96,972,976,980,428,816,820,824,-1852,-1848,1260,1264,1268,68,104,192,592,588,420,416,424,276,584,280,412,308,204,268,1212,1216,1220,864,868,872,1812,1816,1820,264,260,408,924,928,932,248,252,912,916,920};
 for(int j=0;j<58;j++)memcpy(out+72+j,tire_offsets[j]<0?bike-tire_offsets[j]:s+tire_offsets[j],4);

 const int suspension_offsets[]={ 1020,1024,1028,1104,1108,1112,852,856,860,684,688,692,92,984,988,992,432,80,1236,1240,1244,828,832,836,56,596,200,272,1224,1228,1232,1932,1936,1940,1176,1180,1184,2112,2116,2120,132,568,64,164 };
 for(int j=0;j<44;j++)memcpy(out+28+j,s+suspension_offsets[j],4);

 memcpy(out,balance_filter,4);
 const int balance_offsets[]={0x25c,0x1b8,0x1b4,0x70,0x384,0x388,0x38c,0x258,0x810,0x814,0x818,0x804,0x808,0x80c,0x7f8,0x7fc,0x800,0x4a4,0x4a8,0x4ac,0x84c,0x850,0x854,0x88,0x23c,0x3c,0xa8};
 for(int j=0;j<27;j++)memcpy(out+1+j,s+balance_offsets[j],4);


 uint32_t*r=out+130;
 const int fields[]={0x4bc,0x870,0x5a8,0x5ac,0x6b0,0x6b4,0x560,0x620,0x73c,0x738};
 for(int j=0;j<10;j++)memcpy(r+j,bike+fields[j],4);
 const int vectors[]={0x504,0x6b8,0x6c4,0x66c,0x654,0x540,0x510};
 for(int j=0;j<7;j++)memcpy(r+10+j*3,bike+vectors[j],12);
 memcpy(r+31,bike+0x590,8);memcpy(r+33,parts[2]+0x4c,12);memcpy(r+36,parts[2]+0x5c,4);memcpy(r+37,parts[2]+0x44,4);memcpy(r+38,parts[3]+0x58,4);memcpy(r+39,parts[3]+0x44,4);
 for(int j=0;j<4;j++){memcpy(r+40+j*33,nodes[j]+0x84,128);memcpy(r+72+j*33,nodes[j]+0x104,4);}
 for(int j=0;j<10;j++)memcpy(r+172+j*3,s+point_offsets[j],12);
}
__asm__(".text\n_tires_boundary:\n cmpl $2,_next_stage\n jne 3f\n pushal\n lea 32(%esp),%eax\n push %eax\n call _copy_next_tires\n add $4,%esp\n popal\n flds 0x74(%esp)\n fabs\n push $0x200a8be6\n ret\n3:\n cmpl $2,_entry_count\n jge 1f\n flds 0x74(%esp)\n fabs\n push $0x200a8be6\n ret\n1:\n mov %esp,%eax\n push %eax\n call _copy_next_tires\n add $4,%esp\n flds 0x74(%esp)\n fabs\n push $0x200a8be6\n ret\n");
void motion_boundary(void);void copy_next_motion(unsigned char*s){
 uint32_t*out=next_stage==2?next_motion_output:entry_count>=3?third_motion:motion_next;
 const int integration_offsets[]={400,1032,1036,1040,2196,2200,2204,1044,1048,1052,2184,2188,2192,720,724,728,1164,1168,1172,1152,1156,1160,1476,1480,1484,1440,1444,1448,560,564,552,556,548,396,1404,1408,1412,1128,1132,1136,1140,1144,1148,2808,2812,2816,2820,2824,2828,88,948,952,956,1080,1084,1088,1068,1072,1076,1248,1252,1256,120};
 for(int j=0;j<63;j++)memcpy(out+25+j,s+integration_offsets[j],4);

 const int impulse_offsets[]={144,1500,1504,1508,2220,2224,2228,2208,2212,2216,1488,1492,1496};
 for(int j=0;j<13;j++)memcpy(out+j,s+impulse_offsets[j],4);
 out[13]=impulse_count;out[14]=impulse_enabled;
 const int response_offsets[]={240,236,128,184,180,244,176,232,172};
 for(int j=0;j<9;j++)memcpy(out+15+j,s+response_offsets[j],4);
 memcpy(out+24,s+576,4);


 uint32_t*r=out;memcpy(r+88,s+124,4);memcpy(r+89,s+108,4);memcpy(r+90,s+160,4);
 const int vectors[]={0x4f8,0x504,0x510,0x51c,0x534,0x528,0x654,0x54c,0x540,0x660};
 for(int j=0;j<10;j++)memcpy(r+91+j*3,bike+vectors[j],12);
 const int fields[]={0x844,0x6a4,0x8bc,0x6ac,0x6d8,0x6dc,0x6e0};
 for(int j=0;j<7;j++)memcpy(r+121+j,bike+fields[j],4);
 memcpy(r+128,parts[0]+0x4c,4);memcpy(r+129,parts[1]+0x4c,4);
 for(int j=0;j<4;j++){memcpy(r+130+j*33,nodes[j]+0x84,128);memcpy(r+162+j*33,nodes[j]+0x104,4);}
 memcpy(r+262,s+0x294,12);memcpy(r+265,s+0x360,12);
 memcpy(r+268,parts[2]+0x4c,12);memcpy(r+271,parts[2]+0x5c,4);memcpy(r+272,parts[3]+0x58,4);
}
__asm__(".text\n_motion_boundary:\n cmpl $2,_next_stage\n jne 3f\n pushal\n lea 32(%esp),%eax\n push %eax\n call _copy_next_motion\n add $4,%esp\n popal\n movl $0,_normal_redirected\n movl $0,_event_triggered\n movl $0,_join_called\n mov _event_input_calls,%eax\n mov %eax,_next_event_input_base\n mov 0x844(%esi),%eax\n push $0x200ab803\n ret\n3:\n cmpl $2,_entry_count\n jge 1f\n mov 0x844(%esi),%eax\n push $0x200ab803\n ret\n1:\n mov %esp,%eax\n push %eax\n call _copy_next_motion\n add $4,%esp\n mov 0x844(%esi),%eax\n push $0x200ab803\n ret\n");
void copy_next_event(unsigned char*s,int route){
 uint32_t*r=next_stage==2?next_event_output:entry_count>=3?third_event:event_next;r[0]=route;
 const int vectors[]={0x510,0x534,0x54c,0x540};for(int j=0;j<4;j++)memcpy(r+1+j*3,bike+vectors[j],12);
 const int fields[]={0x844,0x8b8,0x8b4,0x8b0,0x710,0x714,0x820,0x814,0x8a4,0x890,0x884,0x8c8};for(int j=0;j<12;j++)memcpy(r+13+j,bike+fields[j],4);r[16]=!!r[16];
 memcpy(r+25,bike+0x898,12);memcpy(r+28,effect,16);
 memcpy(r+32,rider+0x58,12);memcpy(r+35,rider+0x70,24);memcpy(r+41,rider+0x13c,8);memcpy(r+43,rider+0x160,20);
 for(int j=0;j<4;j++){memcpy(r+48+j*33,nodes[j]+0x84,128);memcpy(r+80+j*33,nodes[j]+0x104,4);}
 r[180]=event_triggered;r[181]=event_input_calls-(next_stage==2?next_event_input_base:entry_count>=3?third_event_base[0]:first_event[1]);r[182]=next_stage==2?next_event_random_calls:random_calls-(entry_count>=3?third_event_base[1]:first_event[2]);r[183]=join_called;memcpy(r+184,s+0x20,4);memcpy(r+185,join_arguments,12);
}
void copy_next_rider(void){
 uint32_t*r=entry_count>=3?third_rider:rider_next;const int fields[]={0x820,0x710,0xb4c,0x814,0x818,0x730,0x708,0x704,0x724,0x728,0x72c,0x734};
 for(int j=0;j<12;j++){memcpy(r+j,bike+fields[j],4);}memcpy(r+12,effect,16);
 const int anim[]={4,0x10,0x14,0x30,0x2c};for(int j=0;j<5;j++){memcpy(r+16+j,bike+anim[j],4);memcpy(r+21+j,proxy+anim[j],4);}
 for(int k=0;k<16;k++){if(get32(0x10)==(uintptr_t)trick_records[k])r[17]=k+1;if(*(uintptr_t*)(proxy+0x10)==(uintptr_t)trick_records[16+k])r[22]=k+1;}
 for(int k=0;k<16;k++){if(get32(0x14)==(uintptr_t)trick_frames[k])r[18]=*(uint32_t*)trick_frames[k][0];if(*(uintptr_t*)(proxy+0x14)==(uintptr_t)trick_frames[16+k])r[23]=*(uint32_t*)trick_frames[16+k][0];}
 if(get32(0x10)==(uintptr_t)near_records[0]){r[17]=17;r[18]=1;}if(*(uintptr_t*)(proxy+0x10)==(uintptr_t)near_records[1]){r[22]=17;r[23]=1;}
 for(int k=0;k<21;k++){if(get32(0x10)==(uintptr_t)pose_records[k])r[17]=100+k;if(*(uintptr_t*)(proxy+0x10)==(uintptr_t)pose_records[k])r[22]=100+k;}
 if(get32(0x14)==(uintptr_t)pose_frames[0][0])r[18]=0;
 if(*(uintptr_t*)(proxy+0x14)==(uintptr_t)pose_frames[0][0])r[23]=0;
 memcpy(r+26,bike+0x54c,12);memcpy(r+29,bike+0x540,12);memcpy(r+32,bike+0x218,24);
 for(int j=0;j<4;j++){memcpy(r+38+j*33,nodes[j]+0x84,128);memcpy(r+70+j*33,nodes[j]+0x104,4);}
 if(entry_count>=3){memcpy(third_nearby,bike+0x824,4);memcpy(third_nearby+1,bike+0x82c,12);third_nearby[4]=!!get32(0x838);memcpy(third_nearby+5,proxy+0x218,24);}
 r[170]=rider_query_count;memcpy(r+171,rider_queries,12);r[174]=trick_selected;
}
void copy_rider_join(unsigned char*s,int route){if(!join_called)copy_next_event(s,route);copy_next_rider();}
void trick_entry(void);
__asm__(".text\n_trick_entry:\n mov 4(%esp),%eax\n inc %eax\n mov %eax,_trick_selected\n push %ebx\n push %esi\n flds 0x8cc(%ecx)\n push $0x200a1978\n ret\n");
void copy_next_controls(unsigned char*s,int route){
 uint32_t*r=next_stage==2?next_controls_output:entry_count>=3?third_controls:controls_next;r[0]=route;
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
__asm__(".text\n_controls_air:\n cmpl $2,_next_stage\n jne 3f\n pushal\n lea 32(%esp),%eax\n push $1\n push %eax\n call _copy_next_controls\n add $8,%esp\n popal\n movl $1,_next_event_active\n mov 0x10(%esp),%eax\n push $0\n push $0x200ac181\n ret\n3:\n cmpl $2,_entry_count\n jge 1f\n mov 0x10(%esp),%eax\n push $0\n push $0x200ac181\n ret\n1:\n mov %esp,%eax\n push $1\n push %eax\n call _copy_next_controls\n add $8,%esp\n mov 0x10(%esp),%eax\n push $0\n push $0x200ac181\n ret\n");
void controls_ground(void);
__asm__(".text\n_controls_ground:\n cmpl $2,_next_stage\n jne 3f\n pushal\n lea 32(%esp),%eax\n push $2\n push %eax\n call _copy_next_controls\n add $8,%esp\n popal\n movl $1,_next_event_active\n mov 0x10(%esp),%eax\n push $0\n push $0x200ac5cb\n ret\n3:\n cmpl $2,_entry_count\n jge 1f\n mov 0x10(%esp),%eax\n push $0\n push $0x200ac5cb\n ret\n1:\n mov %esp,%eax\n push $2\n push %eax\n call _copy_next_controls\n add $8,%esp\n mov 0x10(%esp),%eax\n push $0\n push $0x200ac5cb\n ret\n");
void controls_limited(void);
__asm__(".text\n_controls_limited:\n cmpl $2,_next_stage\n jne 3f\n pushal\n lea 32(%esp),%eax\n push $3\n push %eax\n call _copy_next_controls\n add $8,%esp\n popal\n movl $1,_next_event_active\n mov 0x10(%esp),%eax\n push $0\n push $0x200ac650\n ret\n3:\n cmpl $2,_entry_count\n jge 1f\n mov 0x10(%esp),%eax\n push $0\n push $0x200ac650\n ret\n1:\n mov %esp,%eax\n push $3\n push %eax\n call _copy_next_controls\n add $8,%esp\n mov 0x10(%esp),%eax\n push $0\n push $0x200ac650\n ret\n");
void controls_crash(void);
__asm__(".text\n_controls_crash:\n cmpl $2,_next_stage\n jne 3f\n cmpl $0,_next_controls_output\n jne 4f\n mov %esp,%eax\n push $4\n push %eax\n call _copy_next_controls\n add $8,%esp\n4:\n mov %esp,%eax\n push $2\n push %eax\n call _copy_next_event\n add $8,%esp\n jmp _input_epilogue\n3:\n cmpl $2,_entry_count\n jge 1f\n lea 0x4f8(%esi),%eax\n push $0x200ac6d3\n ret\n1:\n pushal\n lea 32(%esp),%eax\n push $2\n push %eax\n call _copy_rider_join\n add $8,%esp\n popal\n lea 0x4f8(%esi),%eax\n push $0x200ac6d3\n ret\n");
void copy_next_finished(unsigned char*s){
 uint32_t*r=entry_count>=3?third_finished:finished_next;
 const int fields[]={0x844,0x8b8,0x8b4,0x8b0,0x8a8,0x8c8,0x6a4,0x714,0x870,0x718,0xc7c,0x8d0,0x4e0,0x4dc,0x4d8,0x4e4,0x4e8,0x4ec,0x710,0x820,0x814,0x884,0x8a4,0x890};
 for(int j=0;j<24;j++){memcpy(r+j,bike+fields[j],4);}r[3]=!!r[3];
 const int vectors[]={0x4f8,0x510,0x534,0x528,0x54c,0x540,0x654,0x4c0,0x4cc,0x898};
 for(int j=0;j<10;j++){memcpy(r+24+j*3,bike+vectors[j],12);}
 memcpy(r+54,parts[2]+0x58,4);memcpy(r+55,parts[3]+0x5c,4);memcpy(r+56,effect,16);
 memcpy(r+60,rider+0x58,12);memcpy(r+63,rider+0x70,24);memcpy(r+69,rider+0x13c,8);memcpy(r+71,rider+0x160,20);
 for(int j=0;j<4;j++){memcpy(r+76+j*33,nodes[j]+0x84,128);memcpy(r+108+j*33,nodes[j]+0x104,4);}
 memcpy(r+208,grid_object+0x1c,64);memcpy(r+224,grid_object+0x88,4);if(*(void**)(grid_object+0x88)==dispatch_wall)r[224]=1;memcpy(r+225,grid_object+0x7c,12);
 for(int k=0;k<4;k++){unsigned char*e=grid_entries[k];r[228+k*6]=token(*(void**)e);r[229+k*6]=token(*(void**)(e+4));memcpy(r+230+k*6,e+8,16);}
 for(int k=0;k<65;k++){r[252+k*3]=token(*(void**)(grid_cells[k]+4));r[253+k*3]=token(*(void**)grid_markers[k]);r[254+k*3]=token(*(void**)(grid_markers[k]+4));}
 r[447]=dispatch_callbacks;r[448]=dispatch_prior_state;
 for(int k=0;k<4;k++)memcpy(r+449+k,grid_manager+0xf8+((k/2)*60+k%2)*4,4);
 memcpy(r+453,grid_manager+0x394c,52);memcpy(r+466,grid_object+0xcc,36);memcpy(r+475,dispatch_wall+0xcc,36);
 r[484]=*(void**)(dispatch_wall+0x88)==grid_object;r[485]=*(void**)(grid_manager+0x3980)==grid_object;r[486]=*(void**)(grid_manager+0x3984)==dispatch_wall;r[487]=dispatch_prior_kind;r[488]=dispatch_prior_angular;
 memcpy(r+489,s+0x10,4);memcpy(r+490,s+0x48,4);memcpy(r+491,finish_output+2,8);memcpy(r+493,s+0x20,4);
 r[494]=award_called;r[495]=random_calls-(entry_count>=3?third_event_base[1]:first_event[2]);r[496]=event_input_calls-(entry_count>=3?third_event_base[0]:first_event[1]);r[497]=event_triggered;
}
void copy_third_boundary(unsigned char*s){
 copy_next_finished(s);third_event_base[0]=event_input_calls;third_event_base[1]=random_calls;join_called=0;rider_query_count=trick_selected=normal_redirected=award_called=dispatch_callbacks=impulse_enabled=0;memset(rider_queries,0,sizeof rider_queries);dispatch_prior_state=dispatch_prior_kind=0xffffffff;dispatch_prior_angular=0;third_looped=*(int*)(s+0x20)>0;
 engine_entry_active=third_looped;engine_random_calls=query_count=0;memset(query_log,0,sizeof query_log);
}
void encode_later(uint32_t*r){
  r[0]=third_looped;memcpy(r+1,third_output,sizeof third_output);memcpy(r+34,third_contact,sizeof third_contact);
  memcpy(r+219,third_response,sizeof third_response);memcpy(r+421,third_tires,sizeof third_tires);memcpy(r+753,third_motion,sizeof third_motion);memcpy(r+1026,third_controls,sizeof third_controls);memcpy(r+1196,third_event,sizeof third_event);memcpy(r+1384,third_rider,sizeof third_rider);memcpy(r+1559,third_finished,sizeof third_finished);memcpy(r+2057,third_nearby,sizeof third_nearby);
}
void copy_fourth_boundary(unsigned char*s){
 copy_next_finished(s);encode_later(saved_third);
 memset(third_nearby,0,sizeof third_nearby);
 memset(third_response,0,sizeof third_response);
 memset(third_tires,0,sizeof third_tires);
 memset(third_motion,0,sizeof third_motion);
 memset(third_controls,0,sizeof third_controls);
 memset(third_event,0,sizeof third_event);
 memset(third_rider,0,sizeof third_rider);
 memset(third_finished,0,sizeof third_finished);
 memset(third_output,0,sizeof third_output);
 memset(third_contact,0,sizeof third_contact);
 third_event_base[0]=event_input_calls;third_event_base[1]=random_calls;join_called=0;rider_query_count=trick_selected=normal_redirected=award_called=dispatch_callbacks=impulse_enabled=0;memset(rider_queries,0,sizeof rider_queries);dispatch_prior_state=dispatch_prior_kind=0xffffffff;dispatch_prior_angular=0;third_looped=*(int*)(s+0x20)>0;engine_entry_active=third_looped;engine_random_calls=query_count=0;memset(query_log,0,sizeof query_log);
}
void copy_completed_loop(unsigned char*s){copy_next_finished(s);if(*(int*)(s+0x20)>0)fail("Corpus requires another iteration");}
void loop_boundary(void);void copy_loop_boundary(unsigned char*s){
 copy_substep(s);memcpy(first_bound_records,bound_records,sizeof bound_records);memcpy(first_grid_object,grid_object,sizeof grid_object);memcpy(first_grid_manager,grid_manager,sizeof grid_manager);memcpy(first_grid_cells,grid_cells,sizeof grid_cells);memcpy(first_grid_markers,grid_markers,sizeof grid_markers);memcpy(first_grid_entries,grid_entries,sizeof grid_entries);memcpy(first_wall,dispatch_wall,sizeof dispatch_wall);memcpy(first_finish,finish_output,sizeof finish_output);first_award=award_called;award_called=0;first_dispatch[0]=dispatch_callbacks;first_dispatch[1]=dispatch_prior_state;first_dispatch[2]=dispatch_prior_kind;first_dispatch[3]=dispatch_prior_angular;dispatch_callbacks=0;dispatch_prior_state=dispatch_prior_kind=0xffffffff;dispatch_prior_angular=0;
 memcpy(first_nodes,nodes,sizeof nodes);memcpy(first_parts,parts,sizeof parts);memcpy(first_component,component,sizeof component);memcpy(first_bike,bike,sizeof first_bike);memcpy(first_engine,engine,sizeof first_engine);
 memcpy(first_rider,rider,sizeof rider);memcpy(first_effect,effect,16);first_event[0]=event_triggered;first_event[1]=event_input_calls;first_event[2]=random_calls;first_event[3]=join_called;memcpy(first_event+4,join_arguments,12);join_called=0;memcpy(first_filters,analog_filter,4);memcpy(first_filters+1,acceleration_filter,4);
 impulse_enabled=0;looped=*(int*)(s+0x20)>0;engine_entry_active=looped;engine_random_calls=query_count=0;memset(query_log,0,sizeof query_log);
}
__asm__(".text\n_loop_boundary:\n cmpl $4,_entry_count\n je 2f\n cmpl $3,_entry_count\n je 3f\n cmpl $2,_entry_count\n je 1f\n pushal\n lea 0x50(%esp),%eax\n push %eax\n call _copy_loop_boundary\n add $4,%esp\n popal\n mov 0x50(%esp),%ecx\n add $0x30,%esp\n push $0x200ac952\n ret\n1:\n pushal\n lea 0x50(%esp),%eax\n push %eax\n call _copy_third_boundary\n add $4,%esp\n popal\n mov 0x50(%esp),%ecx\n add $0x30,%esp\n push $0x200ac952\n ret\n3:\n pushal\n lea 0x50(%esp),%eax\n push %eax\n call _copy_fourth_boundary\n add $4,%esp\n popal\n mov 0x50(%esp),%ecx\n add $0x30,%esp\n push $0x200ac952\n ret\n2:\n pushal\n lea 0x50(%esp),%eax\n push %eax\n call _copy_completed_loop\n add $4,%esp\n popal\n mov 0x50(%esp),%ecx\n add $0x30,%esp\n push $0x200ac952\n ret\n");
void finish_entry(void);
__asm__(".text\n_finish_entry:\n mov 0x20(%esp),%eax\n mov %eax,_finish_output+8\n mov 0x8c8(%esi),%eax\n mov %eax,_finish_output+12\n mov 0x20(%esp),%eax\n dec %eax\n push $0x200ac8a3\n ret\n");
void dispatch_primary_entry(void);void dispatch_state_entry(void);
__asm__(".text\n_dispatch_state_entry:\n mov 0x844(%esi),%ecx\n mov %ecx,_dispatch_prior_state\n mov 0x8b8(%esi),%ecx\n mov %ecx,_dispatch_prior_kind\n mov 0x534(%esi),%ecx\n mov %ecx,_dispatch_prior_angular\n mov 0x8a8(%esi),%ecx\n push $0x200ac821\n ret\n");
__asm__(".text\n_dispatch_primary_entry:\n incl _dispatch_callbacks\n push %ebx\n push %esi\n mov 0xc(%esp),%esi\n push $0x2009e496\n ret\n");
void award_entry(void);
__asm__(".text\n_award_entry:\n movl $1,_award_called\n sub $4,%esp\n push %esi\n mov %ecx,%esi\n push $0x200b1a46\n ret\n");
void join_rider_entry(void);
__asm__(".text\n_join_rider_entry:\n movl $1,_join_called\n mov 4(%esp),%eax\n mov %eax,_join_arguments\n mov 8(%esp),%eax\n mov %eax,_join_arguments+4\n mov 12(%esp),%eax\n mov %eax,_join_arguments+8\n cmpl $2,_next_stage\n jne 3f\n lea 16(%esp),%eax\n push $1\n push %eax\n call _copy_next_event\n add $24,%esp\n jmp _input_epilogue\n3:\n cmpl $2,_entry_count\n jge 1f\n sub $0xac,%esp\n push $0x200aecb6\n ret\n1:\n pushal\n lea 48(%esp),%eax\n push $1\n push %eax\n call _copy_next_event\n add $8,%esp\n popal\n sub $0xac,%esp\n push $0x200aecb6\n ret\n");
void event_decision_exit(void);
__asm__(".text\n_event_decision_exit:\n mov %eax,_event_triggered\n mov %eax,0x844(%esi)\n push $0x200a4bb0\n ret\n");
void frame_entry(void);
__asm__(".text\n_frame_entry:\n sub $0xb8,%esp\n push %eax\n mov _normal_seed,%eax\n mov %eax,0x74(%esp)\n mov _normal_seed+4,%eax\n mov %eax,0x78(%esp)\n mov _normal_seed+8,%eax\n mov %eax,0x7c(%esp)\n mov _normal_seed+12,%eax\n mov %eax,0x98(%esp)\n mov _normal_seed+16,%eax\n mov %eax,0x9c(%esp)\n mov _normal_seed+20,%eax\n mov %eax,0xa0(%esp)\n mov _normal_seed+24,%eax\n mov %eax,0x38(%esp)\n mov _normal_seed+28,%eax\n mov %eax,0x3c(%esp)\n mov _normal_seed+32,%eax\n mov %eax,0x40(%esp)\n mov _normal_seed+36,%eax\n mov %eax,0x44(%esp)\n mov _normal_seed+40,%eax\n mov %eax,0x48(%esp)\n mov _normal_seed+44,%eax\n mov %eax,0x4c(%esp)\n mov _normal_seed+48,%eax\n mov %eax,0x68(%esp)\n mov _normal_seed+52,%eax\n mov %eax,0x6c(%esp)\n mov _normal_seed+56,%eax\n mov %eax,0x70(%esp)\n mov _normal_seed+60,%eax\n mov %eax,0x8c(%esp)\n mov _normal_seed+64,%eax\n mov %eax,0x90(%esp)\n mov _normal_seed+68,%eax\n mov %eax,0x94(%esp)\n pop %eax\n push $0x200a0136\n ret\n");
void observe_contact(void);
__asm__(".text\n_observe_contact:\n mov %eax,_impulse_count\n movl $1,_impulse_enabled\n mov 0x2c(%esp),%ecx\n test %ecx,%ecx\n push $0x200a8de5\n ret\n");

void fill_animation(unsigned char*record,unsigned char*frames,unsigned char*children,int count,int id){
 memset(record,0,0x78);memset(frames,0,count*0x34);memset(children,0,count*0x30);
 *(void**)(record+0x68)=frames;*(int*)(record+0x6c)=count;*(int*)(record+0x70)=id>=21?(int)input_parameters[6]:1;*(int*)(record+0x74)=30;
 for(int j=0;j<count;j++){
  unsigned char*f=frames+j*0x34,*c=children+j*0x30;*(int*)f=j;
  if(j+1<count)*(void**)(f+0x18)=frames+(j+1)*0x34;
  *(void**)(f+0xc)=c;c[0]=id<21?bound_records[0][0]:id%4;*(int*)(c+4)=id<21?1:id%2;
  *(float*)(c+0x10)=1;*(float*)(c+0x18)=1;
  for(int k=0;k<3;k++)*(float*)(c+0x20+k*4)=(float)((id+j+k)*.125);
  for(int k=0;k<6;k++)*(float*)(f+0x1c+k*4)=(float)((id+j+k)*.25);
 }
}
void setup_frame_assets(void){
 for(int k=0;k<21;k++){fill_animation(pose_records[k],pose_frames[k][0],pose_children[k][0],8,k);put32(0x740+k*4,(uintptr_t)pose_records[k]);}
 put32(0x778,(uintptr_t)near_records[1]);put32(0x790,(uintptr_t)near_records[0]);
 for(int k=0;k<32;k++)fill_animation(trick_records[k],trick_frames[k][0],trick_children[k][0],32,k+21);
 for(int k=0;k<4;k++)*(int*)(bound_components+k*0x40+0x38)=!!*(void**)(nodes[k]+0x108);
 *(void**)(proxy+0x234)=bound_components;
 for(int j=0;j<2;j++){
  unsigned char*o=j?proxy:bike;*(int*)(o+4)=j&&raw_frame_delta==.04f?0:1;*(float*)(o+8)=.003f;
  *(void**)(o+0x10)=pose_records[0];
  for(int k=0x14;k<=0x20;k+=4)*(void**)(o+k)=pose_frames[0][0];
  *(float*)(o+0x24)=0;*(float*)(o+0x28)=.2f;*(int*)(o+0x2c)=0;*(int*)(o+0x30)=0;
 }
}

static volatile uint32_t active_case;
static HANDLE oracle_main_thread;
DWORD WINAPI oracle_watchdog(void*unused){(void)unused;uint32_t previous=0xffffffff;for(;;){Sleep(5000);uint32_t now=active_case;if(now==previous){SuspendThread(oracle_main_thread);CONTEXT c;memset(&c,0,sizeof c);c.ContextFlags=CONTEXT_FULL;if(GetThreadContext(oracle_main_thread,&c))fprintf(stderr,"oracle stalled case=%u stage=%d eip=%08lx eax=%08lx ebx=%08lx ecx=%08lx edx=%08lx esi=%08lx edi=%08lx esp=%08lx\n",now,next_stage,c.Eip,c.Eax,c.Ebx,c.Ecx,c.Edx,c.Esi,c.Edi,c.Esp);fflush(stderr);ExitProcess(4);}previous=now;}return 0;}

LONG WINAPI report_native_fault(EXCEPTION_POINTERS*p){
 fprintf(stderr,"case %u: exception %08lx at %p\n",active_case,p->ExceptionRecord->ExceptionCode,p->ExceptionRecord->ExceptionAddress);fprintf(stderr,"stage=%d\n",next_stage);fprintf(stderr,"eax=%08lx ecx=%08lx esi=%08lx esp=%08lx stack=%08lx,%08lx,%08lx,%08lx\n",p->ContextRecord->Eax,p->ContextRecord->Ecx,p->ContextRecord->Esi,p->ContextRecord->Esp,((DWORD*)p->ContextRecord->Esp)[0],((DWORD*)p->ContextRecord->Esp)[1],((DWORD*)p->ContextRecord->Esp)[2],((DWORD*)p->ContextRecord->Esp)[3]);fflush(stderr);ExitProcess(3);return EXCEPTION_EXECUTE_HANDLER;
}
int main(int argc,char**argv){
 SetUnhandledExceptionFilter(report_native_fault);
 oracle_main_thread=OpenThread(THREAD_GET_CONTEXT|THREAD_SUSPEND_RESUME,FALSE,GetCurrentThreadId());if(!oracle_main_thread||!CreateThread(NULL,0,oracle_watchdog,NULL,0,NULL))fail("watchdog");
 if(argc!=4&&argc!=5)return 2;
 map_image(argv[1]);{unsigned char*p=(void*)0x200aebb6;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)reset_cycle_hook_other-0x200aebb6-5;}{unsigned char*p=(void*)0x200add09;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)reset_cycle_hook-0x200add09-5;}{unsigned char*p=(void*)0x200a5bbb;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)next_terrain_exit-0x200a5bbb-5;}{unsigned char*p=(void*)0x200526d0;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)reset_pressed-0x200526d0-5;}{unsigned char*p=(void*)0x2000fbb0;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)reset_cleanup_hook-0x2000fbb0-5;}{unsigned char*p=(void*)0x200a5993;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)next_steering_exit-0x200a5993-5;}{
 const uintptr_t addresses[]={0x200a57c0,0x200a56d3,0x200a57b1,0x200a58c8};
 void(*callbacks[])(void)={input_player_exit,input_ai_exit,input_scripted_exit,input_crash_exit};
 for(int k=0;k<4;k++){unsigned char*p=(void*)addresses[k];p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)callbacks[k]-addresses[k]-5;}
 }{unsigned char*p=(void*)0x200a5672;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)next_recovery_exit-0x200a5672-5;}/* Undo the isolated scheduler harness exit; retain original global-settings load. */
 {const unsigned char original[]={0xa1,0xb4,0x4f,0x0e,0x20};memcpy((void*)0x200a5552,original,sizeof original);}
 {unsigned char*e=(void*)0x200a5566;e[0]=0xe9;*(uint32_t*)(e+1)=(uintptr_t)next_frame_entry_exit-0x200a5566-5;}{unsigned char*p=(void*)0x200a1970;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)trick_entry-0x200a1970-5;}{unsigned char*p=(void*)0x200ac17b;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)controls_air-0x200ac17b-5;}{unsigned char*p=(void*)0x200ac5c5;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)controls_ground-0x200ac5c5-5;}{unsigned char*p=(void*)0x200ac64a;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)controls_limited-0x200ac64a-5;}{unsigned char*p=(void*)0x200ac6cd;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)controls_crash-0x200ac6cd-5;}{unsigned char*p=(void*)0x200abd6e;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)normal_redirect_entry-0x200abd6e - 5;}unsigned char*mp=(void*)0x200ab7fd;mp[0]=0xe9;*(uint32_t*)(mp+1)=(uintptr_t)motion_boundary - 0x200ab7fd - 5;unsigned char*tp=(void*)0x200a8be0;tp[0]=0xe9;*(uint32_t*)(tp+1)=(uintptr_t)tires_boundary - 0x200a8be0 - 5;unsigned char*rp=(void*)0x200a6eac;rp[0]=0xe9;*(uint32_t*)(rp+1)=(uintptr_t)response_boundary - 0x200a6eac - 5;unsigned char*cp=(void*)0x200a64dc;cp[0]=0xe9;*(uint32_t*)(cp+1)=(uintptr_t)contact_boundary - 0x200a64dc - 5;unsigned char*done=(void*)0x200ac95a;done[0]=0xe9;*(uint32_t*)(done+1)=(uintptr_t)post_loop_entry - 0x200ac95a - 5;unsigned char*pf=(void*)0x200ad07a;pf[0]=0xe9;*(uint32_t*)(pf+1)=(uintptr_t)post_filter_exit-0x200ad07a-5;unsigned char*ob=(void*)0x200a8ddf;ob[0]=0xe9;*(uint32_t*)(ob+1)=(uintptr_t)observe_contact-0x200a8ddf-5;uint32_t exits[]={0x200a4baa};for(int j=0;j<1;j++){unsigned char*exit_patch=(void*)(uintptr_t)exits[j];exit_patch[0]=0xe9;*(uint32_t*)(exit_patch+1)=(uintptr_t)event_decision_exit-exits[j]-5;}unsigned char*fp=(void*)0x200ac89e;fp[0]=0xe9;*(uint32_t*)(fp+1)=(uintptr_t)finish_entry - 0x200ac89e - 5;uint32_t ends[]={0x200ac94b};for(int j=0;j<1;j++){unsigned char*ep=(void*)(uintptr_t)ends[j];ep[0]=0xe9;*(uint32_t*)(ep+1)=(uintptr_t)loop_boundary-ends[j]-5;}
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
 FILE*entry_out=argc==5?fopen(argv[4],"wb"):NULL;if(argc==5&&!entry_out)fail("entry open");
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  active_case=i;
  uint32_t v[2016],r[8277];if(fread(v,sizeof v,1,in)!=1)fail("input");reset_pressed_value=v[2015];memcpy(frame_input,v+2000,sizeof frame_input);memcpy(&raw_frame_delta,v+2003,4);memcpy(frame_return_input,v+2004,12);memcpy(&next_frame_delta,v+2007,4);memcpy(input_parameters,v+2008,sizeof input_parameters);next_event_active=next_event_random_calls=0;memset(next_event_output,0,sizeof next_event_output);memset(next_controls_output,0,sizeof next_controls_output);memset(next_tires_output,0,sizeof next_tires_output);memset(next_motion_output,0,sizeof next_motion_output);memset(next_response_output,0,sizeof next_response_output);memset(next_contact_output,0,sizeof next_contact_output);memset(next_engine_output,0,sizeof next_engine_output);memset(next_terrain_output,0,sizeof next_terrain_output);memset(next_reset_output,0,sizeof next_reset_output);memset(next_steering_output,0,sizeof next_steering_output);memset(next_entry_output,0,sizeof next_entry_output);memset(frame_return_output,0,sizeof frame_return_output);
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
  memcpy(settings+0x12fc,input_parameters,4);memcpy(settings+0x12e8,input_parameters+1,4);memcpy(settings+0x12d4,input_parameters+2,4);
  memset(input_device,0,sizeof input_device);*(uint32_t*)(input_device+0x30)=input_parameters[4];input_device[0x5d]=(unsigned char)input_parameters[5];*(void**)(settings+0x12e4)=input_parameters[3]?input_device:NULL;
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
  loop_rider_input=(float*)(v+1965);memset(trick_records,0,sizeof trick_records);
  for(int k=0;k<16;k++){*(int*)(trick_records[k]+0x68)=(int)loop_rider_input[3+k];*(int*)(trick_records[16+k]+0x68)=(int)loop_rider_input[19+k];put32(0x7d4+k*4,(uintptr_t)trick_records[k]);put32(0x794+k*4,(uintptr_t)trick_records[16+k]);}*(uint32_t*)proxy=0x200d7b14;
  for(int k=0;k<32;k++){*(int*)trick_frames[k][0]=(int)loop_rider_input[3+k];*(void**)(trick_records[k]+0x68)=trick_frames[k];}
  memset(near_records,0,sizeof near_records);memset(near_frames,0,sizeof near_frames);
  for(int k=0;k<2;k++){*(void**)(near_records[k]+0x68)=near_frames[k];*(int*)(near_records[k]+0x6c)=1;memcpy(near_frames[k]+0x1c,bounds+0x1c,24);}
  put32(0x790,(uintptr_t)near_records[0]);put32(0x778,(uintptr_t)near_records[1]);
  memset(return_manager,0,sizeof return_manager);memset(return_scene,0,sizeof return_scene);
  *(void**)(context+0x48)=return_manager;*(void**)(context+0x44)=return_scene;
  *(uint32_t*)(return_manager+0x20)=frame_return_input[0];*(uint32_t*)(return_scene+0x1f4)=frame_return_input[1];*(void**)(return_scene+0x1ec)=frame_return_input[2]?bike:others[0];
  setup_frame_assets();*(void**)normal_forward=*(void**)(bike+0x434);put32(0x8d8,(uintptr_t)normal_forward);if(!setjmp(next_contact_abort))run_substep();next_stage=3;
  memcpy(bound_records,first_bound_records,sizeof bound_records);memcpy(grid_object,first_grid_object,sizeof grid_object);memcpy(grid_manager,first_grid_manager,sizeof grid_manager);memcpy(grid_cells,first_grid_cells,sizeof grid_cells);memcpy(grid_markers,first_grid_markers,sizeof grid_markers);memcpy(grid_entries,first_grid_entries,sizeof grid_entries);memcpy(dispatch_wall,first_wall,sizeof dispatch_wall);memcpy(finish_output,first_finish,sizeof finish_output);award_called=first_award;dispatch_callbacks=first_dispatch[0];dispatch_prior_state=first_dispatch[1];dispatch_prior_kind=first_dispatch[2];dispatch_prior_angular=first_dispatch[3];memcpy(rider,first_rider,sizeof rider);memcpy(effect,first_effect,16);event_triggered=first_event[0];event_input_calls=first_event[1];random_calls=first_event[2];join_called=first_event[3];memcpy(join_arguments,first_event+4,12);put32(0x8d8,v[2+0x8d8/4]);memcpy(nodes,first_nodes,sizeof nodes);memcpy(parts,first_parts,sizeof parts);memcpy(component,first_component,sizeof component);memcpy(bike,first_bike,sizeof first_bike);put32(0x900,v[2+0x900/4]);put32(0xc90,v[2+0xc90/4]);for(int k=0;k<32;k++)put32(0x794+k*4,v[2+0x794/4+k]);put32(0x8d8,v[2+0x8d8/4]);memcpy(engine,first_engine,sizeof first_engine);memcpy(engine,v+916,8);put32(0x8fc,v[2+0x8fc/4]);put32(0x41c,v[2+0x41c/4]);put32(0x874,v[2+0x874/4]);put32(0x6e4,v[2+0x6e4/4]);put32(0x8f8,v[2+0x8f8/4]);put32(0xc84,v[2+0xc84/4]);
  for(int k=0;k<21;k++)put32(0x740+k*4,v[2+0x740/4+k]);
  for(int k=0x10;k<=0x20;k+=4)put32(k,v[2+k/4]);
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
  memcpy(r+2690,motion_next,sizeof motion_next);memcpy(r+2963,controls_next,sizeof controls_next);memcpy(r+3133,event_next,sizeof event_next);memcpy(r+3321,rider_next,sizeof rider_next);memcpy(r+3496,finished_next,sizeof finished_next);
  memcpy(r+3994,saved_third,sizeof saved_third);encode_later(r+6062);memcpy(r+8130,post_filter,sizeof post_filter);
  if(fwrite(r,sizeof r,1,out)!=1)fail("output");
  if(entry_out&&fwrite(frame_rider_output,sizeof frame_rider_output,1,entry_out)!=1)fail("entry output");
  if(entry_out&&fwrite(frame_return_output,sizeof frame_return_output,1,entry_out)!=1)fail("return output");
  if(entry_out&&fwrite(next_entry_output,sizeof next_entry_output,1,entry_out)!=1)fail("next entry output");
  if(entry_out&&fwrite(next_recovery_output,sizeof next_recovery_output,1,entry_out)!=1)fail("next recovery output");
  if(entry_out&&fwrite(next_input_output,sizeof next_input_output,1,entry_out)!=1)fail("next input output");
  if(entry_out&&fwrite(next_steering_output,sizeof next_steering_output,1,entry_out)!=1)fail("next steering output");
  if(entry_out&&fwrite(next_reset_output,sizeof next_reset_output,1,entry_out)!=1)fail("next reset output");
  if(entry_out&&fwrite(next_terrain_output,sizeof next_terrain_output,1,entry_out)!=1)fail("next terrain output");
  if(entry_out&&fwrite(next_engine_output,sizeof next_engine_output,1,entry_out)!=1)fail("next engine output");
  if(entry_out&&fwrite(next_contact_output,sizeof next_contact_output,1,entry_out)!=1)fail("next contact output");
  if(entry_out&&fwrite(next_response_output,sizeof next_response_output,1,entry_out)!=1)fail("next response output");
  if(entry_out&&fwrite(next_tires_output,sizeof next_tires_output,1,entry_out)!=1)fail("next tires output");
  if(entry_out&&fwrite(next_motion_output,sizeof next_motion_output,1,entry_out)!=1)fail("next motion output");
  if(entry_out&&fwrite(next_controls_output,sizeof next_controls_output,1,entry_out)!=1)fail("next controls output");
  if(entry_out&&fwrite(next_event_output,sizeof next_event_output,1,entry_out)!=1)fail("next event output");
 }
 if(fclose(out))fail("close");
 if(entry_out&&fclose(entry_out))fail("entry close");
 return 0;
}
