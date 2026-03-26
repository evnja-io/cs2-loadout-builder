<script lang="ts">
  import { Canvas, T } from '@threlte/core';
  import OrbitControlsSetup from './OrbitControlsSetup.svelte';
  import WeaponMesh from './WeaponMesh.svelte';
  import type { Skin } from '@lb/shared';

  interface Props {
    skin: Skin | null;
    wear: number;
    seed: number;
  }

  let { skin, wear, seed }: Props = $props();

  let modelMissing = $state(false);

  $effect(() => {
    // Reset overlay whenever the selected skin changes.
    // $effect is required here because modelMissing must remain writable
    // by WeaponMesh via bind:, so $derived cannot be used.
    skin;
    modelMissing = false;
  });
</script>

<div class="w-full h-full min-h-96 rounded-lg overflow-hidden bg-gray-900">
  {#if skin}
    <div class="relative w-full h-full">
      <Canvas>
        <T.PerspectiveCamera makeDefault position={[0, 0, 2.5]} fov={45} />
        <OrbitControlsSetup />
        <T.AmbientLight intensity={0.4} />
        <T.DirectionalLight position={[2, 4, 3]} intensity={1.2} castShadow />
        <T.HemisphereLight skyColor={0xffffff} groundColor={0x444444} intensity={0.6} />
        <WeaponMesh {skin} {wear} {seed} bind:modelMissing />
      </Canvas>
      {#if modelMissing}
        <div class="absolute inset-0 flex items-center justify-center bg-black/50">
          <p class="text-gray-400">3D model not available</p>
        </div>
      {/if}
    </div>
  {:else}
    <div class="flex items-center justify-center h-full text-gray-500">
      <p>Select a weapon to preview</p>
    </div>
  {/if}
</div>
