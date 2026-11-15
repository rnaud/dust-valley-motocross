# Indexed actor draw stack derivation

The world-writer replay now derives actor state-application addresses from the original call path. Captured application ESP values are comparison outputs. Nested rider wrapper addresses also come from the recovered child traversal, rather than being independent stack inputs.

## Original call path

For the prepared ordinary draw path, starting at wrapper entry `W`:

| Transition | Stack reduction | Evidence |
| --- | ---: | --- |
| Wrapper to node dispatcher | `ec` | Wrapper locals/saves plus CALL |
| Node dispatcher to model draw | `8` | Saved register plus CALL |
| Model draw body | `f0` | `445870`: `e0` locals and four saved registers |
| Device method entry | `24` | Eight arguments, CALL at `445f85`, return `445f88` |
| Indexed helper entry | `1c` | ddraw `f530`: saved EBP, `14` locals, CALL; return `f566` |
| State application entry | `60` | ddraw `ea20`: four saved registers, `4c` locals, CALL; return `ebf6` |

All offsets are hexadecimal. The import thunk tail-jumps without adding another return address. Thus `applyEntryEsp = W - 284`, with uint32 wrapping. The model preserves each intermediate address rather than fitting an observed difference.

The child traversal already recovered at `4206c0` places a nested wrapper `f8` bytes below its parent. Wrapper exits are checked at `W-e8`. The integration validates actor identity, frame, nesting, exits and hidden status, and rejects application stacks inconsistent with this path.

## Native validation

The new five-frame metadata capture observes six actor applications: three bike and three rider. All derived application ESP values and both Wine frame pointers match. The actual return addresses identify the helper, method and original indexed-draw call. The original model routine uses EBP as a vertex pointer, so a third linked value is not treated as a stack frame.

The independent 42-frame combined capture has 52 actor applications, all matching the derived path. It also checks 82 nested wrappers and 82 root wrapper boundaries, including culled AI wrappers. The combined writer regression now supplies computed actor application addresses to binding, SSE, heap and next-bike checks. The 8,334 non-actor application addresses remain observed inputs.

All 41 next-bike scratch results still match. With computed writes applied between world intervals, the replay matches 42 bike frames and 41 rider ticks with zero modeled physics differences and 881,090 visual differences. These are the same capture results with fewer stack boundary inputs, not a new full-parity claim.

Mutation tests reject altered application addresses, root/child wrapper positions and hidden wrappers, while confirming the raw capture remains unchanged. The metadata capture completed with all 174 observation sites restored and debugger absent.

## Reproduction and scope

Compile `capture-indexed-draw-stack.c` with 32-bit MinGW, using the scripted ten-record capture setup from the binding capture. It adds stack metadata reads at the existing state-application observation, with no new breakpoint sites. The dedicated metadata reader follows only the two Wine EBP frames. Verify restoration with `verify-render-heap.c` and the HUD, render-binding and binding-gate macros.

Root wrapper positions, draw invocation order, prepared graphics state, camera matrices, HUD/font boundaries, allocator results and non-actor stack placement remain inputs. This path does not cover arbitrary preparation, virtual fallback or alternative indexed-draw implementations. The old frame-38 physics failure and longer throttle-release validation remain open. Preview handling is unchanged.
