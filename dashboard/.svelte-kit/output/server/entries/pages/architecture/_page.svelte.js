import { h as escape_html } from "../../../chunks/index-server.js";
import "d3-zoom";
//#region src/routes/architecture/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		$$renderer.push(`<div class="p-6 space-y-4"><div class="flex items-center justify-between"><div><h1 class="text-2xl font-bold text-foreground">Architecture Visualization</h1> <p class="text-sm text-muted-foreground mt-1">${escape_html("Loading...")}</p></div> <div class="flex gap-2 items-center"><div class="flex gap-1 bg-card border border-border rounded-lg p-1"><button class="px-2 py-1 rounded text-sm hover:bg-muted transition-colors" title="Zoom out">−</button> <span class="px-2 py-1 text-xs text-muted-foreground min-w-[3rem] text-center">${escape_html(100 .toFixed(0))}%</span> <button class="px-2 py-1 rounded text-sm hover:bg-muted transition-colors" title="Zoom in">+</button> <button class="px-2 py-1 rounded text-sm hover:bg-muted transition-colors" title="Reset">⟲</button></div> <button class="px-3 py-1.5 rounded-lg bg-card border border-border text-sm hover:bg-muted transition-colors">${escape_html("Hide legend")}</button> <button class="px-3 py-1.5 rounded-lg bg-card border border-border text-sm hover:bg-muted transition-colors">Refresh</button></div></div> `);
		$$renderer.push("<!--[0-->");
		$$renderer.push(`<div class="flex items-center justify-center h-64 text-muted-foreground">Analyzing imports...</div>`);
		$$renderer.push(`<!--]--></div>`);
	});
}
//#endregion
export { _page as default };
