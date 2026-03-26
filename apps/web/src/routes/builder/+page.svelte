<script lang="ts">
  import WeaponCategoryTabs from '$lib/components/WeaponCategoryTabs.svelte';
  import WeaponGrid from '$lib/components/WeaponGrid.svelte';
  import SkinPickerModal from '$lib/components/SkinPickerModal.svelte';
  import SkinDetailModal from '$lib/components/SkinDetailModal.svelte';
  import LoadoutHeader from '$lib/components/LoadoutHeader.svelte';
  import ShareModal from '$lib/components/ShareModal.svelte';
  import { loadoutStore } from '$lib/stores/loadout.svelte.js';
  import { loadCurrentUser } from '$lib/stores/auth.svelte.js';
  import { getLoadouts, createLoadout } from '$lib/api/loadouts.js';
  import { getWeapons } from '$lib/api/weapons.js';
  import { apiFetch } from '$lib/api/client.js';
  import type { Weapon, Skin, Loadout, WeaponCategory, LoadoutSlot, InventoryItem } from '@lb/shared';

  let importingInventory = $state(false);
  let activeCategory = $state<WeaponCategory>('rifles');
  let weapons = $state<Record<string, Weapon[]>>({});
  let shareOpen = $state(false);
  let allLoadouts = $state<Loadout[]>([]);
  let initError = $state<string | null>(null);

  // Modal state: non-null = open
  let pickerWeapon = $state<Weapon | null>(null);
  let detailState = $state<{ weapon: Weapon; slot: LoadoutSlot; skin: Skin } | null>(null);

  // skinId → Skin object for equipped slots (populated on select)
  let skinsById = $state<Map<number, Skin>>(new Map());

  $effect(() => {
    (async () => {
      try {
        await loadCurrentUser();
        const [weaponData, loadoutData] = await Promise.all([getWeapons(), getLoadouts()]);
        weapons = weaponData;
        allLoadouts = loadoutData;
        if (loadoutData.length > 0) {
          loadoutStore.setActiveLoadout(loadoutData[0]!);
        } else {
          const newLoadout = await createLoadout('My Loadout');
          allLoadouts = [newLoadout];
          loadoutStore.setActiveLoadout(newLoadout);
        }
      } catch {
        initError = 'Failed to load. Please refresh.';
      }
    })();
  });

  const activeWeapons = $derived(weapons[activeCategory] ?? []);

  function handleSkinSelect(skin: Skin, weapon: Weapon) {
    const newMap = new Map(skinsById);
    newMap.set(skin.id, skin);
    skinsById = newMap;
    loadoutStore.setSlot({
      weaponDefIndex: weapon.defIndex,
      skinId: skin.id,
      wear: 0.15,
      seed: 500,
      statTrak: false,
    });
    pickerWeapon = null;
    // Open detail view after selecting
    const slot = loadoutStore.slots.find(s => s.weaponDefIndex === weapon.defIndex);
    if (slot) {
      detailState = { weapon, slot, skin };
    }
  }

  function openDetail(weapon: Weapon, slot: LoadoutSlot, skin: Skin) {
    detailState = { weapon, slot, skin };
  }

  function updateSlotWear(wear: number) {
    if (!detailState) return;
    const updated = { ...detailState.slot, wear };
    loadoutStore.setSlot(updated);
    detailState = { ...detailState, slot: updated };
  }

  function updateSlotSeed(seed: number) {
    if (!detailState) return;
    const updated = { ...detailState.slot, seed };
    loadoutStore.setSlot(updated);
    detailState = { ...detailState, slot: updated };
  }

  function updateSlotStatTrak(statTrak: boolean) {
    if (!detailState) return;
    const updated = { ...detailState.slot, statTrak };
    loadoutStore.setSlot(updated);
    detailState = { ...detailState, slot: updated };
  }

  async function importFromInventory() {
    importingInventory = true;
    try {
      const items = await apiFetch<InventoryItem[]>('/inventory');
      for (const item of items) {
        loadoutStore.setSlot({
          weaponDefIndex: item.weaponDefIndex,
          skinId: item.skinId,
          wear: item.wear,
          seed: item.seed,
          statTrak: item.statTrak,
        });
      }
    } catch {
      // best-effort
    } finally {
      importingInventory = false;
    }
  }

  async function handleNewLoadout() {
    const name = prompt('Loadout name:');
    if (!name) return;
    const newLoadout = await createLoadout(name);
    allLoadouts = [...allLoadouts, newLoadout];
    loadoutStore.setActiveLoadout(newLoadout);
  }
</script>

<div class="flex flex-col h-screen bg-gray-950 text-white overflow-hidden">
  {#if initError}
    <div class="bg-red-900/50 border border-red-700 text-red-300 text-sm px-4 py-2">{initError}</div>
  {/if}

  <!-- Header row -->
  {#if loadoutStore.activeLoadout}
    <div class="flex items-center border-b border-gray-800">
      <div class="flex-1 min-w-0">
        <LoadoutHeader
          loadout={loadoutStore.activeLoadout}
          {allLoadouts}
          saving={loadoutStore.saving}
          dirty={loadoutStore.dirty}
          onSwitch={(l) => loadoutStore.setActiveLoadout(l)}
          onSave={() => loadoutStore.save()}
          onShareOpen={() => { shareOpen = true; }}
          onNewLoadout={handleNewLoadout}
        />
      </div>
      <button
        onclick={importFromInventory}
        disabled={importingInventory}
        class="text-sm px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50
               text-white rounded transition-colors mx-3 shrink-0"
      >
        {importingInventory ? 'Importing…' : 'Import from Steam'}
      </button>
    </div>
  {/if}

  <!-- Category tabs (horizontal) -->
  <WeaponCategoryTabs {activeCategory} onSelect={(cat) => { activeCategory = cat; }} />

  <!-- Full-width weapon grid -->
  <main class="flex-1 overflow-y-auto">
    <WeaponGrid
      weapons={activeWeapons}
      slots={loadoutStore.slots}
      {skinsById}
      onPickSkin={(w) => { pickerWeapon = w; }}
      onViewDetail={openDetail}
    />
  </main>
</div>

<!-- Skin picker modal -->
{#if pickerWeapon}
  <SkinPickerModal
    weaponDefIndex={pickerWeapon.defIndex}
    weaponName={pickerWeapon.name}
    selectedSkinId={loadoutStore.slots.find(s => s.weaponDefIndex === pickerWeapon!.defIndex)?.skinId ?? null}
    onSelect={(skin) => handleSkinSelect(skin, pickerWeapon!)}
    onClose={() => { pickerWeapon = null; }}
  />
{/if}

<!-- Skin detail modal -->
{#if detailState}
  <SkinDetailModal
    weapon={detailState.weapon}
    skin={detailState.skin}
    slot={detailState.slot}
    onWearChange={updateSlotWear}
    onSeedChange={updateSlotSeed}
    onStatTrakChange={updateSlotStatTrak}
    onChangeSkin={() => {
      const w = detailState!.weapon;
      detailState = null;
      pickerWeapon = w;
    }}
    onClose={() => { detailState = null; }}
  />
{/if}

<!-- Share modal -->
{#if shareOpen && loadoutStore.activeLoadout}
  <ShareModal
    loadout={loadoutStore.activeLoadout}
    onClose={() => { shareOpen = false; }}
    onUpdate={(updated) => {
      loadoutStore.activeLoadout = updated;
      allLoadouts = allLoadouts.map(l => l.id === updated.id ? updated : l);
    }}
  />
{/if}
