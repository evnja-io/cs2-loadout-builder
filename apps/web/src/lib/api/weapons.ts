import { apiFetch } from './client.js';
import type { Weapon, Skin } from '@lb/shared';

export async function getWeapons(): Promise<Record<string, Weapon[]>> {
  return apiFetch('/weapons');
}

export async function getSkinsForWeapon(
  defIndex: number,
  filters?: { rarity?: string; maxPrice?: number }
): Promise<Skin[]> {
  const params = new URLSearchParams();
  if (filters?.rarity) params.set('rarity', filters.rarity);
  if (filters?.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
  const qs = params.size > 0 ? `?${params}` : '';
  return apiFetch(`/weapons/${defIndex}/skins${qs}`);
}
