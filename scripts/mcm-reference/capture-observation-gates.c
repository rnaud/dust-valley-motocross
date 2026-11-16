// Exactly the existing world-query recording predicate. Keep calls outside
// selected bike/rider updates observable, including unknown caller sites.
static int ai_query_observable(unsigned frames,int bike_active,int rider_active){
 return frames&&!bike_active&&!rider_active;
}
// -1 means leave the instruction alone. Never re-arm a query instruction while
// it is restored for its pending single step; reconcile at that step's return.
static int ai_query_hook_action(int enabled,int installed,int done,int pending,int armed,unsigned frames,int bike_active,int rider_active){
 if(!enabled||!installed||done||pending==8)return -1;
 int wanted=ai_query_observable(frames,bike_active,rider_active);
 return wanted==armed?-1:wanted;
}
static int ai_substep_observable(unsigned frames,int bike_active){return frames&&bike_active;}
static int ai_substep_hook_action(int enabled,int installed,int done,int pending,int hook,int armed,unsigned frames,int bike_active){
 if(!enabled||!installed||done||hook<11||hook>16||pending==hook)return -1;
 int wanted=ai_substep_observable(frames,bike_active);return wanted==armed?-1:wanted;
}
