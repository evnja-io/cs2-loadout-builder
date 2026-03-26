import type { Loadout, UpsertSlot } from '@lb/shared';
import { updateLoadoutSlots } from '../api/loadouts.js';

interface LoadoutStore {
  activeLoadout: Loadout | null;
  slots: UpsertSlot[];
  saving: boolean;
  dirty: boolean;
  setActiveLoadout(loadout: Loadout): void;
  setSlot(slot: UpsertSlot): void;
  removeSlot(weaponDefIndex: number): void;
  save(): Promise<void>;
}

export const loadoutStore: LoadoutStore = $state({
  activeLoadout: null,
  slots: [],
  saving: false,
  dirty: false,

  setActiveLoadout(loadout: Loadout) {
    loadoutStore.activeLoadout = loadout;
    loadoutStore.slots = loadout.slots.map(s => ({
      weaponDefIndex: s.weaponDefIndex,
      skinId: s.skinId,
      wear: s.wear,
      seed: s.seed,
      statTrak: s.statTrak,
    }));
    loadoutStore.dirty = false;
  },

  setSlot(slot: UpsertSlot) {
    const idx = loadoutStore.slots.findIndex(s => s.weaponDefIndex === slot.weaponDefIndex);
    if (idx >= 0) loadoutStore.slots[idx] = slot;
    else loadoutStore.slots.push(slot);
    loadoutStore.dirty = true;
  },

  removeSlot(weaponDefIndex: number) {
    loadoutStore.slots = loadoutStore.slots.filter(s => s.weaponDefIndex !== weaponDefIndex);
    loadoutStore.dirty = true;
  },

  async save() {
    if (!loadoutStore.activeLoadout || !loadoutStore.dirty) return;
    loadoutStore.saving = true;
    try {
      await updateLoadoutSlots(loadoutStore.activeLoadout.id, loadoutStore.slots);
      loadoutStore.dirty = false;
    } finally {
      loadoutStore.saving = false;
    }
  },
});
