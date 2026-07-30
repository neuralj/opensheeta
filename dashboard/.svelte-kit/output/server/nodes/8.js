

export const index = 8;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/timeline/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/8.CHdKl49p.js","_app/immutable/chunks/DPlfsHk4.js","_app/immutable/chunks/xihTtKlq.js"];
export const stylesheets = [];
export const fonts = [];
