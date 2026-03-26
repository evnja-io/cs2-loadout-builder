<script lang="ts">
  import type { Weapon, Skin, LoadoutSlot } from '@lb/shared';
  import WeaponSlotCard from './WeaponSlotCard.svelte';

  interface Props {
    weapons: Weapon[];
    slots: LoadoutSlot[];
    skinsById: Map<number, Skin>;
    onPickSkin: (weapon: Weapon) => void;
    onViewDetail: (weapon: Weapon, slot: LoadoutSlot, skin: Skin) => void;
    assetsBase?: string;
  }

  let {
    weapons,
    slots,
    skinsById,
    onPickSkin,
    onViewDetail,
    assetsBase = import.meta.env.VITE_ASSETS_BASE_URL ?? '/assets',
  }: Props = $props();
</script>

<div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 p-4">
  {#each weapons as weapon}
    {@const slot = slots.find(s => s.weaponDefIndex === weapon.defIndex) ?? null}
    {@const skin = slot ? (skinsById.get(slot.skinId) ?? null) : null}
    <WeaponSlotCard
      {weapon}
      {skin}
      {assetsBase}
      onPickSkin={() => onPickSkin(weapon)}
      onViewDetail={() => { if (slot && skin) onViewDetail(weapon, slot, skin); else onPickSkin(weapon); }}
    />
  {/each}
</div>
