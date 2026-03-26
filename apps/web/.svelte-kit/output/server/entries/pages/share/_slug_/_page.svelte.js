import { q as head, e as escape_html, a as attr, c as attr_class, b as ensure_array_like, s as stringify, d as derived, t as clsx } from "../../../../chunks/index.js";
import { W as WeaponScene } from "../../../../chunks/WeaponScene.js";
const authStore = { loading: true };
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    let selectedSkin = null;
    let wear = 0.15;
    let seed = 500;
    let likesAdjust = 0;
    const likesCount = derived(() => data.loadout.likesCount + likesAdjust);
    head("vecw56", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>${escape_html(data.loadout.name)} — CS2 Loadout Builder</title>`);
      });
      $$renderer3.push(`<meta property="og:title"${attr("content", data.loadout.name)}/> <meta property="og:description" content="View this CS2 loadout"/>`);
    });
    $$renderer2.push(`<div class="min-h-screen bg-gray-950 text-white"><header class="border-b border-gray-800 px-6 py-4 flex items-center justify-between"><h1 class="text-xl font-semibold">${escape_html(data.loadout.name)}</h1> <div class="flex items-center gap-3"><button${attr("disabled", authStore.loading, true)}${attr_class(`flex items-center gap-1 text-sm transition-colors ${stringify("text-gray-600 cursor-not-allowed")}`)}><span${attr_class(clsx(""))}>❤</span> <span>${escape_html(likesCount())}</span></button> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<a${attr("href", `${stringify("http://localhost:3001")}/auth/steam`)} class="text-sm text-blue-400 hover:text-blue-300">Login to save</a>`);
    }
    $$renderer2.push(`<!--]--></div></header> <div class="flex h-[calc(100vh-65px)]"><aside class="w-64 border-r border-gray-800 overflow-y-auto p-3"><h2 class="text-xs text-gray-500 uppercase tracking-wide mb-3">Weapons</h2> <!--[-->`);
    const each_array = ensure_array_like(data.loadout.slots);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let slot = each_array[$$index];
      const weapon = Object.values(data.weapons).flat().find((w) => w.defIndex === slot.weaponDefIndex);
      $$renderer2.push(`<button${attr_class(`w-full text-left px-3 py-2 rounded hover:bg-gray-800 text-sm text-gray-300 transition-colors ${stringify(selectedSkin?.id === slot.skinId ? "bg-gray-800 text-white" : "")}`)}>${escape_html(weapon?.name ?? `Weapon #${slot.weaponDefIndex}`)}</button>`);
    }
    $$renderer2.push(`<!--]--></aside> <main class="flex-1 p-6">`);
    WeaponScene($$renderer2, { skin: selectedSkin, wear, seed });
    $$renderer2.push(`<!----> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></main></div></div>`);
  });
}
export {
  _page as default
};
