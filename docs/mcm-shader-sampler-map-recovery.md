# Shader sampler range and map selection

`mcmShaderSamplerMap` recovers intact pinned wined3d `1a43e0` and its modern
range helper `1db660`. It retains the context's sampler map for null and
legacy shaders; modern shaders return a null map and use direct unit indices.

A null shader selects first 0 / count 8. Shader major version is read as a
byte. Versions through 3 select first 0 / count 16 for pixel shaders, first
16 / count 4 for vertex shaders, and an empty range for other types.

For modern stages 0–4, first is the unsigned 32-bit sum of preceding stage
counts and count is the selected stage's limit. Unknown stages retain the
sum of all five counts but return count zero. Stage 5 is special: first is
the compute offset unless that offset equals the combined unit limit, in
which case first is zero; count is the separate compute sampler count.
This is an equality rule, not a minimum or clamp.

## Native evidence

The oracle executes both routines intact, with only debug logging disabled.
All 4,096 cases / 12,288 output words match. Coverage includes null shaders,
legacy and modern types, unknown types, major-byte truncation, unsigned sum
overflow, and both compute-offset equality outcomes (130 equal / 84 unequal
modern compute cases). A second native run produces byte-identical output.
Map identity is checked in addition to first/count.

Build `shader-sampler-map-oracle.c` with 32-bit MinGW. Arguments are the pinned
wined3d DLL, input path and output path. Input has 11 DWORDs: null-shader flag,
type, major version, five stage counts, compute count, compute offset and
combined unit limit. Output has first, count and a flag indicating that the
returned pointer equals context + `574` rather than null.

## Connection to the live writer

The binding model now uses the recovered mapper by default. The existing
explicit mapping callback remains available as an oracle boundary. Six native
binding cases independently match the composed fixed-function path, including
its formatting, location queries, updates and buffer lifecycle.

The live formatter checker is restricted to the return site `d5a98`, whose
caller supplies a null shader. It derives eight formats and verifies the
returned mapping pointer from the captured context address. The observed
mapping-return boundary establishes that the early-return gate was passed;
that gate's inputs are not silently assumed. Missing whole format calls,
changed map pointers and changed saves fail validation. The retained 42-bike /
41-rider comparison remains at zero modeled physics differences without
observed scratch substitution.

Shader-cache scheduling, capability inputs and the contents/producers of the
legacy unit map still need retained-state integration. The older frame-38
steering failure remains unresolved. Preview handling is unchanged.
