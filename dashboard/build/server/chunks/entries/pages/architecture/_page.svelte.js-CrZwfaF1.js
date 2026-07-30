import { R as escape_html } from '../../../chunks/index-server.js-B2n26aNO.js';
import 'd3-zoom';
import 'clsx';

//#region src/routes/architecture/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		$$renderer.push(`<div class="p-6 space-y-4"><div class="flex items-center justify-between"><div><h1 class="text-2xl font-bold text-foreground">Architecture Visualization</h1> <p class="text-sm text-muted-foreground mt-1">${escape_html("Loading...")}</p></div> <div class="flex gap-2 items-center"><div class="flex gap-1 bg-card border border-border rounded-lg p-1"><button class="px-2 py-1 rounded text-sm hover:bg-muted transition-colors" title="缩小">−</button> <span class="px-2 py-1 text-xs text-muted-foreground min-w-[3rem] text-center">${escape_html(100 .toFixed(0))}%</span> <button class="px-2 py-1 rounded text-sm hover:bg-muted transition-colors" title="放大">+</button> <button class="px-2 py-1 rounded text-sm hover:bg-muted transition-colors" title="重置">⟲</button></div> <button class="px-3 py-1.5 rounded-lg bg-card border border-border text-sm hover:bg-muted transition-colors">${escape_html("隐藏图例")}</button> <button class="px-3 py-1.5 rounded-lg bg-card border border-border text-sm hover:bg-muted transition-colors">刷新</button></div></div> `);
		$$renderer.push("<!--[0-->");
		$$renderer.push(`<div class="flex items-center justify-center h-64 text-muted-foreground">Analyzing imports...</div>`);
		$$renderer.push(`<!--]--></div>`);
	});
}

export { _page as default };
//# sourceMappingURL=_page.svelte.js-CrZwfaF1.js.map
