

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export const imports = ["_app/immutable/nodes/0.BGwPb6d2.js","_app/immutable/chunks/DPlfsHk4.js","_app/immutable/chunks/CpwKoztI.js","_app/immutable/chunks/xihTtKlq.js"];
export const stylesheets = ["_app/immutable/assets/0.bU-9AhEW.css"];
export const fonts = [];
