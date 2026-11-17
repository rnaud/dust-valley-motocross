# Experimental art rendering

The selectable Painted landscape, Watercolor, PS1 motocross, Outlined pixel art and ASCII world modes are original implementations informed by these references. No third-party shader code is bundled.

- Procedural brushwork: https://github.com/SeloSlav/threejs-stylized-paint-shader
- Kuwahara/painterly techniques: https://blog.maximeheckel.com/posts/on-crafting-painterly-shaders/
- Retro rendering reference: https://github.com/lferreira457/threejs-psx-shader
- Pixel outlines: https://threejs.org/examples/webgl_postprocessing_pixel.html
- ASCII reference: https://threejs.org/examples/webgl_effects_ascii.html

Painted landscape uses a bounded, directional four-quadrant Kuwahara filter and surface-anchored pigment variation. Watercolor uses depth-aware washes, pigment edges and pale highlights. Both cap the source render width at 960 pixels to bound sampling costs; physical-device performance still varies.

PS1 uses a 240-line render target, 15-bit color, ordered dithering, and vertex snapping. Mapped standard/basic materials also use affine color-texture interpolation. Existing material hooks and cache identities are preserved. Original material callbacks and cache keys are restored when another style is selected. Terrain's custom atlas mapping retains its own projection.

Pixel art uses full-color quantization and reciprocal-depth silhouette outlines. ASCII uses an embedded 64-by-8 glyph atlas generated in code. Neither adds image downloads. Styles apply to gameplay and photo exports; they never change physics state.
