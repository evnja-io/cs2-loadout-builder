import { getUserLoadouts } from '$lib/api/loadouts.js';

export async function load({ params }: { params: { steamId: string } }) {
  const loadouts = await getUserLoadouts(params.steamId).catch(() => []);
  return { steamId: params.steamId, loadouts };
}
