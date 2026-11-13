import {evaluateDynamicCollision} from './dynamic-collision-response-case.mjs';
import {primaryMcmCollision,secondaryMcmCollision} from '../../src/physics/mcm/collision-callback.js';
export function evaluateConnectedCollisionCallback(c){
 return evaluateDynamicCollision(c,c.secondary?secondaryMcmCollision:primaryMcmCollision);
}
