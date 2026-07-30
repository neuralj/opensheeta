import { N as ensure_array_like, O as store_get, P as attr, Q as attr_class, R as escape_html, S as unsubscribe_stores, T as getContext } from '../../chunks/index-server.js-B2n26aNO.js';
import '../../chunks/client.js-DimMGAbI.js';
import 'clsx';
import '../../chunks/shared.js-BgNmPjOs.js';
import '../../chunks/internal2.js-4Iiuv5KW.js';
import '../../chunks/exports.js-BGv4UhcJ.js';
import '../../chunks/utils.js-DunYfjcG.js';

//#region node_modules/@sveltejs/kit/src/runtime/app/stores.js
/**
* A function that returns all of the contextual stores. On the server, this must be called during component initialization.
* Only use this if you need to defer store subscription until after the component has mounted, for some reason.
*
* @deprecated Use `$app/state` instead (requires Svelte 5, [see docs for more info](https://svelte.dev/docs/kit/migrating-to-sveltekit-2#SvelteKit-2.12:-$app-stores-deprecated))
*/
var getStores = () => {
	const stores$1 = getContext("__svelte__");
	return {
		/** @type {typeof page} */
		page: { subscribe: stores$1.page.subscribe },
		/** @type {typeof navigating} */
		navigating: { subscribe: stores$1.navigating.subscribe },
		/** @type {typeof updated} */
		updated: stores$1.updated
	};
};
/**
* A readable store whose value contains page data.
*
* On the server, this store can only be subscribed to during component initialization. In the browser, it can be subscribed to at any time.
*
* @deprecated Use `page` from `$app/state` instead (requires Svelte 5, [see docs for more info](https://svelte.dev/docs/kit/migrating-to-sveltekit-2#SvelteKit-2.12:-$app-stores-deprecated))
* @type {import('svelte/store').Readable<import('@sveltejs/kit').Page>}
*/
var page = { subscribe(fn) {
	return getStores().page.subscribe(fn);
} };
//#endregion
//#region src/lib/components/Sidebar.svelte
function Sidebar($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		const links = [
			{
				href: "/",
				label: "Overview",
				icon: "◉"
			},
			{
				href: "/browse",
				label: "Files",
				icon: "📁"
			},
			{
				href: "/architecture",
				label: "Architecture",
				icon: "⬡"
			},
			{
				href: "/memory",
				label: "Memory",
				icon: "◈"
			},
			{
				href: "/timeline",
				label: "Timeline",
				icon: "⟳"
			},
			{
				href: "/health",
				label: "Health",
				icon: "♡"
			},
			{
				href: "/services",
				label: "Services",
				icon: "⚡"
			}
		];
		$$renderer.push(`<aside class="w-56 bg-sidebar border-r border-sidebar-border flex flex-col shrink-0"><div class="p-4 border-b border-sidebar-border"><h1 class="text-lg font-bold text-accent-blue">opensheeta</h1> <p class="text-xs text-muted-foreground mt-1">Living Repository</p></div> <nav class="flex-1 p-2 space-y-1"><!--[-->`);
		const each_array = ensure_array_like(links);
		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let link = each_array[$$index];
			const active = store_get($$store_subs ??= {}, "$page", page).url.pathname === link.href || link.href !== "/" && store_get($$store_subs ??= {}, "$page", page).url.pathname.startsWith(link.href);
			$$renderer.push(`<a${attr("href", link.href)}${attr_class(`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${active ? "bg-sidebar-accent text-accent-blue" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"}`)}><span class="text-base">${escape_html(link.icon)}</span> <span>${escape_html(link.label)}</span></a>`);
		}
		$$renderer.push(`<!--]--></nav> <div class="p-3 border-t border-sidebar-border"><div class="flex items-center justify-between text-xs text-muted-foreground"><span>opensheeta</span> <span class="text-accent-green">●</span></div></div></aside>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
//#region src/routes/+layout.svelte
function _layout($$renderer, $$props) {
	let { children } = $$props;
	$$renderer.push(`<div class="flex h-screen overflow-hidden">`);
	Sidebar($$renderer);
	$$renderer.push(`<!----> <main class="flex-1 overflow-auto">`);
	children($$renderer);
	$$renderer.push(`<!----></main></div>`);
}

export { _layout as default };
//# sourceMappingURL=_layout.svelte.js-CztoRAsg.js.map
