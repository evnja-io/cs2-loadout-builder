import { a as apiFetch, g as getSharedLoadout } from "../../../../chunks/loadouts.js";
import { error } from "@sveltejs/kit";
async function getWeapons() {
  return apiFetch("/weapons");
}
async function load({ params }) {
  try {
    const [loadout, weapons] = await Promise.all([
      getSharedLoadout(params.slug),
      getWeapons()
    ]);
    return { loadout, weapons };
  } catch {
    error(404, "Loadout not found");
  }
}
export {
  load
};
