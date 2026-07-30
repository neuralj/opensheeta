

export const index = 5;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/memory/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/5.DxJn3pV1.js","_app/immutable/chunks/Bs94_2Mz.js","_app/immutable/chunks/xihTtKlq.js"];
export const stylesheets = [];
export const fonts = [];
