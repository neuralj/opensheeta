import { h as escape_html } from "../../chunks/index-server.js";
//#region src/routes/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		$$renderer.push(`<div class="p-6 space-y-6"><div class="flex items-center justify-between"><div><h1 class="text-2xl font-bold text-foreground">Repository State</h1> <p class="text-sm text-muted-foreground mt-1">${escape_html("Loading...")}</p></div> <button class="px-3 py-1.5 rounded-lg bg-card border border-border text-sm hover:bg-muted transition-colors">Refresh</button></div> `);
		$$renderer.push("<!--[0-->");
		$$renderer.push(`<div class="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>`);
		$$renderer.push(`<!--]--></div>`);
	});
}
//#endregion
export { _page as default };
