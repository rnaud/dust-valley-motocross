# Shader sampler binding gate and ordering

`bindMcmShaderSamplers` recovers pinned wined3d `ec5e0` with debug logging
disabled. It returns early only when explicit bindings are supported AND the
unsigned version exceeds `10031`. Otherwise it selects the shader prefix,
gets the sampler mapping and acquires a text buffer, even for zero samplers.

Every sampler is formatted and queried in order. Only location `ffffffff`
skips the mapping lookup. The sampler unit comes from the retained map at
`first + index`, or directly from that index when the map pointer is null.
The routine binds only units other than `ffffffff` that are below the current
unsigned unit limit. It releases the buffer after the loop. Thus missing
uniforms still incur formatting and its stack writes.

The model preserves the original reads: the prefix, program, mapping pointer
and range are retained; map entries and the capability object's unit limit
are read after each location query. Buffer, formatting and GL callbacks remain
explicit. The mapping producer is now recovered and used by default; an
explicit mapping callback remains available for oracle comparisons. The model does not infer when the
program-selection cache invokes this routine.

## Native validation

The oracle executes intact `ec5e0`, replacing mapping, text-buffer pool,
formatting and GL callbacks with recorders. All 4,096 cases / 528,384 output
DWORDs match, including 13,181 format calls, 8,130 uniform updates and 800
early returns. Repeated native output is byte-identical.

Coverage includes the strict version threshold, null and all six shader
types plus unknown types, zero/nonzero sampler counts, direct and mapped
units, invalid locations, signed-looking DWORD values, unit-limit boundaries,
and callbacks that mutate map entries or unit limits during location lookup.
These mutations test read timing, not a claim that real GL queries mutate them.
Formatting itself is independently covered by the sampler-format oracle.

Build `shader-sampler-bindings-oracle.c` with 32-bit MinGW; arguments are the
pinned wined3d DLL, input path and output path. Each input is 31 DWORDs:
flags, version, shader type, program, first sampler, count, unit limit,
16 map words and 8 locations. Flag bits are explicit-binding support, null
shader, map present, mutate limit during query, and mutate map during query.
Each output is 129 DWORDs: event count and up to 32 four-word events. Event
kinds are mapping, acquisition, formatting, query, binding and release.

The recovered mapper supplies ranges by default; shader-cache state and the
legacy map contents still need retained-state integration. See
`mcm-shader-sampler-map-recovery.md`. Preview handling is unchanged.
