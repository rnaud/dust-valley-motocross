// Original 0x4465b0. Callees perform preparation, drawing or virtual fallback;
// their internals are deliberately separate from this recovered dispatch.
export function dispatchMcmNodeDraw(node,{prepare,draw,fallback}){
 if(!node.hidden){if(node.renderable){if(!node.prepared)prepare();draw();}else fallback();}
 node.pending=1;return 1;
}
