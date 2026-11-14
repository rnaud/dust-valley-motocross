import {startMcmAnimation} from './animation-seek.js';

// Original 0x40ea7c..0x40ec1a, inside the separate 0x40e990 rider tick.
// The selected-animation branch is observed. The null-record branch changes
// transforms and collider state and must not be replaced by this transition.
export function beginMcmRiderTick({rider,animation,selectedRecord}){
 if(!rider.flag13c)return false;
 if(!selectedRecord)throw Error('Rider tick without a selected animation is not connected');
 rider.fieldf8=.25;rider.field144=0;rider.flag13c=0;rider.field154=-1;
 startMcmAnimation(animation,selectedRecord);
 rider.field140=1;rider.field138=0;
 return true;
}
