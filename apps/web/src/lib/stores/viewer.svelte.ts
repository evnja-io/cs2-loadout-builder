import type { Skin, Weapon } from '@lb/shared';

export interface ViewerState {
  selectedWeapon: Weapon | null;
  selectedSkin: Skin | null;
  wear: number;
  seed: number;
  statTrak: boolean;
}

export const viewerState = $state<ViewerState>({
  selectedWeapon: null,
  selectedSkin: null,
  wear: 0.15,
  seed: 500,
  statTrak: false,
});
