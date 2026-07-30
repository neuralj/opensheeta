import "../../../chunks/index-server.js";
//#region src/routes/health/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		2 * Math.PI * 54;
		$$renderer.push(`<div class="p-6 space-y-6"><div class="flex items-center justify-between"><div><h1 class="text-2xl font-bold text-foreground">Repository Health</h1> <p class="text-sm text-muted-foreground mt-1">Continuous analysis of code quality</p></div> <button class="px-3 py-1.5 rounded-lg bg-card border border-border text-sm hover:bg-muted transition-colors">Re-analyze</button></div> `);
		$$renderer.push("<!--[0-->");
		$$renderer.push(`<div class="flex items-center justify-center h-64 text-muted-foreground">Analyzing repository health...</div>`);
		$$renderer.push(`<!--]--></div>`);
	});
}
//#endregion
export { _page as default };
