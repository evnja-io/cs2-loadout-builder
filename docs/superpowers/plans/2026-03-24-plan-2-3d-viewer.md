# CS2 Loadout Builder — Plan 2: 3D Viewer

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the asset extraction pipeline (CS2 VPK → .glb + .webp) and the Threlte 3D weapon viewer with a custom paintkit GLSL shader that accurately renders CS2 skin patterns, wear, and finish styles.

**Architecture:** Offline `scripts/extract-assets` pipeline produces `.glb` models and `.webp` textures stored at `ASSETS_OUTPUT_PATH`. The `apps/web` viewer uses Threlte + Three.js with a custom `ShaderMaterial` that implements the CS2 paintkit rendering (5 textures: pattern, color, normal, roughness, grunge). A `--sample` mode provides minimal fixture assets for frontend development without running the full extraction.

**Tech Stack:** Three.js 0.171, @threlte/core v8, @threlte/extras v8, Svelte 5 runes, GLSL, Node.js asset pipeline (SourceIO + VTFEdit for extraction, sharp for WebP conversion)

**Prerequisites:** Plan 1 complete. CS2 installed locally (for full extraction) or `--sample` flag for development.

**Spec:** `docs/superpowers/specs/2026-03-24-cs2-loadout-builder-design.md`

---

## File Map

```
scripts/extract-assets/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                    # CLI entry: --sample | --full
    ├── parse-items-game.ts         # parse items_game.txt → weapons + skins catalogue JSON
    ├── convert-vtf.ts              # VTF texture → WebP via sharp
    ├── catalogue.ts                # generate public/weapons.json + public/skins.json
    └── sample/                     # bundled sample assets (AK-47 + Karambit, 2 skins each)
        ├── models/                 # pre-extracted .glb files
        └── textures/               # pre-extracted .webp textures

apps/web/src/
├── lib/
│   ├── viewer/
│   │   ├── WeaponScene.svelte      # Threlte <Canvas> + camera + lights + controls
│   │   ├── WeaponMesh.svelte       # loads .glb, applies paintkit ShaderMaterial
│   │   ├── PaintkitMaterial.ts     # Three.js ShaderMaterial factory
│   │   └── shaders/
│   │       ├── paintkit.vert.glsl  # vertex shader (standard UVs)
│   │       └── paintkit.frag.glsl  # fragment shader (5-texture paintkit blend)
│   └── stores/
│       └── viewer.svelte.ts        # $state: selectedWeapon, selectedSkin, wear, seed
└── routes/
    └── builder/
        └── +page.svelte            # integrate WeaponScene (replaces stub from Plan 1)
```

---

## Task 1: Asset Extraction Pipeline Scaffold

**Files:**
- Create: `scripts/extract-assets/package.json`
- Create: `scripts/extract-assets/tsconfig.json`
- Create: `scripts/extract-assets/src/index.ts`

- [ ] **Step 1: Create scripts/extract-assets/package.json**

```json
{
  "name": "@lb/extract-assets",
  "version": "0.0.1",
  "type": "module",
  "bin": { "extract-assets": "src/index.ts" },
  "scripts": {
    "sample": "tsx src/index.ts --sample",
    "full": "tsx src/index.ts --full",
    "test": "vitest run"
  },
  "dependencies": {
    "sharp": "^0.33.5",
    "commander": "^12.1.0"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create scripts/extract-assets/src/index.ts**

```typescript
import { Command } from 'commander';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { copySampleAssets } from './sample-copy.js';
import { runFullExtraction } from './full-extraction.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const program = new Command();
program
  .name('extract-assets')
  .description('Extract CS2 weapon models and textures for the loadout builder')
  .option('--sample', 'Copy sample fixture assets for development (no CS2 install needed)')
  .option('--full', 'Run full extraction from CS2 VPK files (requires CS2 installed)')
  .option('--cs2-path <path>', 'Path to CS2 installation', 'C:/Program Files (x86)/Steam/steamapps/common/Counter-Strike Global Offensive')
  .option('--output <path>', 'Output directory', join(process.cwd(), 'apps/web/static/assets'))
  .parse();

const opts = program.opts();

if (opts.sample) {
  await copySampleAssets(opts.output as string);
  console.log('✓ Sample assets copied to', opts.output);
} else if (opts.full) {
  await runFullExtraction(opts.cs2Path as string, opts.output as string);
  console.log('✓ Full extraction complete');
} else {
  program.help();
}
```

- [ ] **Step 3: Commit scaffold**

```bash
git add scripts/extract-assets
git commit -m "feat(extract-assets): add pipeline scaffold with sample/full modes"
```

---

## Task 2: items_game.txt Parser

**Files:**
- Create: `scripts/extract-assets/src/parse-items-game.ts`
- Test: `scripts/extract-assets/src/__tests__/parse-items-game.test.ts`

- [ ] **Step 1: Write failing test**

Create `scripts/extract-assets/src/__tests__/parse-items-game.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { parseWeapons, parsePaintKits, buildSkinCatalogue } from '../parse-items-game.js';

const SAMPLE_ITEMS_GAME = `
"items_game"
{
  "items"
  {
    "7"
    {
      "name" "weapon_ak47"
      "item_name" "#SFUI_WPNHUD_AK47"
    }
  }
  "paint_kits"
  {
    "44"
    {
      "name" "aq_ak47_redline"
      "description_tag" "#PaintKit_aq_ak47_redline"
      "wear_remap_min" "0.1"
      "wear_remap_max" "0.45"
      "style" "2"
    }
  }
  "client_loot_lists" {}
  "revolving_loot_lists" {}
}
`;

describe('parseWeapons', () => {
  it('extracts weapon defIndex and name', () => {
    const weapons = parseWeapons(SAMPLE_ITEMS_GAME);
    expect(weapons.find(w => w.defIndex === 7)?.name).toBe('AK-47');
  });
});

describe('parsePaintKits', () => {
  it('extracts paintkit id, wear range, and finish style', () => {
    const kits = parsePaintKits(SAMPLE_ITEMS_GAME);
    const kit = kits.find(k => k.id === 44);
    expect(kit).toBeDefined();
    expect(kit?.wearMin).toBeCloseTo(0.1);
    expect(kit?.wearMax).toBeCloseTo(0.45);
    expect(kit?.finishStyle).toBe('hydrographic'); // style 2
  });
});
```

- [ ] **Step 2: Run test (expect fail)**

```bash
pnpm --filter @lb/extract-assets test
```

- [ ] **Step 3: Create scripts/extract-assets/src/parse-items-game.ts**

```typescript
// Minimal KV parser for Valve's items_game.txt format
export interface WeaponDef {
  defIndex: number;
  name: string;
  category: string;
}

export interface PaintKit {
  id: number;
  name: string;
  wearMin: number;
  wearMax: number;
  finishStyle: string;
}

const WEAPON_NAME_MAP: Record<string, string> = {
  weapon_ak47: 'AK-47', weapon_m4a1: 'M4A1-S', weapon_m4a1_silencer: 'M4A1-S',
  weapon_awp: 'AWP', weapon_deagle: 'Desert Eagle', weapon_glock: 'Glock-18',
  weapon_usp_silencer: 'USP-S', weapon_knife_karambit: 'Karambit',
  weapon_knife_m9_bayonet: 'M9 Bayonet', weapon_knife_butterfly: 'Butterfly Knife',
  weapon_knife_tactical: 'Huntsman Knife', weapon_knife_falchion: 'Falchion Knife',
  // Add more as needed
};

const FINISH_STYLE_MAP: Record<string, string> = {
  '0': 'solid', '1': 'solid', '2': 'hydrographic', '3': 'spray-paint',
  '4': 'anodized', '5': 'anodized-multicolored', '6': 'anodized-multicolored',
  '7': 'gunsmith', '8': 'custom-paint-job',
};

const WEAPON_CATEGORY_MAP: Record<string, string> = {
  weapon_ak47: 'rifles', weapon_m4a1_silencer: 'rifles', weapon_awp: 'rifles',
  weapon_deagle: 'pistols', weapon_glock: 'pistols', weapon_usp_silencer: 'pistols',
  weapon_knife_karambit: 'knives', weapon_knife_m9_bayonet: 'knives',
  weapon_knife_butterfly: 'knives', weapon_knife_falchion: 'knives',
};

export function parseWeapons(content: string): WeaponDef[] {
  const weapons: WeaponDef[] = [];
  const itemsMatch = content.match(/"items"\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/s);
  if (!itemsMatch) return weapons;

  const entryRegex = /"(\d+)"\s*\{[^}]*"name"\s*"(weapon_[^"]+)"[^}]*\}/gs;
  let match: RegExpExecArray | null;
  while ((match = entryRegex.exec(itemsMatch[1]!)) !== null) {
    const defIndex = parseInt(match[1]!, 10);
    const internalName = match[2]!;
    const name = WEAPON_NAME_MAP[internalName];
    if (name) {
      weapons.push({ defIndex, name, category: WEAPON_CATEGORY_MAP[internalName] ?? 'rifles' });
    }
  }
  return weapons;
}

export function parsePaintKits(content: string): PaintKit[] {
  const kits: PaintKit[] = [];
  const kitsMatch = content.match(/"paint_kits"\s*\{([\s\S]+?)\n\s*\}\s*\n\s*"/);
  if (!kitsMatch) return kits;

  const entryRegex = /"(\d+)"\s*\{([^}]+)\}/gs;
  let match: RegExpExecArray | null;
  while ((match = entryRegex.exec(kitsMatch[1]!)) !== null) {
    const id = parseInt(match[1]!, 10);
    const body = match[2]!;
    const nameM = body.match(/"name"\s*"([^"]+)"/);
    const wearMinM = body.match(/"wear_remap_min"\s*"([^"]+)"/);
    const wearMaxM = body.match(/"wear_remap_max"\s*"([^"]+)"/);
    const styleM = body.match(/"style"\s*"([^"]+)"/);
    if (nameM) {
      kits.push({
        id, name: nameM[1]!,
        wearMin: parseFloat(wearMinM?.[1] ?? '0'),
        wearMax: parseFloat(wearMaxM?.[1] ?? '1'),
        finishStyle: FINISH_STYLE_MAP[styleM?.[1] ?? '2'] ?? 'hydrographic',
      });
    }
  }
  return kits;
}

export function buildSkinCatalogue(weapons: WeaponDef[], paintKits: PaintKit[]) {
  // items_game.txt stores weapon-paintkit associations in client_loot_lists
  // This function maps paint kits to weapons by naming convention: aq_{weaponname}_{kitname}
  return paintKits.flatMap(kit => {
    const matchedWeapons = weapons.filter(w =>
      kit.name.toLowerCase().includes(w.name.toLowerCase().replace(/-/g, '').replace(/ /g, ''))
    );
    return matchedWeapons.map(w => ({
      weaponDefIndex: w.defIndex,
      paintKitId: kit.id,
      kitName: kit.name,
      wearMin: kit.wearMin,
      wearMax: kit.wearMax,
      finishStyle: kit.finishStyle,
    }));
  });
}
```

- [ ] **Step 4: Run tests (expect pass)**

```bash
pnpm --filter @lb/extract-assets test
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/extract-assets/src/parse-items-game.ts
git commit -m "feat(extract-assets): add items_game.txt parser for weapons and paintkits"
```

---

## Task 3: Sample Assets + Copy Script

**Files:**
- Create: `scripts/extract-assets/src/sample-copy.ts`
- Create: `scripts/extract-assets/src/sample/` (placeholder GLB + textures)

- [ ] **Step 1: Create sample directory structure**

```bash
mkdir -p scripts/extract-assets/src/sample/models
mkdir -p scripts/extract-assets/src/sample/textures/7_44
mkdir -p scripts/extract-assets/src/sample/textures/507_0
```

> Note: The actual sample `.glb` model files must be placed manually after running SourceIO on CS2 files. Create placeholder README files for now; the pipeline will warn if they're missing.

- [ ] **Step 2: Create scripts/extract-assets/src/sample-copy.ts**

```typescript
import { copyFile, mkdir, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAMPLE_DIR = join(__dirname, 'sample');

export async function copySampleAssets(outputPath: string): Promise<void> {
  await mkdir(outputPath, { recursive: true });

  if (!existsSync(SAMPLE_DIR)) {
    console.warn('⚠ Sample directory not found. Creating placeholder structure.');
    await mkdir(join(outputPath, 'weapons', '7'), { recursive: true });
    await mkdir(join(outputPath, 'weapons', '507'), { recursive: true });

    // Write placeholder catalogue
    const weaponsCatalogue = [
      { defIndex: 7, name: 'AK-47', category: 'rifles', modelPath: '/assets/weapons/7/model.glb', iconPath: null },
      { defIndex: 507, name: 'Karambit', category: 'knives', modelPath: '/assets/weapons/507/model.glb', iconPath: null },
    ];
    const skinsCatalogue = [
      { id: 1, weaponDefIndex: 7, paintKitId: 44, name: 'Redline', rarity: 'classified', finishStyle: 'hydrographic', wearMin: 0.1, wearMax: 0.45 },
      { id: 2, weaponDefIndex: 7, paintKitId: 675, name: 'Asiimov', rarity: 'covert', finishStyle: 'hydrographic', wearMin: 0.18, wearMax: 1.0 },
    ];

    await writeFile(join(outputPath, 'weapons.json'), JSON.stringify(weaponsCatalogue, null, 2));
    await writeFile(join(outputPath, 'skins.json'), JSON.stringify(skinsCatalogue, null, 2));
    return;
  }

  // Copy real sample assets
  const copyDir = async (src: string, dest: string) => {
    await mkdir(dest, { recursive: true });
    const entries = await readdir(src, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) await copyDir(join(src, entry.name), join(dest, entry.name));
      else await copyFile(join(src, entry.name), join(dest, entry.name));
    }
  };
  await copyDir(SAMPLE_DIR, outputPath);
}
```

- [ ] **Step 3: Run sample copy**

```bash
pnpm --filter @lb/extract-assets sample
```
Expected: `apps/web/static/assets/weapons.json` and `skins.json` created.

- [ ] **Step 4: Commit**

```bash
git add scripts/extract-assets/src/sample-copy.ts
git commit -m "feat(extract-assets): add sample asset copy for development"
```

---

## Task 4: Paintkit Vertex Shader

**Files:**
- Create: `apps/web/src/lib/viewer/shaders/paintkit.vert.glsl`

- [ ] **Step 1: Write test for shader source validity**

Create `apps/web/src/lib/viewer/__tests__/shaders.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Verify shader files exist and contain required declarations
describe('paintkit shaders', () => {
  it('vertex shader declares vUv and vNormal', () => {
    const vert = readFileSync(
      new URL('../shaders/paintkit.vert.glsl', import.meta.url).pathname, 'utf-8'
    );
    expect(vert).toContain('vUv');
    expect(vert).toContain('vNormal');
  });

  it('fragment shader declares all 5 texture uniforms', () => {
    const frag = readFileSync(
      new URL('../shaders/paintkit.frag.glsl', import.meta.url).pathname, 'utf-8'
    );
    expect(frag).toContain('tPattern');
    expect(frag).toContain('tColor');
    expect(frag).toContain('tNormal');
    expect(frag).toContain('tRoughness');
    expect(frag).toContain('tGrunge');
    expect(frag).toContain('uWear');
    expect(frag).toContain('uSeed');
  });
});
```

- [ ] **Step 2: Run test (expect fail)**

```bash
pnpm --filter @lb/web test
```

- [ ] **Step 3: Create paintkit.vert.glsl**

Create `apps/web/src/lib/viewer/shaders/paintkit.vert.glsl`:

```glsl
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
```

- [ ] **Step 4: Run test (expect pass — after fragment shader created)**

Proceed to next step first.

---

## Task 5: Paintkit Fragment Shader

**Files:**
- Create: `apps/web/src/lib/viewer/shaders/paintkit.frag.glsl`

- [ ] **Step 1: Create paintkit.frag.glsl**

Create `apps/web/src/lib/viewer/shaders/paintkit.frag.glsl`:

```glsl
precision highp float;

// 5 texture uniforms
uniform sampler2D tPattern;    // pattern/detail texture (UV-tiled)
uniform sampler2D tColor;      // base color / finish color map
uniform sampler2D tNormal;     // normal map
uniform sampler2D tRoughness;  // roughness + metalness
uniform sampler2D tGrunge;     // wear/scratch mask (shared per weapon)

// Paintkit control uniforms
uniform float uWear;           // 0.0 (FN) → 1.0 (BS)
uniform float uSeed;           // normalized: (seed - 1) / 999.0 → [0.0, 1.0]
uniform int   uFinishStyle;    // 0=solid, 1=hydrographic, 2=spray-paint, 3=anodized, 4=anodized-multi, 5=gunsmith, 6=custom

// Lighting (simplified Blinn-Phong for non-PBR fallback)
uniform vec3 uLightDir;
uniform vec3 uAmbient;

varying vec2 vUv;
varying vec3 vNormal;

// UV offset from seed for pattern variation
vec2 seedOffset(float seed) {
  return vec2(fract(seed * 0.37), fract(seed * 0.51));
}

// Sample pattern with tiled UV + seed offset
vec4 samplePattern(vec2 uv, float seed) {
  vec2 offset = seedOffset(seed);
  // Pattern is tiled 2x; offset shifts which tile region is visible
  vec2 tiledUv = fract(uv * 2.0 + offset);
  return texture2D(tPattern, tiledUv);
}

vec3 applyFinish(vec3 baseColor, vec4 pattern, vec4 colorMap, int style, vec2 uv) {
  if (style == 0) {
    // Solid color: use colorMap directly, ignore pattern
    return colorMap.rgb;
  } else if (style == 1 || style == 2) {
    // Hydrographic / Spray-paint: pattern modulated by color map
    return pattern.rgb * colorMap.rgb;
  } else if (style == 3) {
    // Anodized: color map as metal tint, pattern as normal distortion
    return colorMap.rgb * (0.7 + pattern.r * 0.3);
  } else if (style == 4) {
    // Anodized multicolored: sample color map UV shifted by pattern
    vec2 shiftedUv = uv + (pattern.rg - 0.5) * 0.1;
    return texture2D(tColor, shiftedUv).rgb;
  } else if (style == 5) {
    // Gunsmith: layered pattern on metal base
    float metalness = texture2D(tRoughness, uv).b;
    return mix(colorMap.rgb, pattern.rgb * colorMap.rgb, metalness);
  } else {
    // Custom paint job (Printstream etc.): direct color map with pattern overlay
    return mix(colorMap.rgb, pattern.rgb, pattern.a);
  }
}

void main() {
  vec2 uv = vUv;

  // Sample all textures
  vec4 patternSample = samplePattern(uv, uSeed);
  vec4 colorSample   = texture2D(tColor, uv);
  vec4 roughSample   = texture2D(tRoughness, uv);
  vec4 grungeSample  = texture2D(tGrunge, uv);

  // Apply finish style
  vec3 albedo = applyFinish(vec3(1.0), patternSample, colorSample, uFinishStyle, uv);

  // Apply wear: blend grunge scratches onto albedo and roughness
  float grunge = grungeSample.r * uWear;
  albedo = mix(albedo, vec3(0.3, 0.3, 0.3), grunge * 0.6);
  float roughness = roughSample.r + grunge * 0.4;

  // Simple diffuse lighting
  vec3 normal = normalize(vNormal);
  float diff = max(dot(normal, normalize(vec3(1.0, 2.0, 1.0))), 0.0);
  vec3 color = albedo * (uAmbient + diff * vec3(1.0));

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
```

- [ ] **Step 2: Run shader tests (expect pass)**

```bash
pnpm --filter @lb/web test
```
Expected: PASS — both shader files contain required declarations.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/viewer/shaders
git commit -m "feat(viewer): add paintkit GLSL shaders (5-texture blend with finish styles)"
```

---

## Task 6: PaintkitMaterial Factory

**Files:**
- Create: `apps/web/src/lib/viewer/PaintkitMaterial.ts`
- Test: `apps/web/src/lib/viewer/__tests__/PaintkitMaterial.test.ts`

- [ ] **Step 1: Write failing test**

Create `apps/web/src/lib/viewer/__tests__/PaintkitMaterial.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';

// Mock Three.js for unit tests (no WebGL in test environment)
vi.mock('three', () => ({
  ShaderMaterial: class {
    uniforms: Record<string, { value: unknown }> = {};
    constructor(params: any) { Object.assign(this, params); }
  },
  TextureLoader: class {
    load(url: string, onLoad: (t: any) => void) { onLoad({ image: { src: url } }); return {}; }
  },
  RepeatWrapping: 1000,
}));

import { createPaintkitMaterial, normalizeSeed } from '../PaintkitMaterial.js';

describe('normalizeSeed', () => {
  it('normalizes seed 1 to 0', () => expect(normalizeSeed(1)).toBeCloseTo(0));
  it('normalizes seed 1000 to 1', () => expect(normalizeSeed(1000)).toBeCloseTo(1));
  it('normalizes seed 500 to ~0.5', () => expect(normalizeSeed(500)).toBeCloseTo(0.499, 2));
});

describe('createPaintkitMaterial', () => {
  it('returns a ShaderMaterial with correct uniforms', () => {
    const mat = createPaintkitMaterial({
      patternUrl: '/a/pattern.webp', colorUrl: '/a/color.webp',
      normalUrl: '/a/normal.webp', roughnessUrl: '/a/rough.webp',
      grungeUrl: '/a/grunge.webp',
      wear: 0.15, seed: 500, finishStyle: 1,
    });
    expect(mat.uniforms['uWear']?.value).toBeCloseTo(0.15);
    expect(mat.uniforms['uSeed']?.value).toBeCloseTo(normalizeSeed(500));
    expect(mat.uniforms['uFinishStyle']?.value).toBe(1);
  });
});
```

- [ ] **Step 2: Run test (expect fail)**

```bash
pnpm --filter @lb/web test src/lib/viewer/__tests__/PaintkitMaterial.test.ts
```

- [ ] **Step 3: Create apps/web/src/lib/viewer/PaintkitMaterial.ts**

```typescript
import * as THREE from 'three';

// Shader source imports (Vite handles .glsl files as strings with ?raw)
import vertexShader from './shaders/paintkit.vert.glsl?raw';
import fragmentShader from './shaders/paintkit.frag.glsl?raw';

export const FINISH_STYLE_MAP = {
  solid: 0, hydrographic: 1, 'spray-paint': 2, anodized: 3,
  'anodized-multicolored': 4, gunsmith: 5, 'custom-paint-job': 6,
} as const;

export type FinishStyleKey = keyof typeof FINISH_STYLE_MAP;

const textureLoader = new THREE.TextureLoader();
const textureCache = new Map<string, THREE.Texture>();

function loadCachedTexture(url: string): THREE.Texture {
  if (textureCache.has(url)) return textureCache.get(url)!;
  // LRU eviction: drop oldest if over limit
  const limit = parseInt(import.meta.env.VITE_TEXTURE_CACHE_SIZE ?? '16', 10);
  if (textureCache.size >= limit) {
    const firstKey = textureCache.keys().next().value;
    if (firstKey) {
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
  colorUrl: string;
  normalUrl: string;
  roughnessUrl: string;
  grungeUrl: string;
  wear: number;
  seed: number;        // CS2 seed: 1–1000
  finishStyle: number; // FINISH_STYLE_MAP value
}

export function createPaintkitMaterial(opts: PaintkitMaterialOptions): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      tPattern:     { value: loadCachedTexture(opts.patternUrl) },
      tColor:       { value: loadCachedTexture(opts.colorUrl) },
      tNormal:      { value: loadCachedTexture(opts.normalUrl) },
      tRoughness:   { value: loadCachedTexture(opts.roughnessUrl) },
      tGrunge:      { value: loadCachedTexture(opts.grungeUrl) },
      uWear:        { value: opts.wear },
      uSeed:        { value: normalizeSeed(opts.seed) },
      uFinishStyle: { value: opts.finishStyle },
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
```

- [ ] **Step 4: Run tests (expect pass)**

```bash
pnpm --filter @lb/web test src/lib/viewer/__tests__/PaintkitMaterial.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/viewer/PaintkitMaterial.ts
git commit -m "feat(viewer): add PaintkitMaterial factory with LRU texture cache"
```

---

## Task 7: WeaponMesh Svelte Component

**Files:**
- Create: `apps/web/src/lib/viewer/WeaponMesh.svelte`

- [ ] **Step 1: Create apps/web/src/lib/viewer/WeaponMesh.svelte**

```svelte
<script lang="ts">
  import { T, useLoader } from '@threlte/core';
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
  import * as THREE from 'three';
  import { createPaintkitMaterial, updateMaterialUniforms, FINISH_STYLE_MAP, type FinishStyleKey } from './PaintkitMaterial.js';
  import type { Skin } from '@lb/shared';

  interface Props {
    skin: Skin;
    wear: number;
    seed: number;
    assetsBase?: string;
  }

  let { skin, wear, seed, assetsBase = import.meta.env.VITE_ASSETS_BASE_URL ?? '/assets' }: Props = $props();

  const FALLBACK_TEXTURE = `${assetsBase}/fallback.webp`;

  function texUrl(path: string | null) {
    return path ? `${assetsBase}/${path}` : FALLBACK_TEXTURE;
  }

  function grungeUrl() {
    return `${assetsBase}/weapons/${skin.weaponDefIndex}/grunge.webp`;
  }

  // Reactive GLB path derived from selected skin's weapon
  let modelUrl = $derived(`${assetsBase}/weapons/${skin.weaponDefIndex}/model.glb`);

  // Load GLB
  const gltfLoader = useLoader(GLTFLoader);

  let scene: THREE.Group | null = $state(null);
  let material: THREE.ShaderMaterial | null = $state(null);

  $effect(() => {
    gltfLoader.load(modelUrl).then((gltf) => {
      const mat = createPaintkitMaterial({
        patternUrl: texUrl(skin.patternTexture),
        colorUrl: texUrl(skin.colorTexture),
        normalUrl: texUrl(skin.normalTexture),
        roughnessUrl: texUrl(skin.roughnessTexture),
        grungeUrl: grungeUrl(),
        wear,
        seed,
        finishStyle: FINISH_STYLE_MAP[skin.finishStyle as FinishStyleKey] ?? 1,
      });

      // Apply material to all meshes in the GLB
      gltf.scene.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          node.material = mat;
        }
      });

      material = mat;
      scene = gltf.scene;
    });

    return () => {
      material?.dispose();
    };
  });

  // Reactively update wear/seed without reloading textures
  $effect(() => {
    if (material) updateMaterialUniforms(material, wear, seed);
  });
</script>

{#if scene}
  <T is={scene} />
{/if}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/lib/viewer/WeaponMesh.svelte
git commit -m "feat(viewer): add WeaponMesh component with reactive paintkit material"
```

---

## Task 8: WeaponScene Threlte Canvas

**Files:**
- Create: `apps/web/src/lib/viewer/WeaponScene.svelte`
- Create: `apps/web/src/lib/stores/viewer.svelte.ts`

- [ ] **Step 1: Create apps/web/src/lib/stores/viewer.svelte.ts**

```typescript
import type { Skin, Weapon } from '@lb/shared';

export interface ViewerState {
  selectedWeapon: Weapon | null;
  selectedSkin: Skin | null;
  wear: number;
  seed: number;
  statTrak: boolean;
}

export const viewerState = $state<ViewerState>({
  selectedWeapon: null,
  selectedSkin: null,
  wear: 0.15,
  seed: 500,
  statTrak: false,
});
```

- [ ] **Step 2: Create apps/web/src/lib/viewer/WeaponScene.svelte**

```svelte
<script lang="ts">
  import { Canvas } from '@threlte/core';
  import { T } from '@threlte/core';
  import { OrbitControls, Environment } from '@threlte/extras';
  import WeaponMesh from './WeaponMesh.svelte';
  import type { Skin } from '@lb/shared';

  interface Props {
    skin: Skin | null;
    wear: number;
    seed: number;
  }

  let { skin, wear, seed }: Props = $props();
</script>

<div class="w-full h-full min-h-96 rounded-lg overflow-hidden bg-gray-900">
  {#if skin}
    <Canvas>
      <T.PerspectiveCamera makeDefault position={[0, 0, 2.5]} fov={45} />
      <OrbitControls enablePan={false} minDistance={1} maxDistance={5} enableDamping dampingFactor={0.05} />
      <Environment preset="studio" />
      <T.AmbientLight intensity={0.4} />
      <T.DirectionalLight position={[2, 4, 3]} intensity={1.2} castShadow />
      <WeaponMesh {skin} {wear} {seed} />
    </Canvas>
  {:else}
    <div class="flex items-center justify-center h-full text-gray-500">
      <p>Select a weapon to preview</p>
    </div>
  {/if}
</div>
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/viewer/WeaponScene.svelte apps/web/src/lib/stores/viewer.svelte.ts
git commit -m "feat(viewer): add WeaponScene Threlte canvas with orbit controls"
```

---

## Task 9: Builder Page — Viewer Integration

**Files:**
- Modify: `apps/web/src/routes/builder/+page.svelte`

- [ ] **Step 1: Update builder page with viewer**

Replace the stub `apps/web/src/routes/builder/+page.svelte`:

```svelte
<script lang="ts">
  import WeaponScene from '$lib/viewer/WeaponScene.svelte';
  import { viewerState } from '$lib/stores/viewer.svelte.js';
</script>

<div class="flex h-screen bg-gray-950 text-white">
  <!-- Sidebar placeholder (Plan 3) -->
  <aside class="w-72 bg-gray-900 border-r border-gray-800 p-4">
    <p class="text-gray-400 text-sm">Weapon selector — Plan 3</p>
  </aside>

  <!-- Main viewer area -->
  <main class="flex-1 flex flex-col">
    <!-- Viewer -->
    <div class="flex-1 p-6">
      <WeaponScene
        skin={viewerState.selectedSkin}
        wear={viewerState.wear}
        seed={viewerState.seed}
      />
    </div>

    <!-- Controls placeholder -->
    {#if viewerState.selectedSkin}
      <div class="border-t border-gray-800 p-4 flex gap-6 items-center">
        <div class="flex-1">
          <label class="text-xs text-gray-400 uppercase tracking-wide">Wear</label>
          <input
            type="range" min="0" max="1" step="0.001"
            bind:value={viewerState.wear}
            class="w-full mt-1"
          />
          <span class="text-xs text-gray-300">{viewerState.wear.toFixed(3)}</span>
        </div>
        <div>
          <label class="text-xs text-gray-400 uppercase tracking-wide">Seed</label>
          <input
            type="number" min="1" max="1000"
            bind:value={viewerState.seed}
            class="w-20 mt-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
          />
        </div>
      </div>
    {/if}
  </main>
</div>
```

- [ ] **Step 2: Add auth guard for builder route**

Create `apps/web/src/routes/builder/+page.ts`:

```typescript
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { apiFetch } from '$lib/api/client.js';
import type { User } from '@lb/shared';

export async function load() {
  if (!browser) return {};
  try {
    const user = await apiFetch<User>('/auth/me');
    return { user };
  } catch {
    goto('/');
    return {};
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/routes/builder
git commit -m "feat(web): integrate 3D viewer into builder page with wear/seed controls"
```

---

## Task 10: Vite GLSL Config

**Files:**
- Modify: `apps/web/vite.config.ts`

- [ ] **Step 1: Verify GLSL ?raw imports work**

Vite supports `?raw` imports out of the box. Test by running:

```bash
pnpm --filter @lb/web build
```
Expected: Build succeeds with no GLSL errors.

If errors appear with `?raw`, add to `vite.config.ts`:

```typescript
assetsInclude: ['**/*.glsl'],
```

- [ ] **Step 2: Commit if changes were needed**

```bash
git add apps/web/vite.config.ts
git commit -m "chore(web): configure Vite for GLSL shader imports"
```

---

## Task 11: Full Viewer Test

- [ ] **Step 1: Run all web tests**

```bash
pnpm --filter @lb/web test
```
Expected: All PASS (shader unit tests + material factory tests).

- [ ] **Step 2: Visual smoke test**

```bash
# Terminal 1: API
pnpm --filter @lb/api dev

# Terminal 2: Web
pnpm --filter @lb/web dev
```

1. Open `http://localhost:5173`
2. Log in with Steam → arrive at `/builder`
3. Open browser console → no errors
4. The viewer shows "Select a weapon to preview" (no skin selected yet — expected)
5. In browser console, manually set a skin to test viewer:

```javascript
// Open browser console on /builder
// (viewerState is not directly accessible from console, but you can test via URL params or temporarily hardcode a skin in the page)
```

- [ ] **Step 3: Final commit**

```bash
git commit -m "chore: plan 2 complete — 3D viewer with paintkit GLSL renderer"
```

---

## Verification

1. Run `pnpm --filter @lb/extract-assets sample` → `apps/web/static/assets/weapons.json` created
2. Run `pnpm --filter @lb/web test` → All PASS
3. Navigate to `/builder` when logged in → Viewer canvas renders
4. Shader files contain all 5 texture uniforms (grep test passes)
5. `normalizeSeed(1) === 0`, `normalizeSeed(1000) === 1` (unit test passes)
