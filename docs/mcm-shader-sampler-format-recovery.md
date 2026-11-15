# Shader sampler-name formatter stack save

The pinned Wine shader formatter at wined3d `138260` calls `100830`, which
calls ucrtbase `__stdio_common_vsprintf`. For the unpadded `%s_sampler%u`
format, with sufficient destination capacity, its formatted-output callback
saves zero in stack memory later reused by the bike update.

`mcmSamplerFormatStackStore` models that one register save. Its input is the
stack pointer immediately before CALL `138260`; it does not infer whether
the renderer calls this formatter or account for every other formatting store.
The supported format has no sign, field width or precision modifiers. Buffer
growth and other format strings remain outside this model.

## Stack derivation

For caller stack pointer P, the wrapper and common-formatter frames put parser
`697c0` entry at P minus `8c`. The parser aligns its stack to 16 bytes, saves
the return address and EBP, then reserves `35c` bytes including saved registers.
Its body is therefore `alignDown(P - 8c, 16) - 364`.

Output helper `666a0` uses another `34` bytes including CALL and its prologue.
With no sign or padding emitted before the content, its EBX output count is
zero. Callback `733c0` saves this EBX with PUSH at `733c4`, at callback entry
minus `c`. The resulting save address is:

```
alignDown(P - 0x8c, 16) - 0x3a8
```

The original program-selection body stack `22f4cc` gives `ec5e0` body / formatter
caller P = `22f478`, and the predicted save is `22f038`, the observed physics
input slot. This address correspondence is not by itself proof that every
live zero overwrite uses this path.

## Native evidence

`shader-sampler-format-oracle.c` executes intact `138260` and the actual pinned
UCRT. It binds only the formatter import, guards the formatter/parser/callback
instructions, and seeds 2 KiB beneath each call before copying the post-return
stack without another C call. It records the caller address, formatted length,
text and raw stack; it does not produce expected save values.

All 480 cases match the recovered save address/value and formatted output:
four word-aligned stack residues, three prefixes (`ps`, `vs`, `unknown`) and
40 unsigned indices including 0–31 and boundaries through `ffffffff`.
A second native execution produces byte-identical output. The retained fixture
includes input/output hashes and both DLL hashes. The zero-save offset varies
with alignment: caller minus `438`, `43c`, `440` or `434`. A fixed subtraction
would be incorrect outside the particular original call alignment.

Build the oracle with 32-bit MinGW and run with the pinned wined3d DLL, input
and output paths. Each input is four DWORDs: alignment residue, prefix index,
unsigned sampler index, stack-fill word. Each output is 2,120 bytes: caller
ESP, formatted length, 64 text bytes, then 512 stack DWORDs from caller minus
`800` through caller minus four.

## Live connection and ordered world writes

A completed 270-site trace captures one sampler-binding invocation formatting
eight names. The checker derives each formatter caller stack from the binding
entry, verifies wrapper/common-formatter/parser stacks, and checks all 24
output callbacks. The two substitutions per name produce 16 saved-EBX writes
at the predicted physics input address; all values match zero. The literal
between substitutions uses a different callback stack. All 270 hooks were
restored and debugger detachment independently verified.

The same trace first changes the matrix word to the memcpy return address
inside callback 733c0, then changes it to zero during sampler formatting.
The census retains both transitions; the sampler model covers the latter.

The ordered world analyzer now commits computed sampler saves after completing
prior state-application writes. Without these saves, interval 23 predicts
1064518239 while the original enters with zero. With them, all 41 next-bike
checks pass. The retained replay matches 42 bike and 41 rider updates with
zero modeled physics differences, 41 computed caller words and zero observed
scratch substitutions. The scene check retains 76 nodes and verifies 3,040
node comparisons and 2,640 callback boundaries.

The live formatter checker rejects changed stack addresses, saved values and
missing entries. Its invocation boundaries and sampler counts are still
observed, not produced by a complete shader-cache simulation. The separately
recovered sampler-binding gate validates its own ordering against native
execution, but its mapping producer and upstream eligibility remain open.
The older negative captures lack these detailed boundaries and continue to
fail strictly. The original frame-38 steering failure is not closed by this
42-frame validation. Preview handling remains unchanged.
