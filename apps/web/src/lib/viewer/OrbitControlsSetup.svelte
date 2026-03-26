<script lang="ts">
  import { useThrelte, useTask } from '@threlte/core';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
  import { onDestroy } from 'svelte';

  const { camera, renderer, invalidate } = useThrelte();

  let controls: OrbitControls | null = null;

  $effect(() => {
    const cam = $camera;
    const domEl = renderer.domElement;
    if (!cam) return;

    controls = new OrbitControls(cam, domEl);
    controls.enablePan = false;
    controls.minDistance = 1;
    controls.maxDistance = 5;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    return () => {
      controls?.dispose();
      controls = null;
    };
  });

  useTask(() => {
    if (controls?.enabled) {
      controls.update();
      invalidate();
    }
  });

  onDestroy(() => {
    controls?.dispose();
  });
</script>
