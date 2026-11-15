# Exact HUD stack store

The internal Wine instruction behind the previously observed DrawText scratch clear is now identified and live-validated. It is `USER32 + 22f84`, inside exported `DrawTextExW` (entry RVA `21fc0`):

```
c7 85 48 f7 ff ff 00 00 00 00    mov dword ptr [ebp - 8b8], 0
```

In the captured original process, `EBP = 22f8f0`, so this writes `22f038`, the reused bike caller slot consumed at physics stack offset `54`. The zero was already present by the later heap-free observation; that allocator call was not the clearing instruction.

## Branch and stores

The model starts at `2240d`, immediately after native line measurement returns. It uses the measured fit count at `EBP-860`, unsigned segment count in EBX, format at `EBP-8a4`, and frame base. The code first clears `EBP-8ac`. If fit is below count it branches to overflow layout (`22d70`). If the line fits and format bit `8000` is set, it branches to ellipsis processing (`22ac8`). Otherwise it clears locals at `EBP-89c`, `EBP-87c` and `EBP-8b8`, then continues drawing at `22660`.

The latter is the captured original HUD row path: format `124`, fit/count pairs 16/16 and 7/7. Other layout branches are returned explicitly, not treated as a completed draw or a zero of the watched slot.

## Native validation

The isolated oracle executes the intact measured-line decision and stores, redirecting only the three outgoing boundaries to return to its harness. Inputs contain fit, count, format and four prior local words. Outputs contain branch identity and those four words. No font API outputs or scratch observations are supplied as replacement result values.

All 4,096 cases / 20,480 output words match: 2,006 draw paths, 699 ellipsis paths and 1,391 overflow paths. Cases include unsigned comparison boundaries, equality, arbitrary flag combinations and arbitrary previous memory words. The fixture records input/output hashes and USER32 SHA-256 `6bc9d98d72f6f2e7a17d0c7f9dc62477f5d39ead0373f788ae60fb137b98e925`.

The live capture records inputs at `2240d`, memory immediately before `22f84`, and memory immediately after at `22f8e`. All six triplets match predicted addresses and values. Three entered with nonzero words and cleared them; three already contained zero. Inputs and prior memory remain unchanged between the input and pre-store observations. Stack movement is exactly 28 bytes over the measured-line entry sequence.

`capture-hud-line-stores.c` enables three additional guarded non-CALL/non-REP hooks on the shared 167-hook capture. Its companion verifier is built from `verify-render-heap.c` with `-DMCM_CAPTURE_HUD_LINE_STORES`, checking all 170 sites. Independent cleanup confirmed all restored and debugger absent. The default heap capture retains its original 167 hooks.

## Limits and next integration

This is a measured-line stage, not a complete font renderer. Font measurement, text/layout preparation, stack placement, HUD clock scheduling and subsequent world writers must be connected before the model can authoritatively supply the next physics entry's scratch value. Frame base and measured fit remain explicit stage inputs.

The older negative-steering fixture still fails at frame 38. Prior ordered-world evidence shows later writes replacing HUD zeros in other sessions. Therefore no unconditional HUD reset, frame-number reset, or captured scratch injection has been added to physics. Preview handling is unchanged.
