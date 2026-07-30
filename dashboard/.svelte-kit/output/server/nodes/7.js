

export const index = 7;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/timeline/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/7.BRy1Wfzc.js","_app/immutable/chunks/Bs94_2Mz.js","_app/immutable/chunks/xihTtKlq.js"];
export const stylesheets = [];
export const fonts = [];
