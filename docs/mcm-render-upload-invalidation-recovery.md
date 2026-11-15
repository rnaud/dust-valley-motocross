# Upload follow-up command

The pinned Wine 11 command-33 handler at `wined3d+1b4d60` now has an isolated native oracle and a JavaScript model. This continues the resource upload chain; it does not change preview handling or establish full physics parity.

## Recovered behavior

The command contains `[33, kind, offset, count, flags]`. Kinds 0 and 1 dispatch the unchanged range to backend slots `14` and `18`. Kinds 6 and 7 dispatch to those same slots after computing:

```
start = offset >>> 4
end = ((offset + count + 16) >>> 0) >>> 4
count = (end - start) >>> 0
```

The addition is 16, including aligned endpoints. Offset 256 and byte count 64 produce start 16 and register count 5. Kinds 2–5 skip the callback. After the callback returns, every context in the device's `12f4` array receives `context[5c] |= flags`; the count is at `12f8`.

## Evidence and limits

`oracle-render-upload-invalidation.c` loads the pinned DLL without resolving imports and executes the intact handler. Backend callbacks record their slot and arguments; their effects are not simulated or claimed as covered. The handler's context writes execute natively. Input records contain five command words, a context count, and eight initial flag words. Output records contain callback count/slot/start/count and eight resulting flag words, including untouched contexts beyond the count.

The committed compressed fixture covers 4,096 cases and 49,152 output words with zero differences: all eight kinds, zero through eight contexts, aligned/unaligned boundaries, arbitrary flag bits and unsigned overflow. It includes input/output SHA-256 values and the pinned module SHA-256. Tests also check the extra aligned register explicitly.

A read-only lookup in the running original (Windows PID 292) found command stream `02350020`, device `0142a728`, one context, and backend callbacks `7a862f70` / `7a862f20` (module RVAs `f2f70` / `f2f20`). Both callbacks iterate register indices and invoke `144e40`; their native side effects still need recovery. No live debugger or instruction patches were used for this lookup.

The model is not a completed command executor: backend effects, their stack writes, and ordering relative to subsequent physics remain outstanding. The frame-38 trajectory mismatch remains unresolved.
