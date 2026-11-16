// Original 43b350 comparator plus pinned CRT 4bec70/4bede0 sorting.
// Preserve the CRT's equal-key permutation; Array.sort has different ties.
export function sortMcmParticlesByDepth(items,depth){
 const compare=(left,right)=>{const a=Math.fround(depth(left)),b=Math.fround(depth(right));return !(b>=a)?-1:b>a?1:0;};
 const swap=(a,b)=>{const value=items[a];items[a]=items[b];items[b]=value;};
 const pending=items.length>1?[[0,items.length-1]]:[];
 while(pending.length){
  let [lo,hi]=pending.pop();
  if(hi-lo+1<=8){
   while(hi>lo){let max=lo;for(let i=lo+1;i<=hi;i++)if(compare(items[i],items[max])>0)max=i;swap(max,hi--);}
   continue;
  }
  swap(lo+Math.floor((hi-lo+1)/2),lo);
  let i=lo,j=hi+1;
  for(;;){
   do{i++;}while(i<=hi&&compare(items[i],items[lo])<=0);
   do{j--;}while(j>lo&&compare(items[j],items[lo])>=0);
   if(j<i)break;swap(i,j);
  }
  swap(lo,j);
  if(lo+1<j)pending.push([lo,j-1]);
  if(i<hi)pending.push([i,hi]);
 }
 return items;
}
