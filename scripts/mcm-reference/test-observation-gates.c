#include <assert.h>
#include <stdio.h>
#include "capture-observation-gates.c"
int main(void){
 unsigned checks=0;
 for(int enabled=0;enabled<2;enabled++)for(int installed=0;installed<2;installed++)for(int done=0;done<2;done++)for(int pending=-1;pending<40;pending++)for(int armed=0;armed<2;armed++)for(unsigned frames=0;frames<3;frames++)for(int bike=0;bike<2;bike++)for(int rider=0;rider<2;rider++){
  int action=ai_query_hook_action(enabled,installed,done,pending,armed,frames,bike,rider),eligible=frames>0&&bike==0&&rider==0;
  assert(ai_query_observable(frames,bike,rider)==eligible);
  if(!enabled||!installed||done||pending==8)assert(action==-1);
  else assert((action==-1?armed:action)==eligible);
  checks++;
 }
 for(int hook=0;hook<40;hook++)for(int pending=-1;pending<40;pending++)for(int enabled=0;enabled<2;enabled++)for(int installed=0;installed<2;installed++)for(int done=0;done<2;done++)for(int armed=0;armed<2;armed++)for(unsigned frames=0;frames<3;frames++)for(int bike=0;bike<2;bike++){
  int action=ai_substep_hook_action(enabled,installed,done,pending,hook,armed,frames,bike),eligible=frames>0&&bike!=0;
  assert(ai_substep_observable(frames,bike)==eligible);
  if(!enabled||!installed||done||hook<11||hook>16||pending==hook)assert(action==-1);
  else assert((action==-1?armed:action)==eligible);
  checks++;
 }
 // Entry, pending query step, return, nested rider activity, cleanup.
 assert(ai_query_hook_action(1,1,0,0,1,1,1,0)==0);
 assert(ai_query_hook_action(1,1,0,1,0,1,0,0)==1);
 assert(ai_query_hook_action(1,1,0,8,0,1,0,0)==-1);
 assert(ai_query_hook_action(1,1,0,-1,0,1,0,0)==1);
 assert(ai_query_hook_action(1,1,0,6,1,1,0,1)==0);
 assert(ai_query_hook_action(1,1,1,-1,1,1,0,0)==-1);
 printf("observation gates: %u predicate/state combinations and pending-step/cleanup transitions passed\n",checks);return 0;
}
