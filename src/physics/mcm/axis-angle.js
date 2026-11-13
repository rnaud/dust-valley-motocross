import {mcmAdd as add,mcmMultiply as mul,mcmSubtract as sub,mcmDivide as div} from './x87-arithmetic.js';
import {mcmSinCos} from './x87-trig.js';
// Axis-angle construction from 0x4b7d90. Temporaries preserve instruction
// order and asymmetric float32 stores; trig equivalence requires oracle checks.
export function mcmAxisAngleMatrix(axis, angle) {
  const t0 = mul(axis[0],axis[0]);
  const t1 = mul(axis[1],axis[1]);
  const t2 = mul(axis[2],axis[2]);
  const t3 = add(t0,t1);
  const t4 = add(t3,t2);
  const t5 = Math.sqrt(t4);
  const t6 = div(axis[0],t5);
  const t7 = div(axis[1],t5);
  const t8 = div(axis[2],t5);
  const {sin:t10,cos:t9}=mcmSinCos(angle);
  const t11 = sub(1,t9);
  const t12 = mul(t6,t6);
  const t13 = mul(t12,t11);
  const t14 = add(t13,t9);
  const t15 = Math.fround(t14);
  const t16 = mul(t6,t7);
  const t17 = mul(t16,t11);
  const t18 = Math.fround(t17);
  const t19 = mul(t8,t10);
  const t20 = Math.fround(t19);
  const t21 = add(t19,t18);
  const t22 = Math.fround(t21);
  const t23 = mul(t6,t11);
  const t24 = mul(t23,t8);
  const t25 = Math.fround(t24);
  const t26 = mul(t7,t10);
  const t27 = Math.fround(t26);
  const t28 = sub(t25,t26);
  const t29 = Math.fround(t28);
  const t30 = sub(t18,t20);
  const t31 = Math.fround(t30);
  const t32 = mul(t7,t7);
  const t33 = mul(t32,t11);
  const t34 = mul(t10,t6);
  const t35 = add(t33,t9);
  const t36 = Math.fround(t35);
  const t37 = mul(t7,t11);
  const t38 = mul(t37,t8);
  const t39 = add(t38,t34);
  const t40 = add(t25,t27);
  const t41 = mul(t8,t8);
  const t42 = Math.fround(t39);
  const t43 = mul(t41,t11);
  const t44 = Math.fround(t40);
  const t45 = sub(t38,t34);
  const t46 = Math.fround(t45);
  const t47 = add(t43,t9);
  const t48 = Math.fround(t47);
  // Array literals can canonicalize the first NaN in partially warmed execution.
  const result=new Float64Array(16);
  result[0]=t15;result[1]=t22;result[2]=t29;result[4]=t31;result[5]=t36;result[6]=t42;result[8]=t44;result[9]=t46;result[10]=t48;result[15]=1;
  return result;
}
