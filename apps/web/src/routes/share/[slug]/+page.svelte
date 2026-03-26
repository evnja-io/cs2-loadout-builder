<script lang="ts">
  import WeaponScene from '$lib/viewer/WeaponScene.svelte';
  import PriceDisplay from '$lib/components/PriceDisplay.svelte';
  import { toggleLike } from '$lib/api/loadouts.js';
  import { getSkinsForWeapon } from '$lib/api/weapons.js';
  import { loadCurrentUser, authStore } from '$lib/stores/auth.svelte.js';
  import type { Skin, LoadoutSlot } from '@lb/shared';

  let { data } = $props();
  let selectedSkin = $state<Skin | null>(null);
  let wear = $state(0.15);
  let seed = $state(500);
  let liked = $state(false);
  let likesAdjust = $state(0);
  const likesCount = $derived(data.loadout.likesCount + likesAdjust);

  $effect(() => { loadCurrentUser(); });

  async function selectSlot(slot: LoadoutSlot) {
    try {
      const skins = await getSkinsForWeapon(slot.weaponDefIndex);
      selectedSkin = skins.find(s => s.id === slot.skinId) ?? null;
      wear = slot.wear;
      seed = slot.seed;
    } catch {
      // keep previous selection on error
    }
  }

  async function handleLike() {
    if (!authStore.user) return; // must be logged in
    try {
      const res = await toggleLike(data.loadout.id);
      liked = res.liked;
      likesAdjust += liked ? 1 : -1;
    } catch {
      // silently ignore network errors for likes
    }
  }
</script>

<svelte:head>
  <title>{data.loadout.name} — CS2 Loadout Builder</title>
  <meta property="og:title" content={data.loadout.name} />
  <meta property="og:description" content="View this CS2 loadout" />
</svelte:head>

<div class="min-h-screen bg-gray-950 text-white">
  <header class="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
    <h1 class="text-xl font-semibold">{data.loadout.name}</h1>
    <div class="flex items-center gap-3">
      <button
  onclick={handleLike}
  disabled={authStore.loading || !authStore.user}
  class="flex items-center gap-1 text-sm transition-colors
         {authStore.user ? 'text-gray-400 hover:text-red-400' : 'text-gray-600 cursor-not-allowed'}"
>
        <span class={liked ? 'text-red-400' : ''}>❤</span>
        <span>{likesCount}</span>
      </button>
      {#if !authStore.user}
        <a href="{import.meta.env.VITE_API_URL ?? 'http://localhost:3001'}/auth/steam" class="text-sm text-blue-400 hover:text-blue-300">
          Login to save
        </a>
      {/if}
    </div>
  </header>

  <div class="flex h-[calc(100vh-65px)]">
    <aside class="w-64 border-r border-gray-800 overflow-y-auto p-3">
      <h2 class="text-xs text-gray-500 uppercase tracking-wide mb-3">Weapons</h2>
      {#each data.loadout.slots as slot (slot.weaponDefIndex)}
        {@const weapon = Object.values(data.weapons).flat().find(w => w.defIndex === slot.weaponDefIndex)}
        <button
          class="w-full text-left px-3 py-2 rounded hover:bg-gray-800 text-sm text-gray-300 transition-colors
                 {selectedSkin?.id === slot.skinId ? 'bg-gray-800 text-white' : ''}"
          onclick={() => selectSlot(slot)}
        >
          {weapon?.name ?? `Weapon #${slot.weaponDefIndex}`}
        </button>
      {/each}
    </aside>

    <main class="flex-1 p-6">
      <WeaponScene skin={selectedSkin} {wear} {seed} />
      {#if selectedSkin}
        <div class="mt-4">
          <PriceDisplay skinId={selectedSkin.id} />
        </div>
      {/if}
    </main>
  </div>
</div>
