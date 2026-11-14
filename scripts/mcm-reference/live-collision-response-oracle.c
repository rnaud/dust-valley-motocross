// Run the captured player bike's type-1 response, stopping before notification.
#include <stdint.h>
#include <stdio.h>
#include <setjmp.h>
static jmp_buf response_exit;
uint32_t response_boundary[3];
void stop_response(void){longjmp(response_exit,1);}
void response_boundary_hook(void);
__asm__(".text\n_response_boundary_hook:\n movl $1,_response_boundary\n mov 0x60(%esp),%eax\n mov %eax,_response_boundary+4\n mov %ebx,_response_boundary+8\n jmp _stop_response\n");
static void setup_response(void);
static void run_response(unsigned char*,unsigned char*);
static void write_response(FILE*);
#define LIVE_COLLISION_SETUP() setup_response()
#define LIVE_COLLISION_UPDATE(m,o) run_response(m,o)
#define LIVE_COLLISION_STOP() response_boundary[0]
#define LIVE_COLLISION_HEADER(out) write_response(out)
#include "live-collision-grid-oracle.c"
static void setup_response(void){
 unsigned char*p=(void*)0x2009e37f;
 if(memcmp(p,"\x8b\x4c\x24\x60\x51",5))fail("response boundary instruction");
 p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)response_boundary_hook-(uintptr_t)(p+5);
}
static void run_response(unsigned char*m,unsigned char*o){
 (void)m;unsigned char*b=*(void**)(o+0x94),*other=*(void**)(o+0x88);
 if(*(uint32_t*)o||*(uint32_t*)b!=0x4d9a94||*(uint32_t*)(b+0x614)||!other||*(uint32_t*)(other+0x104)!=1)fail("expected player bike/rider response");
 if(!setjmp(response_exit))((void (__attribute__((thiscall)) *)(void*,int,void*))0x2009d900)(b,1,o);
 if(!response_boundary[0])fail("notification boundary not reached");
}
static void write_response(FILE*out){if(fwrite(response_boundary,sizeof response_boundary,1,out)!=1)fail("response header");}
