<script lang="ts">
  import { T, useLoader } from '@threlte/core';
  import { untrack } from 'svelte';
  import { onDestroy } from 'svelte';
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
  import * as THREE from 'three';
  import {
    createPaintkitMaterial,
    updateMaterialUniforms,
    FINISH_STYLE_MAP,
    type FinishStyleKey,
  } from './PaintkitMaterial.js';
  import type { Skin } from '@lb/shared';

  interface Props {
    skin: Skin;
    wear: number;
    seed: number;
    assetsBase?: string;
  }

  let {
    skin,
    wear,
    seed,
    assetsBase = import.meta.env.VITE_ASSETS_BASE_URL ?? '/assets',
  }: Props = $props();

  function texUrl(path: string | null | undefined): string | null {
    return path ? `${assetsBase}/${path}` : null;
  }

  function parseColor(v: unknown): [number, number, number, number] {
    if (Array.isArray(v) && v.length >= 3) return [+v[0], +v[1], +v[2], +(v[3] ?? 1)];
    if (typeof v === 'string') {
      try { return parseColor(JSON.parse(v)); } catch { /* fall through */ }
    }
    return [1, 1, 1, 1];
  }

  const modelUrl = $derived(`${assetsBase}/weapons/${skin.weaponDefIndex}/model.glb`);
  const grungeTexUrl = $derived(`${assetsBase}/shared/grunge.webp`);

  const gltfLoader = useLoader(GLTFLoader);

  let scene: THREE.Group | null = $state(null);
  let material: THREE.ShaderMaterial | null = $state(null);

  $effect(() => {
    const url = modelUrl;
    const currentWear = untrack(() => wear);
    const currentSeed = untrack(() => seed);
    const patternUrl = texUrl(skin.patternTexture) ?? `${assetsBase}/fallback.webp`;
    const metalnessUrl = texUrl(skin.roughnessTexture);  // DB field name kept as roughnessTexture
    const currentGrungeUrl = grungeTexUrl;
    const finishStyle = FINISH_STYLE_MAP[skin.finishStyle as FinishStyleKey] ?? 1;

    let disposed = false;

    const store = gltfLoader.load(url);

    void store.then((gltf) => {
      if (disposed) return;

      const mat = createPaintkitMaterial({
        patternUrl,
        metalnessUrl,
        grungeUrl: currentGrungeUrl,
        wear: currentWear,
        seed: currentSeed,
        finishStyle,
        colorA: parseColor(skin.colorA),
        colorB: parseColor(skin.colorB),
        colorC: parseColor(skin.colorC),
        colorD: parseColor(skin.colorD),
        colorWarp: skin.colorWarp ?? 0,
        phase: skin.phase ?? 0,
      });

      gltf.scene.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          node.material = mat;
        }
      });

      material = mat;
      scene = gltf.scene;
    });

    return () => {
      disposed = true;
      material?.dispose();
      material = null;
      scene = null;
    };
  });

  $effect(() => {
    if (material) updateMaterialUniforms(material, wear, seed);
  });

  onDestroy(() => {
    material?.dispose();
  });
</script>

{#if scene}
  <T is={scene} />
{/if}
