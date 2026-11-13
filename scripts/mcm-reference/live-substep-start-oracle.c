// Original engine entry through suspension preparation, using live blocks.
// Input query and RNG are explicit test boundaries; no controller is invented.
static void setup_live_entry(void);
static void run_live_entry(unsigned char*);
#define LIVE_SETUP() setup_live_entry()
#define LIVE_UPDATE(b) run_live_entry(b)
#include "live-normal-rider-oracle.c"
uint32_t live_entry_owner;
void live_entry(void);void live_entry_exit(void);
static int __attribute__((thiscall)) no_input(void*self,int action,int option){
 if((uintptr_t)self!=live_entry_owner||option||(action!=4&&action!=5))fail("unexpected input query");
 return 0;
}
static int __cdecl no_random(void){fail("unexpected random draw in captured idle state");return 0;}
static void entry_patch(uint32_t address,void*target){unsigned char*p=(void*)(uintptr_t)address;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)target-address-5;}
static void setup_live_entry(void){entry_patch(0x200a5ea5,live_entry_exit);entry_patch(0x200a4ab0,no_input);entry_patch(0x200bf190,no_random);}
static void run_live_entry(unsigned char*b){live_entry_owner=(uintptr_t)b;live_entry();}
__asm__(".text\n_live_entry:\n push %ebp\n push %ebx\n push %esi\n push %edi\n sub $0xc00,%esp\n movl $0x3ca3d70a,0x10(%esp)\n movl $0x42480000,0x48(%esp)\n movl $0xbf800000,0xc4(%esp)\n mov _live_entry_owner,%esi\n mov $0x200a5bd7,%eax\n jmp *%eax\n_live_entry_exit:\n add $0xc00,%esp\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n");
