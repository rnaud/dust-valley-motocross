// Pinned Wine 138260 -> 100830 -> UCRT common_vsprintf -> 697c0.
// Only the unpadded "%s_sampler%u" path with sufficient destination capacity.
// Shader eligibility, invocation ordering, and other formatter writes are not
// inferred here. callerEsp is the stack pointer before CALL 138260.
export function mcmSamplerFormatStackStore({callerEsp}) {
 if(!Number.isInteger(callerEsp)||callerEsp<0x800||callerEsp>0xffffffff||(callerEsp&3))throw Error('Invalid formatter caller stack');
 // Parser entry is caller-8c; it aligns ESP before saving return and EBP.
 // Its body is EBP-35c. Output helper 666a0 reserves another 34 bytes.
 // Callback 733c0 then saves EBX at its entry-c (instruction 733c4).
 // No padding/sign prefix is emitted on this format path, so EBX is zero.
 const parserAligned=((callerEsp-0x8c)&0xfffffff0)>>>0;
 return {address:(parserAligned-0x3a8)>>>0,value:0};
}
