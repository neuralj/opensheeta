

export const index = 7;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/services/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/7.CW9OOnRK.js","_app/immutable/chunks/DPlfsHk4.js","_app/immutable/chunks/xihTtKlq.js"];
export const stylesheets = [];
export const fonts = [];
