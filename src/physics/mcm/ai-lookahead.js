import {mcmSqrtLookup as sqrt,floatBits as bits,bitsFloat as float} from './math.js';
import {mcmInverseSqrtSeed as inverse} from './inverse-sqrt.js';
const f=Math.fround,gravity=f(32.2),g2=f(.06211179867386818),g4=f(.015527949668467045),g1=f(.03105589933693409),halfGravity=f(16.1),tau=f(Math.PI*2),wrap=x=>{let y=f(x);if(x>Math.PI)y=f(y-tau);if(!(y>-Math.PI))y=f(y+tau);return y;},cat=n=>[3,4,5,6].includes(n.kind);
// Original 46eb14..46f0a4. Height queries use the supplied recovered terrain.
// Point and jumpFlag are retained state; caller inputs are not output snapshots.
export function computeMcmAiLookahead(p){
 const {nodes,table,head,speed,sin,cos,enabled,airborne,x,z,heading,avoidance,queryHeight,worldHeight,margin,lookahead}=p;
 let point=[...p.point],speedLimit=p.speedLimit,steering=p.steering,targetHeading=p.targetHeading,turnScale=p.turnScale,jumpFlag=p.jumpFlag,stopped=false,projected=0,queries=0;
 for(let i=0;enabled&&i<5;i++){
  let index=(p.routeDifference>2?p.targetIndex:p.nearestIndex)+i;if(index>=table.length)index-=table.length;
  const start=nodes.get(table[index]);if(!start)throw Error('Route index outside table');let nextAddress=start.next||head,next=nodes.get(nextAddress);
  const squared=()=>f((next.z-start.z)**2+(next.x-start.x)**2),inv=inverse(squared());
  if(airborne||stopped||!cat(start))continue;
  let distance=0;
  if(i<3){
   distance=f(speed*speed*sin*cos*g2);if(distance<0||Number.isNaN(distance))distance=0;
   point[0]=f((next.x-start.x)*inv*distance+start.x);point[2]=f((next.z-start.z)*inv*distance+start.z);point=queryHeight(point);queries++;
   const raw=sin*speed,a=f(raw);if(point[1]-start.y>raw*raw*g4)point[1]=start.y;
   const rawT=a*g1,t=f(rawT);distance=f((sqrt(f((start.y-point[1])*g2+rawT*rawT))+t)*cos*speed);
  }else stopped=true;
  let visits=0;
  while(!stopped){
   if(++visits>nodes.size+1)throw Error('Lookahead cycle');
   const length=sqrt(squared()),class27=[2,7].includes(next.kind),class3456=cat(next);let elapsed=0,landing=0;
   if(nextAddress===head){elapsed=f((margin+length)/(cos*speed));landing=f(Math.abs(sin*speed*elapsed-elapsed*elapsed*halfGravity-worldHeight*f(11.5)+start.y));}
   const skip=distance>=length&&Math.abs(length-distance)>=margin&&!class27&&(nextAddress!==head||(bits(landing)|0)>=0x41700000);
   if(!skip){
    if(class3456){if(lookahead<distance)projected=f(margin+length);else{projected=distance;stopped=true;}}
    else if(class27)projected=f(length-margin);
    else if(nextAddress===head&&(bits(landing)|0)<0x41700000){const d=(margin+length)*cos;projected=sqrt(f(d*d/(elapsed*f(15))*gravity));}
    else{projected=distance;stopped=true;}
    const reciprocal=1/length;point[0]=f((next.x-start.x)*projected*reciprocal+start.x);point[2]=f((next.z-start.z)*projected*reciprocal+start.z);point=queryHeight(point);queries++;
    if(start.y-point[1]<speed*speed*-g4)point[1]=start.y;
    if(!stopped){if(!avoidance){speedLimit=sqrt(f(projected*projected/(sin*cos*projected+cos*cos*(start.y-point[1]))*gravity*f(.5)));jumpFlag=speedLimit-speed<20?0:1;}stopped=true;}
   }
   if(!stopped){nextAddress=next.next||head;next=nodes.get(nextAddress);if(nextAddress===table[index])stopped=true;}
  }
  if(lookahead<projected&&(bits(point[0])|0)>0&&(x!==point[0]||point[2]!==z)&&i<1){targetHeading=f(Math.atan2(point[0]-(avoidance?start.x:x),point[2]-(avoidance?start.z:z)));steering=wrap(targetHeading-heading);turnScale=2;}
 }
 return {point,speedLimit,steering,targetHeading,turnScale,jumpFlag,queries};
}
