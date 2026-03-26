import { b as getUserLoadouts } from "../../../../chunks/loadouts.js";
async function load({ params }) {
  const loadouts = await getUserLoadouts(params.steamId).catch(() => []);
  return { steamId: params.steamId, loadouts };
}
export {
  load
};
