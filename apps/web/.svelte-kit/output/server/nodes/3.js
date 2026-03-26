

export const index = 3;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/builder/_page.svelte.js')).default;
export const universal = {
  "ssr": false,
  "load": null
};
export const universal_id = "src/routes/builder/+page.ts";
export const imports = ["_app/immutable/nodes/3.BkuOJOI6.js","_app/immutable/chunks/BrOO1RS3.js","_app/immutable/chunks/BUApaBEI.js","_app/immutable/chunks/Bxc7W1O4.js","_app/immutable/chunks/DmyYDtSF.js","_app/immutable/chunks/D1BUG9yL.js","_app/immutable/chunks/-_YMUeiT.js","_app/immutable/chunks/WHZHqRvX.js","_app/immutable/chunks/Dw6Ka_Vn.js","_app/immutable/chunks/M-YyH8Si.js","_app/immutable/chunks/IJ4SYC2v.js","_app/immutable/chunks/Bf9gi4eS.js","_app/immutable/chunks/C-A0iQSx.js","_app/immutable/chunks/3ih-b17J.js"];
export const stylesheets = ["_app/immutable/assets/auth.CCODE3Z0.css"];
export const fonts = [];
