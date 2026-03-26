import { b as ensure_array_like, c as attr_class, s as stringify, e as escape_html, a as attr, d as derived } from "../../../chunks/index.js";
import "../../../chunks/PaintkitMaterial.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/root.js";
import "../../../chunks/state.svelte.js";
function WeaponCategoryTabs($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const CATEGORIES = [
      { key: "rifles", label: "Rifles" },
      { key: "pistols", label: "Pistols" },
      { key: "smgs", label: "SMGs" },
      { key: "heavy", label: "Heavy" },
      { key: "knives", label: "Knives" },
      { key: "gloves", label: "Gloves" }
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
function WeaponSlotCard($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const RARITY_BORDER = {
      consumer: "border-gray-500",
      industrial: "border-blue-500",
      "mil-spec": "border-blue-400",
      restricted: "border-purple-500",
      classified: "border-pink-500",
      covert: "border-red-500",
      contraband: "border-yellow-500"
    };
    let {
      weapon,
      skin,
      assetsBase = "/assets"
    } = $$props;
    const rarityBorder = derived(() => skin ? RARITY_BORDER[skin.rarity] ?? "border-gray-600" : "");
    const skinSubName = derived(() => skin ? skin.name.split(" | ")[1] ?? skin.name : "");
    if (skin) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<button${attr_class(`group relative rounded-lg overflow-hidden border-2 bg-gray-800 transition-all hover:brightness-110 hover:scale-[1.02] ${stringify(rarityBorder())}`)}><div class="aspect-[4/3] relative overflow-hidden bg-gray-900">`);
      if (skin.iconPath) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<img${attr("src", `${stringify(assetsBase)}/${stringify(skin.iconPath)}`)}${attr("alt", skin.name)} class="w-full h-full object-cover" loading="lazy"/>`);
      } else {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`<div class="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center"><span class="text-gray-500 text-xs">${escape_html(skin.finishStyle)}</span></div>`);
      }
      $$renderer2.push(`<!--]--></div> <div class="p-2 bg-gray-800"><p class="text-xs text-gray-400 truncate">${escape_html(weapon.name)}</p> <p class="text-xs font-medium text-white truncate">${escape_html(skinSubName())}</p></div></button>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="rounded-lg border border-dashed border-gray-700 bg-gray-800/30 p-3 flex flex-col items-center gap-2"><div class="aspect-[4/3] w-full flex items-center justify-center">`);
      if (weapon.iconPath) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<img${attr("src", `${stringify(assetsBase)}/${stringify(weapon.iconPath)}`)}${attr("alt", weapon.name)} class="max-h-16 max-w-full object-contain opacity-40" loading="lazy"/>`);
      } else {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`<div class="w-12 h-8 bg-gray-700/50 rounded opacity-40"></div>`);
      }
      $$renderer2.push(`<!--]--></div> <p class="text-xs text-gray-400 truncate w-full text-center">${escape_html(weapon.name)}</p> <button class="text-xs px-3 py-1 bg-orange-500/20 hover:bg-orange-500/40 text-orange-400 rounded border border-orange-500/30 transition-colors">+ Add skin</button></div>`);
    }
    $$renderer2.push(`<!--]-->`);
  });
}
function WeaponGrid($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      weapons,
      slots,
      skinsById,
      assetsBase = "/assets"
    } = $$props;
    $$renderer2.push(`<div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 p-4"><!--[-->`);
    const each_array = ensure_array_like(weapons);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let weapon = each_array[$$index];
      const slot = slots.find((s) => s.weaponDefIndex === weapon.defIndex) ?? null;
      const skin = slot ? skinsById.get(slot.skinId) ?? null : null;
      WeaponSlotCard($$renderer2, {
        weapon,
        skin,
        assetsBase
      });
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
const loadoutStore = {
  slots: []
};
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let activeCategory = "rifles";
    let weapons = {};
    let skinsById = /* @__PURE__ */ new Map();
    const activeWeapons = derived(() => weapons[activeCategory] ?? []);
    $$renderer2.push(`<div class="flex flex-col h-screen bg-gray-950 text-white overflow-hidden">`);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    WeaponCategoryTabs($$renderer2, {
      activeCategory
    });
    $$renderer2.push(`<!----> <main class="flex-1 overflow-y-auto">`);
    WeaponGrid($$renderer2, {
      weapons: activeWeapons(),
      slots: loadoutStore.slots,
      skinsById
    });
    $$renderer2.push(`<!----></main></div> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
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
