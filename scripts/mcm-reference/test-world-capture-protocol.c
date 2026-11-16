#include <assert.h>
#include <stdio.h>
#include <string.h>
#include "capture-world-protocol.h"
int main(void){
 const char*choices[]={NULL,"","1","2","12","48","96","nonsense"};unsigned cases=0,valid=0;
 for(unsigned i=0;i<8;i++)for(unsigned j=0;j<8;j++)for(unsigned k=0;k<8;k++){
  int throttle=-1,pursuit=-1;int accepted=parse_world_capture_protocol(choices[i],choices[j],choices[k],&throttle,&pursuit);
  int expected=(!i&&!j&&!k)||(i==2&&!j&&!k)||(!i&&(j==2||j==4)&&!k)||(!i&&(j==2||j==5||j==6)&&(k==2||k==3));
  assert(accepted==expected);
  if(accepted){int p=k==2?1:k==3?2:0,t=i?1:j?(p?(j==6?4:3):2):0;assert(throttle==t&&pursuit==p);valid++;}
  else assert(throttle==-1&&pursuit==-1);
  cases++;
 }
 printf("cases=%u accepted=%u rejected=%u\n",cases,valid,cases-valid);return 0;
}
