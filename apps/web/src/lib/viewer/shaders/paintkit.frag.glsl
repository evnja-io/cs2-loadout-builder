precision highp float;

// Pattern texture (UV-tiled, per paint kit)
uniform sampler2D tPattern;
// Metalness map (per paint kit, was roughness)
uniform sampler2D tMetalness;
// Shared wear/grunge mask
uniform sampler2D tGrunge;

// CS2 color params from g_vColor0/1/2/3
uniform vec4 uColorA;
uniform vec4 uColorB;
uniform vec4 uColorC;
uniform vec4 uColorD;
uniform float uColorWarp;  // g_flColorBrightness
uniform float uPhase;      // g_flPhase (unused at base level, available for future use)

// Paintkit control
uniform float uWear;        // 0.0 (FN) → 1.0 (BS)
uniform float uSeed;        // normalized: (seed-1)/999 → [0,1]
uniform int   uFinishStyle; // 0=solid 1=hydro 2=spray 3=anodized 4=anodized-multi 5=anodized-multi 6=custom 7=gunsmith

// Lighting
uniform vec3 uLightDir;
uniform vec3 uAmbient;

varying vec2 vUv;
varying vec3 vNormal;

vec2 seedOffset(float seed) {
  return vec2(fract(seed * 0.37), fract(seed * 0.51));
}

vec4 samplePattern(vec2 uv, float seed) {
  vec2 tiledUv = fract(uv * 2.0 + seedOffset(seed));
  return texture2D(tPattern, tiledUv);
}

vec3 applyFinish(vec4 pattern, int style) {
  if (style == 0) {
    // Solid — flat color from ColorA
    return uColorA.rgb;

  } else if (style == 1 || style == 2) {
    // Hydrographic / Spray-paint — pattern carries full color data
    return pattern.rgb;

  } else if (style == 3) {
    // Anodized — single hue shifted by pattern intensity
    return uColorA.rgb * (0.7 + pattern.r * 0.3);

  } else if (style == 4) {
    // Anodized-multicolored — 4-color gradient mapped by pattern.r
    float t = clamp(pattern.r, 0.0, 1.0);
    vec3 ab = mix(uColorA.rgb, uColorB.rgb, clamp(t * 2.0, 0.0, 1.0));
    vec3 cd = mix(uColorC.rgb, uColorD.rgb, clamp(t * 2.0 - 1.0, 0.0, 1.0));
    return mix(ab, cd, step(0.5, t));

  } else if (style == 7) {
    // Gunsmith — metalness map drives blend between color and pattern
    float metal = texture2D(tMetalness, vUv).r;
    return mix(uColorA.rgb, uColorB.rgb * pattern.rgb, metal);

  } else {
    // Custom-paint-job (Asiimov, Bloodsport, etc.) — pattern alpha composites over base
    return mix(uColorA.rgb, pattern.rgb, pattern.a);
  }
}

void main() {
  vec4 patternSample  = samplePattern(vUv, uSeed);
  float metalness     = texture2D(tMetalness, vUv).r;
  vec4 grungeSample   = texture2D(tGrunge, vUv);

  vec3 albedo = applyFinish(patternSample, uFinishStyle);

  // Color warp: brightness multiplier
  if (uColorWarp > 0.0) {
    albedo *= (1.0 + uColorWarp);
  }

  // Wear darkening via grunge mask
  float grunge = grungeSample.r * uWear;
  albedo = mix(albedo, vec3(0.2, 0.2, 0.2), grunge * 0.65);

  float roughness = clamp(1.0 - metalness + grunge * 0.4, 0.0, 1.0);
  float specPower = mix(64.0, 4.0, roughness);

  // Simplified Blinn-Phong
  vec3 N = normalize(vNormal);
  vec3 L = normalize(uLightDir);
  float diff = max(dot(N, L), 0.0);
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(dot(N, H), 0.0), specPower) * metalness * 0.5;

  vec3 color = albedo * (uAmbient + diff) + vec3(spec);
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
