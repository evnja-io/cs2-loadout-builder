import { apiFetch } from './client.js';
import type { Loadout, UpsertSlot } from '@lb/shared';

export async function getLoadouts(): Promise<Loadout[]> {
  return apiFetch('/loadouts');
}

export async function createLoadout(name: string): Promise<Loadout> {
  return apiFetch('/loadouts', { method: 'POST', body: JSON.stringify({ name }) });
}

export async function updateLoadout(id: string, patch: { name?: string; isPublic?: boolean }): Promise<Loadout> {
  return apiFetch(`/loadouts/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
}

export async function deleteLoadout(id: string): Promise<void> {
  return apiFetch(`/loadouts/${id}`, { method: 'DELETE' });
}

export async function updateLoadoutSlots(id: string, slots: UpsertSlot[]): Promise<{ ok: boolean }> {
  return apiFetch(`/loadouts/${id}/slots`, { method: 'PUT', body: JSON.stringify({ slots }) });
}

export async function getSharedLoadout(slug: string): Promise<Loadout> {
  return apiFetch(`/share/${slug}`);
}

export async function getUserLoadouts(steamId: string): Promise<Loadout[]> {
  return apiFetch(`/users/${steamId}/loadouts`);
}

export async function toggleLike(loadoutId: string): Promise<{ liked: boolean }> {
  return apiFetch(`/loadouts/${loadoutId}/like`, { method: 'POST' });
}
