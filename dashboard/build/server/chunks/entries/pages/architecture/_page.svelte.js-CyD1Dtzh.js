import { R as escape_html } from '../../../chunks/index-server.js-BdNQyuwB.js';
import 'clsx';

//#region src/routes/architecture/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		$$renderer.push(`<div class="p-6 space-y-6"><div class="flex items-center justify-between"><div><h1 class="text-2xl font-bold text-foreground">Live Architecture</h1> <p class="text-sm text-muted-foreground mt-1">${escape_html("Loading...")}</p></div> <div class="flex gap-2"><button class="px-3 py-1.5 rounded-lg bg-card border border-border text-sm hover:bg-muted transition-colors">${escape_html("Hide Graph")}</button> <button class="px-3 py-1.5 rounded-lg bg-card border border-border text-sm hover:bg-muted transition-colors">Refresh</button></div></div> `);
		$$renderer.push("<!--[0-->");
		$$renderer.push(`<div class="flex items-center justify-center h-64 text-muted-foreground">Analyzing imports...</div>`);
		$$renderer.push(`<!--]--></div>`);
	});
}

export { _page as default };
//# sourceMappingURL=_page.svelte.js-CyD1Dtzh.js.map
