

export const index = 5;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/u/_steamId_/_page.svelte.js')).default;
export const universal = {
  "ssr": false,
  "load": null
};
export const universal_id = "src/routes/u/[steamId]/+page.ts";
export const imports = ["_app/immutable/nodes/5.CqhTtxPT.js","_app/immutable/chunks/QqTEPACq.js","_app/immutable/chunks/BldJgRmX.js","_app/immutable/chunks/DYB6MTBb.js","_app/immutable/chunks/BTqL3CgY.js","_app/immutable/chunks/uDQTR8FO.js","_app/immutable/chunks/Bn7vWjeD.js","_app/immutable/chunks/DQYzWflM.js","_app/immutable/chunks/JpvzwrVn.js"];
export const stylesheets = [];
export const fonts = [];
