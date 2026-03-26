import { describe, it, expect, vi } from 'vitest';

// Mock Three.js for unit tests (no WebGL in test environment)
vi.mock('three', () => ({
  ShaderMaterial: class {
    uniforms: Record<string, { value: unknown }> = {};
    vertexShader = '';
    fragmentShader = '';
    constructor(params: Record<string, unknown>) { Object.assign(this, params); }
  },
  TextureLoader: class {
    load(url: string, onLoad?: (t: unknown) => void) {
      const tex = { image: { src: url }, wrapS: 0, wrapT: 0, dispose: () => {} };
      onLoad?.(tex);
      return tex;
    }
  },
  RepeatWrapping: 1000,
  Vector3: class {
    x: number; y: number; z: number;
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    normalize() { return this; }
  },
  Vector4: class {
    x: number; y: number; z: number; w: number;
    constructor(x = 0, y = 0, z = 0, w = 1) { this.x = x; this.y = y; this.z = z; this.w = w; }
  },
}));

// Mock GLSL imports (Vite ?raw — not supported in node vitest)
vi.mock('../shaders/paintkit.vert.glsl?raw', () => ({ default: 'vertex-shader-stub' }));
vi.mock('../shaders/paintkit.frag.glsl?raw', () => ({ default: 'fragment-shader-stub' }));

import { createPaintkitMaterial, normalizeSeed, updateMaterialUniforms } from '../PaintkitMaterial.js';

const DEFAULT_OPTS = {
  patternUrl: '/a/pattern.webp',
  metalnessUrl: '/a/roughness.webp',
  grungeUrl: '/a/grunge.webp',
  wear: 0.15,
  seed: 500,
  finishStyle: 1,
  colorA: [0.8, 0.2, 0.1, 1.0] as [number, number, number, number],
  colorB: [0.1, 0.5, 0.9, 1.0] as [number, number, number, number],
  colorC: [1.0, 1.0, 1.0, 1.0] as [number, number, number, number],
  colorD: [0.0, 0.0, 0.0, 1.0] as [number, number, number, number],
  colorWarp: 0.0,
  phase: 0.0,
};

describe('normalizeSeed', () => {
  it('normalizes seed 1 to 0', () => expect(normalizeSeed(1)).toBeCloseTo(0));
  it('normalizes seed 1000 to 1', () => expect(normalizeSeed(1000)).toBeCloseTo(1));
  it('normalizes seed 500 to ~0.499', () => expect(normalizeSeed(500)).toBeCloseTo(0.499, 2));
});

describe('createPaintkitMaterial', () => {
  it('returns a ShaderMaterial with correct wear/seed/finishStyle uniforms', () => {
    const mat = createPaintkitMaterial(DEFAULT_OPTS);
    expect(mat.uniforms['uWear']?.value).toBeCloseTo(0.15);
    expect(mat.uniforms['uSeed']?.value).toBeCloseTo(normalizeSeed(500));
    expect(mat.uniforms['uFinishStyle']?.value).toBe(1);
  });

  it('sets color uniforms from colorA-D', () => {
    const mat = createPaintkitMaterial(DEFAULT_OPTS);
    const colorA = mat.uniforms['uColorA']?.value as { x: number; y: number };
    expect(colorA.x).toBeCloseTo(0.8);
    expect(colorA.y).toBeCloseTo(0.2);
  });

  it('sets colorWarp and phase uniforms', () => {
    const mat = createPaintkitMaterial({ ...DEFAULT_OPTS, colorWarp: 0.5, phase: 0.25 });
    expect(mat.uniforms['uColorWarp']?.value).toBeCloseTo(0.5);
    expect(mat.uniforms['uPhase']?.value).toBeCloseTo(0.25);
  });

  it('falls back to pattern texture when metalnessUrl is null', () => {
    const mat = createPaintkitMaterial({ ...DEFAULT_OPTS, metalnessUrl: null });
    // tMetalness should still be set (reuses pattern)
    expect(mat.uniforms['tMetalness']).toBeDefined();
  });
});

describe('updateMaterialUniforms', () => {
  it('updates wear and seed without recreating material', () => {
    const mat = createPaintkitMaterial(DEFAULT_OPTS);
    updateMaterialUniforms(mat as unknown as import('three').ShaderMaterial, 0.5, 300);
    expect(mat.uniforms['uWear']?.value).toBeCloseTo(0.5);
    expect(mat.uniforms['uSeed']?.value).toBeCloseTo(normalizeSeed(300));
  });
});
