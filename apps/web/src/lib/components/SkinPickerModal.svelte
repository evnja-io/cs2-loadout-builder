<script lang="ts">
  import type { Skin } from '@lb/shared';
  import SkinCard from './SkinCard.svelte';
  import { getSkinsForWeapon } from '$lib/api/weapons.js';

  interface Props {
    weaponDefIndex: number;
    weaponName: string;
    selectedSkinId: number | null;
    onSelect: (skin: Skin) => void;
    onClose: () => void;
  }

  let { weaponDefIndex, weaponName, selectedSkinId, onSelect, onClose }: Props = $props();

  let search = $state('');
  let rarityFilter = $state('');
  let skins = $state<Skin[]>([]);
  let loading = $state(true);

  $effect(() => {
    let cancelled = false;
    skins = [];
    loading = true;
    getSkinsForWeapon(weaponDefIndex, rarityFilter ? { rarity: rarityFilter } : undefined)
      .then(data => { if (!cancelled) skins = data; })
      .catch(() => { if (!cancelled) skins = []; })
      .finally(() => { if (!cancelled) loading = false; });
    return () => { cancelled = true; };
  });

  const filtered = $derived(
    search ? skins.filter(s => s.name.toLowerCase().includes(search.toLowerCase())) : skins
  );

  const RARITIES = ['consumer', 'industrial', 'mil-spec', 'restricted', 'classified', 'covert', 'contraband'];
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="fixed inset-0 bg-black/70 z-50 flex items-end md:items-center justify-center p-4"
  onclick={onClose}
  role="dialog"
  aria-modal="true"
  aria-label="Skin picker"
>
  <div
    class="bg-gray-900 rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl"
    onclick={(e) => e.stopPropagation()}
    role="presentation"
  >
    <div class="flex items-center justify-between p-4 border-b border-gray-800">
      <h2 class="text-white font-semibold">Choose skin — {weaponName}</h2>
      <button onclick={onClose} class="text-gray-400 hover:text-white text-xl leading-none">×</button>
    </div>

    <div class="flex gap-3 p-4 border-b border-gray-800">
      <input
        type="search"
        placeholder="Search skins..."
        bind:value={search}
        class="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white
               placeholder-gray-500 focus:outline-none focus:border-orange-500"
      />
      <select
        bind:value={rarityFilter}
        class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white
               focus:outline-none focus:border-orange-500"
      >
        <option value="">All rarities</option>
        {#each RARITIES as r}
          <option value={r} class="capitalize">{r}</option>
        {/each}
      </select>
    </div>

    <div class="flex-1 overflow-y-auto p-4">
      {#if loading}
        <div class="flex justify-center py-12">
          <div class="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      {:else if filtered.length === 0}
        <p class="text-center text-gray-500 py-12">No skins found</p>
      {:else}
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {#each filtered as skin}
            <SkinCard
              {skin}
              isSelected={skin.id === selectedSkinId}
              onSelect={(s) => { onSelect(s); onClose(); }}
            />
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
