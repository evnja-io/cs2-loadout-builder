<script lang="ts">
  import type { WeaponCategory } from '@lb/shared';

  const CATEGORIES: { key: WeaponCategory; label: string }[] = [
    { key: 'rifles', label: 'Rifles' },
    { key: 'pistols', label: 'Pistols' },
    { key: 'smgs', label: 'SMGs' },
    { key: 'heavy', label: 'Heavy' },
    { key: 'knives', label: 'Knives' },
    { key: 'gloves', label: 'Gloves' },
  ];

  interface Props {
    activeCategory: WeaponCategory;
    onSelect: (cat: WeaponCategory) => void;
  }

  let { activeCategory, onSelect }: Props = $props();
</script>

<div class="flex border-b border-gray-800 overflow-x-auto scrollbar-thin">
  {#each CATEGORIES as cat}
    <button
      onclick={() => onSelect(cat.key)}
      class="px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors
             {activeCategory === cat.key
               ? 'text-white border-b-2 border-orange-500 bg-gray-800/50'
               : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'}"
    >
      {cat.label}
    </button>
  {/each}
</div>
