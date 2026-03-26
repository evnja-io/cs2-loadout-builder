<script lang="ts">
  import WeaponScene from '$lib/viewer/WeaponScene.svelte';
  import WearControls from './WearControls.svelte';
  import PriceDisplay from './PriceDisplay.svelte';
  import type { Weapon, Skin, LoadoutSlot } from '@lb/shared';

  interface Props {
    weapon: Weapon;
    skin: Skin;
    slot: LoadoutSlot;
    onWearChange: (wear: number) => void;
    onSeedChange: (seed: number) => void;
    onStatTrakChange: (v: boolean) => void;
    onChangeSkin: () => void;
    onClose: () => void;
  }

  let {
    weapon,
    skin,
    slot,
    onWearChange,
    onSeedChange,
    onStatTrakChange,
    onChangeSkin,
    onClose,
  }: Props = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
  onclick={onClose}
  role="dialog"
  aria-modal="true"
  aria-label="Skin detail"
>
  <div
    class="bg-gray-900 rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden shadow-2xl"
    onclick={(e) => e.stopPropagation()}
    role="presentation"
  >
    <!-- 3D Viewer (left 60%) -->
    <div class="flex-[3] min-h-64 p-3">
      <WeaponScene {skin} wear={slot.wear} seed={slot.seed} />
    </div>

    <!-- Controls (right 40%) -->
    <div class="flex-[2] border-t md:border-t-0 md:border-l border-gray-800
                p-5 flex flex-col gap-4 overflow-y-auto">
      <div class="flex items-start justify-between">
        <div>
          <h2 class="font-semibold text-lg leading-tight">{skin.name}</h2>
          <p class="text-sm text-gray-400 capitalize mt-0.5">
            {skin.rarity} · {skin.finishStyle}
          </p>
        </div>
        <button onclick={onClose} class="text-gray-400 hover:text-white text-2xl leading-none ml-4">×</button>
      </div>

      <WearControls
        wear={slot.wear}
        seed={slot.seed}
        statTrak={slot.statTrak}
        wearMin={skin.wearMin}
        wearMax={skin.wearMax}
        {onWearChange}
        {onSeedChange}
        {onStatTrakChange}
      />

      <PriceDisplay skinId={skin.id} />

      <button
        onclick={onChangeSkin}
        class="w-full py-2 px-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm
               font-medium transition-colors border border-gray-700"
      >
        Change skin
      </button>
    </div>
  </div>
</div>
