const f=Math.fround;
// Inline rigid-joint compensation in original 0x40e990. Keep the native
// per-element addition order and float stores; generic matrix products differ.
export function compensateMcmRiderGroundTransform(previousJoint,nextJoint,world){
 let copy=[...nextJoint],inverseY,inverseZ;
 const correction=Array(16),body=[...world];
 inverseY=f(-(copy[12] * nextJoint[4] + copy[5] * copy[13] + copy[14] * copy[6]));
 inverseZ=f(-(copy[12] * nextJoint[8] + copy[9] * copy[13] + copy[14] * copy[10]));
 copy[12]=f(-(copy[13] * nextJoint[1] + copy[14] * nextJoint[2] + copy[12] * copy[0]));
 correction[0]=f(nextJoint[4] * previousJoint[4] + nextJoint[8] * previousJoint[8] + copy[0] * previousJoint[0] + copy[3] * previousJoint[12]);
 correction[1]=f(nextJoint[4] * previousJoint[5] + nextJoint[8] * previousJoint[9] + copy[3] * previousJoint[13] + copy[0] * previousJoint[1]);
 correction[2]=f(nextJoint[4] * previousJoint[6] + nextJoint[8] * previousJoint[10] + copy[3] * previousJoint[14] + copy[0] * previousJoint[2]);
 correction[3]=f(nextJoint[4] * previousJoint[7] + nextJoint[8] * previousJoint[11] + copy[3] * previousJoint[15] + copy[0] * previousJoint[3]);
 correction[4]=f(nextJoint[1] * previousJoint[0] + copy[7] * previousJoint[12] + copy[5] * previousJoint[4] + copy[9] * previousJoint[8]);
 correction[5]=f(nextJoint[1] * previousJoint[1] + copy[7] * previousJoint[13] + copy[5] * previousJoint[5] + copy[9] * previousJoint[9]);
 correction[6]=f(nextJoint[1] * previousJoint[2] + copy[9] * previousJoint[10] + copy[7] * previousJoint[14] + copy[5] * previousJoint[6]);
 correction[7]=f(nextJoint[1] * previousJoint[3] + copy[7] * previousJoint[15] + copy[9] * previousJoint[11] + copy[5] * previousJoint[7]);
 correction[8]=f(nextJoint[2] * previousJoint[0] + previousJoint[4] * copy[6] + copy[10] * previousJoint[8] + copy[11] * previousJoint[12]);
 correction[9]=f(nextJoint[2] * previousJoint[1] + previousJoint[5] * copy[6] + copy[10] * previousJoint[9] + copy[11] * previousJoint[13]);
 correction[10]=f(nextJoint[2] * previousJoint[2] + previousJoint[6] * copy[6] + copy[10] * previousJoint[10] + copy[11] * previousJoint[14]);
 correction[11]=f(nextJoint[2] * previousJoint[3] + copy[6] * previousJoint[7] + copy[11] * previousJoint[15] + copy[10] * previousJoint[11]);
 correction[12]=f(previousJoint[4] * inverseY + previousJoint[8] * inverseZ + copy[15] * previousJoint[12] + copy[12] * previousJoint[0]);
 correction[13]=f(previousJoint[5] * inverseY + previousJoint[9] * inverseZ + copy[15] * previousJoint[13] + copy[12] * previousJoint[1]);
 correction[14]=f(previousJoint[6] * inverseY + previousJoint[10] * inverseZ + copy[12] * previousJoint[2] + copy[15] * previousJoint[14]);
 correction[15]=f(previousJoint[7] * inverseY + previousJoint[11] * inverseZ + copy[12] * previousJoint[3] + copy[15] * previousJoint[15]);
 copy=[...body];
 body[0]=f(body[0] * correction[0] + body[1] * correction[4] + body[3] * correction[12] + body[2] * correction[8]);
 body[1]=f(correction[1] * copy[0] + correction[13] * copy[3] + correction[9] * copy[2] + correction[5] * copy[1]);
 body[2]=f(correction[2] * copy[0] + correction[14] * copy[3] + correction[6] * copy[1] + correction[10] * copy[2]);
 body[3]=f(correction[3] * copy[0] + correction[7] * copy[1] + correction[15] * copy[3] + correction[11] * copy[2]);
 body[4]=f(correction[0] * copy[4] + correction[4] * copy[5] + correction[12] * copy[7] + correction[8] * copy[6]);
 body[5]=f(correction[13] * copy[7] + correction[1] * copy[4] + correction[9] * copy[6] + correction[5] * copy[5]);
 body[6]=f(correction[14] * copy[7] + correction[10] * copy[6] + correction[6] * copy[5] + correction[2] * copy[4]);
 body[7]=f(correction[3] * copy[4] + correction[15] * copy[7] + correction[11] * copy[6] + correction[7] * copy[5]);
 body[8]=f(correction[0] * copy[8] + correction[8] * copy[10] + correction[4] * copy[9] + correction[12] * copy[11]);
 body[9]=f(correction[13] * copy[11] + correction[1] * copy[8] + correction[5] * copy[9] + correction[9] * copy[10]);
 body[10]=f(correction[14] * copy[11] + correction[10] * copy[10] + correction[2] * copy[8] + correction[6] * copy[9]);
 body[11]=f(correction[3] * copy[8] + correction[15] * copy[11] + correction[11] * copy[10] + correction[7] * copy[9]);
 body[12]=f(correction[0] * copy[12] + correction[4] * copy[13] + correction[8] * copy[14] + correction[12] * copy[15]);
 body[13]=f(correction[13] * copy[15] + correction[5] * copy[13] + correction[1] * copy[12] + correction[9] * copy[14]);
 body[14]=f(correction[14] * copy[15] + correction[10] * copy[14] + correction[6] * copy[13] + correction[2] * copy[12]);
 body[15]=f(correction[3] * copy[12] + correction[15] * copy[15] + correction[11] * copy[14] + correction[7] * copy[13]);
 return body;
}
