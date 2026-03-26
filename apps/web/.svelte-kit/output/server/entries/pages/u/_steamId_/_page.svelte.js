import { q as head, b as ensure_array_like, a as attr, s as stringify, e as escape_html } from "../../../../chunks/index.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    head("1j1juu2", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Loadouts — CS2 Builder</title>`);
      });
    });
    $$renderer2.push(`<div class="min-h-screen bg-gray-950 text-white p-8 max-w-5xl mx-auto"><h1 class="text-2xl font-bold mb-6">Public Loadouts</h1> `);
    if (data.loadouts.length === 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<p class="text-gray-500">No public loadouts yet.</p>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"><!--[-->`);
      const each_array = ensure_array_like(data.loadouts);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let loadout = each_array[$$index];
        if (loadout.shareSlug) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<a${attr("href", `/share/${stringify(loadout.shareSlug)}`)} class="block bg-gray-900 rounded-xl p-4 hover:bg-gray-800 transition-colors border border-gray-800 hover:border-gray-600"><h2 class="font-semibold mb-1">${escape_html(loadout.name)}</h2> <p class="text-sm text-gray-400">${escape_html(loadout.slots?.length ?? 0)} weapons configured</p> <div class="flex items-center gap-1 mt-2 text-xs text-gray-500"><span>❤ ${escape_html(loadout.likesCount)}</span> <span class="ml-auto">${escape_html(new Date(loadout.createdAt).toLocaleDateString())}</span></div></a>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
export {
  _page as default
};
