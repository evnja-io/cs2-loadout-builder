import { describe, it, expect, vi } from 'vitest';
import { loadoutStore } from '../loadout.svelte.js';

vi.mock('../../api/loadouts.js', () => ({
  updateLoadoutSlots: vi.fn().mockResolvedValue({ ok: true }),
}));

const baseLoadout = {
  id: 'test-id', name: 'Test', isPublic: false, shareSlug: null,
  likesCount: 0, slots: [], userId: 'x',
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
};

describe('loadout store', () => {
  it('setSlot adds a slot for a weapon', () => {
    loadoutStore.setActiveLoadout(baseLoadout);
    loadoutStore.setSlot({ weaponDefIndex: 7, skinId: 1, wear: 0.15, seed: 500, statTrak: false });
    expect(loadoutStore.slots.find(s => s.weaponDefIndex === 7)).toBeDefined();
  });

  it('removeSlot removes a weapon slot', () => {
    loadoutStore.setActiveLoadout(baseLoadout);
    loadoutStore.setSlot({ weaponDefIndex: 7, skinId: 1, wear: 0.15, seed: 500, statTrak: false });
    loadoutStore.removeSlot(7);
    expect(loadoutStore.slots.find(s => s.weaponDefIndex === 7)).toBeUndefined();
  });
});
