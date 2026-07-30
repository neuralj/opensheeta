

export const index = 5;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/health/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/5.HQqjCJgr.js","_app/immutable/chunks/DPlfsHk4.js","_app/immutable/chunks/xihTtKlq.js"];
export const stylesheets = [];
export const fonts = [];
