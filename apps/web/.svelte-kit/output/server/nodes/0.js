

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export const universal = {
  "ssr": false
};
export const universal_id = "src/routes/+layout.ts";
export const imports = ["_app/immutable/nodes/0.CzuHjEgl.js","_app/immutable/chunks/Bxc7W1O4.js","_app/immutable/chunks/DmyYDtSF.js","_app/immutable/chunks/M-YyH8Si.js","_app/immutable/chunks/-_YMUeiT.js"];
export const stylesheets = ["_app/immutable/assets/0.DtZc5GCp.css"];
export const fonts = [];
