<script lang="ts">
  import type { Weapon, Skin } from '@lb/shared';

  const RARITY_BORDER: Record<string, string> = {
    consumer: 'border-gray-500',
    industrial: 'border-blue-500',
    'mil-spec': 'border-blue-400',
    restricted: 'border-purple-500',
    classified: 'border-pink-500',
    covert: 'border-red-500',
    contraband: 'border-yellow-500',
  };

  interface Props {
    weapon: Weapon;
    skin: Skin | null;
    onPickSkin: () => void;
    onViewDetail: () => void;
    assetsBase?: string;
  }

  let {
    weapon,
    skin,
    onPickSkin,
    onViewDetail,
    assetsBase = import.meta.env.VITE_ASSETS_BASE_URL ?? '/assets',
  }: Props = $props();

  const rarityBorder = $derived(skin ? (RARITY_BORDER[skin.rarity] ?? 'border-gray-600') : '');
  const skinSubName = $derived(skin ? (skin.name.split(' | ')[1] ?? skin.name) : '');
</script>

{#if skin}
  <!-- Equipped slot — click to view/edit detail -->
  <button
    onclick={onViewDetail}
    class="group relative rounded-lg overflow-hidden border-2 bg-gray-800 transition-all
           hover:brightness-110 hover:scale-[1.02] {rarityBorder}"
  >
    <div class="aspect-[4/3] relative overflow-hidden bg-gray-900">
      {#if skin.iconPath}
        <img
          src="{assetsBase}/{skin.iconPath}"
          alt={skin.name}
          class="w-full h-full object-cover"
          loading="lazy"
        />
      {:else}
        <div class="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
          <span class="text-gray-500 text-xs">{skin.finishStyle}</span>
        </div>
      {/if}
    </div>
    <div class="p-2 bg-gray-800">
      <p class="text-xs text-gray-400 truncate">{weapon.name}</p>
      <p class="text-xs font-medium text-white truncate">{skinSubName}</p>
    </div>
  </button>
{:else}
  <!-- Unequipped slot — click "+" to open picker -->
  <div class="rounded-lg border border-dashed border-gray-700 bg-gray-800/30 p-3
              flex flex-col items-center gap-2">
    <div class="aspect-[4/3] w-full flex items-center justify-center">
      {#if weapon.iconPath}
        <img
          src="{assetsBase}/{weapon.iconPath}"
          alt={weapon.name}
          class="max-h-16 max-w-full object-contain opacity-40"
          loading="lazy"
        />
      {:else}
        <div class="w-12 h-8 bg-gray-700/50 rounded opacity-40"></div>
      {/if}
    </div>
    <p class="text-xs text-gray-400 truncate w-full text-center">{weapon.name}</p>
    <button
      onclick={onPickSkin}
      class="text-xs px-3 py-1 bg-orange-500/20 hover:bg-orange-500/40
             text-orange-400 rounded border border-orange-500/30 transition-colors"
    >
      + Add skin
    </button>
  </div>
{/if}
