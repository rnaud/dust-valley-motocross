// Initial-world validation shared by browser gameplay and reference replay.
// Deep comparisons here are restricted to captured plain data, not runtime graphs.
function fail(message){throw Error(message??'Captured world invariant differs');}
function same(a,b){
 if(Object.is(a,b))return true;
 if(!a||!b||typeof a!=='object'||typeof b!=='object')return false;
 if(Array.isArray(a)!==Array.isArray(b))return false;
 const allowed=x=>Array.isArray(x)||Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null;
 if(!allowed(a)||!allowed(b))throw Error('Unsupported captured-data comparison');
 const keys=Object.keys(a),other=Object.keys(b);
 return keys.length===other.length&&(!Array.isArray(a)||a.length===b.length)&&keys.every(k=>Object.hasOwn(b,k)&&same(a[k],b[k]));
}
export default {
 ok(value,message){if(!value)fail(message);},
 equal(actual,expected,message){if(!Object.is(actual,expected))fail(message??`Captured value differs: ${actual} != ${expected}`);},
 deepEqual(actual,expected,message){if(!same(actual,expected))fail(message);},
};
