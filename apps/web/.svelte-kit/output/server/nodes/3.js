

export const index = 3;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/builder/_page.svelte.js')).default;
export const universal = {
  "ssr": false,
  "load": null
};
export const universal_id = "src/routes/builder/+page.ts";
export const imports = ["_app/immutable/nodes/3.B0Z_uhPd.js","_app/immutable/chunks/QqTEPACq.js","_app/immutable/chunks/BldJgRmX.js","_app/immutable/chunks/DYB6MTBb.js","_app/immutable/chunks/BTqL3CgY.js","_app/immutable/chunks/uDQTR8FO.js","_app/immutable/chunks/Bn7vWjeD.js","_app/immutable/chunks/BawOW58u.js","_app/immutable/chunks/DgQ21AJf.js","_app/immutable/chunks/DW01a6TE.js","_app/immutable/chunks/B66isYk1.js","_app/immutable/chunks/JpvzwrVn.js","_app/immutable/chunks/DU8NM16f.js","_app/immutable/chunks/BUApaBEI.js"];
export const stylesheets = [];
export const fonts = [];
