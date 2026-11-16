// Parse exact experiment choices before touching the reference process.
// Legacy HOLD=1 keeps its established meaning (12 alone, 48 with pursuit).
static int parse_world_capture_protocol(const char*pulse,const char*hold,const char*pursuit,int*outThrottle,int*outPursuit){
 int p=0,t=0;
 if(pulse&&hold)return 0;
 if(pursuit){if(!strcmp(pursuit,"1"))p=1;else if(!strcmp(pursuit,"2"))p=2;else return 0;}
 if(pulse){if(strcmp(pulse,"1")||p)return 0;t=1;}
 if(hold){
  if(p){if(!strcmp(hold,"1")||!strcmp(hold,"48"))t=3;else if(!strcmp(hold,"96"))t=4;else return 0;}
  else {if(strcmp(hold,"1")&&strcmp(hold,"12"))return 0;t=2;}
 }else if(p)return 0;
 *outThrottle=t;*outPursuit=p;return 1;
}
