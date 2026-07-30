import { h as escape_html, i as attr_class, o as derived } from "../../../chunks/index-server.js";
//#region src/routes/timeline/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let entries = [];
		derived(() => entries);
		$$renderer.push(`<div class="p-6 space-y-6"><div class="flex items-center justify-between"><div><h1 class="text-2xl font-bold text-foreground">Execution Timeline</h1> <p class="text-sm text-muted-foreground mt-1">${escape_html(entries.length)} events recorded</p></div> <button class="px-3 py-1.5 rounded-lg bg-card border border-border text-sm hover:bg-muted transition-colors">Refresh</button></div> <div class="flex gap-1"><button${attr_class(`px-3 py-1 rounded-lg text-xs transition-colors bg-accent-blue text-white`)}>All</button> <button${attr_class(`px-3 py-1 rounded-lg text-xs transition-colors bg-card border border-border text-muted-foreground hover:bg-muted`)}>Tasks</button> <button${attr_class(`px-3 py-1 rounded-lg text-xs transition-colors bg-card border border-border text-muted-foreground hover:bg-muted`)}>Commits</button></div> `);
		$$renderer.push("<!--[0-->");
		$$renderer.push(`<div class="flex items-center justify-center h-64 text-muted-foreground">Loading timeline...</div>`);
		$$renderer.push(`<!--]--></div>`);
	});
}
//#endregion
export { _page as default };
