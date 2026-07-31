import { c as store_get, h as escape_html, m as attr, o as ensure_array_like, r as attr_class, u as unsubscribe_stores } from "../../chunks/index-server.js";
import { t as page } from "../../chunks/stores.js";
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
	Sidebar($$renderer, {});
	$$renderer.push(`<!----> <main class="flex-1 overflow-auto">`);
	children($$renderer);
	$$renderer.push(`<!----></main></div>`);
}
//#endregion
export { _layout as default };
