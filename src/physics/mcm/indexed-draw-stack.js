// Prepared ordinary node draw through original 445870/445f85, ddraw f530,
// ddraw ea20 and the tail import thunk to wined3d state application.
// Wrapper entry remains a caller boundary; other draw paths are not modeled.
export function mcmIndexedDrawStack(wrapperEntryEsp) {
  if(!Number.isInteger(wrapperEntryEsp)||wrapperEntryEsp<0||wrapperEntryEsp>0xffffffff)throw new RangeError('Invalid wrapper stack address');
  const nodeEntryEsp=(wrapperEntryEsp-0xec)>>>0; // wrapper locals/saves + CALL
  const modelDrawEntryEsp=(nodeEntryEsp-8)>>>0; // dispatcher save + CALL
  const modelDrawBodyEsp=(modelDrawEntryEsp-0xf0)>>>0; // e0 locals, four saves
  const deviceMethodEntryEsp=(modelDrawBodyEsp-0x24)>>>0; // eight args + CALL
  const indexedHelperEntryEsp=(deviceMethodEntryEsp-0x1c)>>>0; // EBP, 14 locals, CALL
  const stateApplyEntryEsp=(indexedHelperEntryEsp-0x60)>>>0; // four saves, 4c locals, CALL
  return {nodeEntryEsp,modelDrawEntryEsp,modelDrawBodyEsp,deviceMethodEntryEsp,indexedHelperEntryEsp,stateApplyEntryEsp,
    helperFrameBase:(indexedHelperEntryEsp-4)>>>0,methodFrameBase:(deviceMethodEntryEsp-4)>>>0};
}
