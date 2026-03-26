import * as THREE from 'three';

// Vite ?raw imports — treated as string literals at build time
import vertexShader from './shaders/paintkit.vert.glsl?raw';
import fragmentShader from './shaders/paintkit.frag.glsl?raw';

export const FINISH_STYLE_MAP = {
  'solid':                 0,
  'hydrographic':          1,
  'spray-paint':           2,
  'anodized':              3,
  'anodized-multicolored': 4,
  'gunsmith':              5,
  'custom-paint-job':      6,
} as const;

export type FinishStyleKey = keyof typeof FINISH_STYLE_MAP;

const textureLoader = new THREE.TextureLoader();
const textureCache = new Map<string, THREE.Texture>();

function loadCachedTexture(url: string): THREE.Texture {
  const cached = textureCache.get(url);
  if (cached) return cached;

  const limit = parseInt(import.meta.env['VITE_TEXTURE_CACHE_SIZE'] ?? '16', 10);
  if (textureCache.size >= limit) {
    const firstKey = textureCache.keys().next().value;
    if (firstKey !== undefined) {
      textureCache.get(firstKey)?.dispose();
      textureCache.delete(firstKey);
    }
  }

  const texture = textureLoader.load(url);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  textureCache.set(url, texture);
  return texture;
}

/** Normalize CS2 seed (1–1000) to [0.0, 1.0] shader uniform */
export function normalizeSeed(seed: number): number {
  return (seed - 1) / 999;
}

export interface PaintkitMaterialOptions {
  patternUrl: string;
  metalnessUrl: string | null;  // g_tMetalness (was roughnessUrl)
  grungeUrl: string;
  wear: number;
  seed: number;        // CS2 seed: 1–1000
  finishStyle: number; // FINISH_STYLE_MAP value
  colorA: [number, number, number, number];
  colorB: [number, number, number, number];
  colorC: [number, number, number, number];
  colorD: [number, number, number, number];
  colorWarp: number;
  phase: number;
}

const FALLBACK_COLOR: [number, number, number, number] = [1, 1, 1, 1];

export function createPaintkitMaterial(opts: PaintkitMaterialOptions): THREE.ShaderMaterial {
  const patternTex = loadCachedTexture(opts.patternUrl);
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      tPattern:     { value: patternTex },
      tMetalness:   { value: opts.metalnessUrl ? loadCachedTexture(opts.metalnessUrl) : patternTex },
      tGrunge:      { value: loadCachedTexture(opts.grungeUrl) },
      uWear:        { value: opts.wear },
      uSeed:        { value: normalizeSeed(opts.seed) },
      uFinishStyle: { value: opts.finishStyle },
      uColorA:      { value: new THREE.Vector4(...(opts.colorA ?? FALLBACK_COLOR)) },
      uColorB:      { value: new THREE.Vector4(...(opts.colorB ?? FALLBACK_COLOR)) },
      uColorC:      { value: new THREE.Vector4(...(opts.colorC ?? FALLBACK_COLOR)) },
      uColorD:      { value: new THREE.Vector4(...(opts.colorD ?? FALLBACK_COLOR)) },
      uColorWarp:   { value: opts.colorWarp ?? 0 },
      uPhase:       { value: opts.phase ?? 0 },
      uLightDir:    { value: new THREE.Vector3(1, 2, 1).normalize() },
      uAmbient:     { value: new THREE.Vector3(0.3, 0.3, 0.3) },
    },
  });
}

/** Update wear/seed uniforms in place (no texture reload) */
export function updateMaterialUniforms(
  mat: THREE.ShaderMaterial,
  wear: number,
  seed: number
): void {
  mat.uniforms['uWear']!.value = wear;
  mat.uniforms['uSeed']!.value = normalizeSeed(seed);
}
