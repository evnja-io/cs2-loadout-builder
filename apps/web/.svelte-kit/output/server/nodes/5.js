

export const index = 5;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/u/_steamId_/_page.svelte.js')).default;
export const universal = {
  "ssr": false,
  "load": null
};
export const universal_id = "src/routes/u/[steamId]/+page.ts";
export const imports = ["_app/immutable/nodes/5.Bqy_mnkJ.js","_app/immutable/chunks/Bf9gi4eS.js","_app/immutable/chunks/DmyYDtSF.js","_app/immutable/chunks/Bxc7W1O4.js","_app/immutable/chunks/IJ4SYC2v.js","_app/immutable/chunks/D1BUG9yL.js","_app/immutable/chunks/-_YMUeiT.js","_app/immutable/chunks/DGUFzYyA.js","_app/immutable/chunks/C-A0iQSx.js"];
export const stylesheets = [];
export const fonts = [];
