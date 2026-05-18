shader_type canvas_item;

// gpt-image-2 sprites are rendered against a cream/off-white background
// (~(245, 240, 220)). This shader discards pixels close to that color so the
// sprite renders without the visible round halo.

uniform vec3 cream_color : source_color = vec3(0.96, 0.94, 0.86);
uniform float threshold : hint_range(0.0, 0.6) = 0.20;
uniform float feather : hint_range(0.0, 0.4) = 0.06;

void fragment() {
    vec4 c = texture(TEXTURE, UV);
    float d = length(c.rgb - cream_color);
    // Hard discard inside threshold; soft alpha fade in the feather band.
    if (d < threshold) {
        discard;
    }
    float fade = clamp((d - threshold) / max(feather, 0.0001), 0.0, 1.0);
    COLOR = vec4(c.rgb, c.a * fade);
}
