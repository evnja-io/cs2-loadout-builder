import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('paintkit shaders', () => {
  it('vertex shader declares vUv and vNormal', () => {
    const vert = readFileSync(
      join(__dirname, '../shaders/paintkit.vert.glsl'),
      'utf-8'
    );
    expect(vert).toContain('vUv');
    expect(vert).toContain('vNormal');
  });

  it('fragment shader declares correct texture uniforms and color params', () => {
    const frag = readFileSync(
      join(__dirname, '../shaders/paintkit.frag.glsl'),
      'utf-8'
    );
    expect(frag).toContain('tPattern');
    expect(frag).toContain('tMetalness');
    expect(frag).toContain('tGrunge');
    expect(frag).toContain('uColorA');
    expect(frag).toContain('uColorB');
    expect(frag).toContain('uColorC');
    expect(frag).toContain('uColorD');
    expect(frag).toContain('uColorWarp');
    expect(frag).toContain('uWear');
    expect(frag).toContain('uSeed');
    expect(frag).toContain('uFinishStyle');
    // Old LUT uniforms must NOT be present
    expect(frag).not.toContain('tColor');
    expect(frag).not.toContain('tNormal');
    expect(frag).not.toContain('tRoughness');
  });
});
