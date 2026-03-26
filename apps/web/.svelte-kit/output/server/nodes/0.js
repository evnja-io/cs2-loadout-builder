

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export const universal = {
  "ssr": false
};
export const universal_id = "src/routes/+layout.ts";
export const imports = ["_app/immutable/nodes/0.BDDcsSA3.js","_app/immutable/chunks/DYB6MTBb.js","_app/immutable/chunks/BldJgRmX.js","_app/immutable/chunks/B66isYk1.js","_app/immutable/chunks/Bn7vWjeD.js"];
export const stylesheets = ["_app/immutable/assets/0.D5yeceOT.css"];
export const fonts = [];
