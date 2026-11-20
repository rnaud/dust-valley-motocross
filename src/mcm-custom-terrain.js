// Builds an MCM-format terrain tree from a height function, so the recovered
// bike can ride terrain that never existed in the original game.
//
// Layout is the one sampleMcmTerrain/queryMcmTerrainHeight expect: a root of
// level L splits the grid into 16x16 blocks per level, level-1 nodes hold 16x16
// leaves, and each leaf owns 16x16 cells with a 17x17 sample border shared with
// its neighbours. Cell size is 1/worldToGrid original feet.
const FEET=.3048,HEIGHT_SCALE=3/256,CELLS_PER_LEAF=16,LEAVES_PER_BLOCK=16;

// Native terrain heights are unsigned 16-bit counts of heightScale feet. Shift
// the whole field so a map that dips below sea level still fits, then round.
export function mcmHeightScale(feet){return Math.round(feet/HEIGHT_SCALE);}

export function createMcmHeightField({heightAt,cells=1024,worldToGrid=1/3,originCellX=0,originCellZ=0}){
 cells=Math.ceil(cells/CELLS_PER_LEAF)*CELLS_PER_LEAF;originCellX=Math.ceil(originCellX/CELLS_PER_LEAF)*CELLS_PER_LEAF;originCellZ=Math.ceil(originCellZ/CELLS_PER_LEAF)*CELLS_PER_LEAF;
 const cellFeet=1/worldToGrid,covered=cells+CELLS_PER_LEAF,samples=covered+1,ground=new Float32Array(samples*samples);
 let lowest=Infinity,highest=-Infinity;
 for(let j=0;j<samples;j++)for(let i=0;i<samples;i++){
  const metres=heightAt((originCellX+i)*cellFeet,(originCellZ+j)*cellFeet);
  if(!Number.isFinite(metres))throw Error('Custom terrain height is not finite');
  ground[j*samples+i]=metres;if(metres<lowest)lowest=metres;if(metres>highest)highest=metres;
 }
 const offset=lowest<0?1-lowest:1,stored=metres=>Math.max(0,Math.min(65535,mcmHeightScale((metres+offset)/FEET)));
 const heights=new Uint16Array(samples*samples),heightsAt=(i,j)=>ground[Math.min(samples-1,Math.max(0,j))*samples+Math.min(samples-1,Math.max(0,i))];
 for(let k=0;k<heights.length;k++)heights[k]=stored(ground[k]);
 // Central differences give the slope in feet per foot, matching the
 // unnormalised (-dh/dx, 1, -dh/dz) convention the leaf records use.
 const normals=new Float32Array(samples*samples*3);
 for(let j=0;j<samples;j++)for(let i=0;i<samples;i++){
  const dx=(heightsAt(i+1,j)-heightsAt(i-1,j))/(2*cellFeet*FEET),dz=(heightsAt(i,j+1)-heightsAt(i,j-1))/(2*cellFeet*FEET);
  const inverse=1/Math.sqrt(dx*dx+1+dz*dz),at=(j*samples+i)*3;
  normals[at]=-dx*inverse;normals[at+1]=inverse;normals[at+2]=-dz*inverse;
 }
 // Leaves are addressed in absolute cell coordinates: the sampler walks from
 // the root using x>>8 and x>>4, so a field that starts at cell 1136 must place
 // block 4 / leaf 71 in the same slots the original terrace uses.
 const blockCells=CELLS_PER_LEAF*LEAVES_PER_BLOCK,endX=originCellX+covered,endZ=originCellZ+covered;
 const root={level:2,shift:16,children:new Array(16*16).fill(null),bias:0,scale:1,minimumHeight:0,maximumHeight:65535,originX:0,originY:0};
 const firstBlockX=Math.floor(originCellX/blockCells),firstBlockZ=Math.floor(originCellZ/blockCells);
 const lastBlockX=Math.ceil(endX/blockCells),lastBlockZ=Math.ceil(endZ/blockCells);
 if(lastBlockX>16||lastBlockZ>16)throw Error('Custom terrain exceeds the 4096-cell root table');
 for(let bz=firstBlockZ;bz<lastBlockZ;bz++)for(let bx=firstBlockX;bx<lastBlockX;bx++){
  const block={level:1,shift:4,children:new Array(LEAVES_PER_BLOCK*LEAVES_PER_BLOCK).fill(null),bias:0,scale:1,minimumHeight:0,maximumHeight:65535,originX:bx*blockCells,originY:bz*blockCells};
  for(let lz=0;lz<LEAVES_PER_BLOCK;lz++)for(let lx=0;lx<LEAVES_PER_BLOCK;lx++){
   const originX=bx*blockCells+lx*CELLS_PER_LEAF,originY=bz*blockCells+lz*CELLS_PER_LEAF;
   if(originX<originCellX||originY<originCellZ||originX>=endX||originY>=endZ)continue;
   const leaf={level:0,shift:0,bankIndex:0,bias:0,scale:1,originX,originY,textureIndex:-1,tileIndex:0,textureOrientation:0,textureField4c:0,
    heights:new Array(17*17),normals:new Array(17*17)};
   let low=65535,high=0;
   for(let j=0;j<17;j++)for(let i=0;i<17;i++){
    const gi=originX-originCellX+i,gj=originY-originCellZ+j,source=gj*samples+gi,index=j*17+i;
    leaf.heights[index]=heights[source];leaf.normals[index]=[normals[source*3],normals[source*3+1],normals[source*3+2]];
    if(heights[source]<low)low=heights[source];if(heights[source]>high)high=heights[source];
   }
   leaf.minimumHeight=low;leaf.maximumHeight=high;
   block.children[lz*LEAVES_PER_BLOCK+lx]=leaf;
  }
  root.children[bz*16+bx]=block;
 }
 return {root,heightScale:HEIGHT_SCALE,worldToGrid,offset,lowest,highest};
}

// The preview maps native feet to world metres; sampling the custom map means
// asking its world-space height function at the place a native cell lands on.
export function createCustomMcmTerrain({heightAtWorld,nativeToWorld,initial,cells=1024,worldToGrid=1/3}){
 const originCellX=Math.max(0,Math.floor(initial[0]*worldToGrid)-cells/2);
 const originCellZ=Math.max(0,Math.floor(initial[2]*worldToGrid)-cells/2);
 const field=createMcmHeightField({heightAt:(x,z)=>{const world=nativeToWorld(x,z);return heightAtWorld(world.x,world.z);},cells,worldToGrid,originCellX,originCellZ});
 return {root:field.root,heightScale:field.heightScale,worldToGrid:field.worldToGrid,offset:field.offset,cells,originCellX,originCellZ};
}

// Stub tree for the bootstrap pass that runs before the real field exists: a
// childless root returns height 0 for any coordinate instead of throwing.
export function createMcmTerrainStub({heightScale=HEIGHT_SCALE,worldToGrid=1/3}={}){
 return {root:0,nodes:{0:{level:2}},banks:{},heightScale,worldToGrid};
}
