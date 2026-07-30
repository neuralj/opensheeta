

export const index = 6;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/memory/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/6.D-D0EBhJ.js","_app/immutable/chunks/DPlfsHk4.js","_app/immutable/chunks/xihTtKlq.js"];
export const stylesheets = [];
export const fonts = [];
