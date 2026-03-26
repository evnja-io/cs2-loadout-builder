<script lang="ts">
  import type { Skin } from '@lb/shared';

  const RARITY_COLORS: Record<string, string> = {
    consumer: 'border-gray-500',
    industrial: 'border-blue-500',
    'mil-spec': 'border-blue-400',
    restricted: 'border-purple-500',
    classified: 'border-pink-500',
    covert: 'border-red-500',
    contraband: 'border-yellow-500',
  };

  interface Props {
    skin: Skin;
    isSelected: boolean;
    onSelect: (skin: Skin) => void;
    assetsBase?: string;
  }

  let {
    skin,
    isSelected,
    onSelect,
    assetsBase = import.meta.env.VITE_ASSETS_BASE_URL ?? '/assets',
  }: Props = $props();

  const rarityBorder = $derived(RARITY_COLORS[skin.rarity] ?? 'border-gray-500');
</script>

<button
  onclick={() => onSelect(skin)}
  class="group relative bg-gray-800 rounded-lg overflow-hidden border-2 transition-all
         {isSelected ? 'border-orange-500 ring-1 ring-orange-400' : `${rarityBorder} hover:brightness-110`}"
>
  {#if skin.iconPath}
    <img
      src="{assetsBase}/{skin.iconPath}"
      alt={skin.name}
      class="w-full aspect-video object-cover"
      loading="lazy"
    />
  {:else}
    <div class="w-full aspect-video bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
      <span class="text-gray-500 text-xs">{skin.finishStyle}</span>
    </div>
  {/if}
  <div class="p-2">
    <p class="text-xs font-medium text-white truncate">{skin.name}</p>
    <p class="text-xs text-gray-400 capitalize">{skin.rarity}</p>
  </div>
</button>
