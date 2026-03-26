import { a as attr, s as stringify } from "../../chunks/index.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const API_URL = "http://localhost:3001";
    $$renderer2.push(`<main class="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center"><h1 class="text-4xl font-bold mb-4">CS2 Loadout Builder</h1> <p class="text-gray-400 mb-8">Build and share your perfect CS2 loadout with 3D skin previews.</p> <a${attr("href", `${stringify(API_URL)}/auth/steam`)} class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">Login with Steam</a></main>`);
  });
}
export {
  _page as default
};
