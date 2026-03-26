import { b as ensure_array_like, c as attr_class, s as stringify, e as escape_html, a as attr, d as derived } from "../../../chunks/index.js";
import { W as WeaponScene } from "../../../chunks/WeaponScene.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/root.js";
import "../../../chunks/state.svelte.js";
function WeaponCategoryTabs($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const CATEGORIES = [
      { key: "gloves", label: "Équipement" },
      { key: "knives", label: "Couteaux" },
      { key: "pistols", label: "Pistolets" },
      { key: "smgs", label: "Milieu de gamme" },
      { key: "rifles", label: "Fusils" },
      { key: "shotguns", label: "Fusils à pompe" },
      { key: "heavies", label: "Mitrailleuses" }
    ];
    let { activeCategory } = $$props;
    $$renderer2.push(`<div class="flex border-b border-gray-800 overflow-x-auto scrollbar-thin"><!--[-->`);
    const each_array = ensure_array_like(CATEGORIES);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let cat = each_array[$$index];
      $$renderer2.push(`<button${attr_class(`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${stringify(activeCategory === cat.key ? "text-white border-b-2 border-orange-500 bg-gray-800/50" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/30")}`)}>${escape_html(cat.label)}</button>`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
function WeaponGrid($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      weapons,
      selectedDefIndex,
      equippedDefIndexes,
      assetsBase = "http://localhost:3001/assets"
    } = $$props;
    $$renderer2.push(`<div class="grid grid-cols-4 gap-1 p-2"><!--[-->`);
    const each_array = ensure_array_like(weapons);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let weapon = each_array[$$index];
      const isSelected = weapon.defIndex === selectedDefIndex;
      const isEquipped = equippedDefIndexes.includes(weapon.defIndex);
      $$renderer2.push(`<button${attr_class(`relative aspect-square flex flex-col items-center justify-center p-2 rounded transition-all border ${stringify(isSelected ? "border-orange-500 bg-orange-500/10" : isEquipped ? "border-gray-600 bg-gray-800/60" : "border-transparent bg-gray-800/30 hover:bg-gray-800/60 hover:border-gray-600")}`)}${attr("title", weapon.name)}>`);
      if (weapon.iconPath) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<img${attr("src", `${stringify(assetsBase)}/${stringify(weapon.iconPath)}`)}${attr("alt", weapon.name)}${attr_class(`w-full h-full object-contain ${stringify(isSelected ? "opacity-100" : "opacity-70")}`)}/>`);
      } else {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`<div class="w-8 h-8 bg-gray-700 rounded opacity-50"></div>`);
      }
      $$renderer2.push(`<!--]--> `);
      if (isEquipped) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<span class="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-orange-400"></span>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></button>`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
const viewerState = {
  selectedSkin: null,
  wear: 0.15,
  seed: 500
};
const loadoutStore = {
  slots: []
};
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let activeCategory = "rifles";
    let weapons = {};
    const activeWeapons = derived(() => weapons[activeCategory] ?? []);
    const equippedDefIndexes = derived(() => loadoutStore.slots.map((s) => s.weaponDefIndex));
    $$renderer2.push(`<div class="flex flex-col h-screen bg-gray-950 text-white overflow-hidden">`);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="flex flex-1 overflow-hidden"><aside class="w-72 bg-gray-900 border-r border-gray-800 flex flex-col overflow-hidden">`);
    WeaponCategoryTabs($$renderer2, {
      activeCategory
    });
    $$renderer2.push(`<!----> <div class="flex-1 overflow-y-auto">`);
    WeaponGrid($$renderer2, {
      weapons: activeWeapons(),
      selectedDefIndex: null,
      equippedDefIndexes: equippedDefIndexes()
    });
    $$renderer2.push(`<!----></div></aside> <main class="flex-1 flex flex-col overflow-hidden"><div class="flex-1 p-4">`);
    WeaponScene($$renderer2, {
      skin: viewerState.selectedSkin,
      wear: viewerState.wear,
      seed: viewerState.seed
    });
    $$renderer2.push(`<!----></div> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></main></div></div> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  _page as default
};
