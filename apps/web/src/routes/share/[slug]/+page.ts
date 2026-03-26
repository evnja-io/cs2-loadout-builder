import { getSharedLoadout } from '$lib/api/loadouts.js';
import { getWeapons } from '$lib/api/weapons.js';
import { error } from '@sveltejs/kit';

export async function load({ params }: { params: { slug: string } }) {
  try {
    const [loadout, weapons] = await Promise.all([
      getSharedLoadout(params.slug),
      getWeapons(),
    ]);
    return { loadout, weapons };
  } catch {
    error(404, 'Loadout not found');
  }
}
