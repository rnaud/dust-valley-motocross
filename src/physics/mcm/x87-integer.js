// Original 0x4be978 truncates with FISTP qword and returns EDX:EAX.
// Callers that use only EAX see zero for invalid/out-of-range conversions:
// the x87 integer indefinite is 0x8000000000000000, whose low word is zero.
export function mcmFtolLowWord(value){
 if(!(value>=-(2**63)&&value<2**63))return 0;
 return Math.trunc(value)|0;
}
