import { g as escape_html, h as attr, i as attr_class, s as ensure_array_like } from "../../../chunks/index-server.js";
//#region src/routes/memory/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let entries = [];
		let selectedCategory = "";
		let searchQuery = "";
		const categories = [
			{
				value: "",
				label: "All"
			},
			{
				value: "business",
				label: "Business"
			},
			{
				value: "technical",
				label: "Technical"
			},
			{
				value: "architecture",
				label: "Architecture"
			},
			{
				value: "security",
				label: "Security"
			},
			{
				value: "performance",
				label: "Performance"
			},
			{
				value: "incident",
				label: "Incident"
			},
			{
				value: "lesson",
				label: "Lesson"
			}
		];
		$$renderer.push(`<div class="p-6 space-y-6"><div class="flex items-center justify-between"><div><h1 class="text-2xl font-bold text-foreground">Repo Memory</h1> <p class="text-sm text-muted-foreground mt-1">${escape_html(entries.length)} decisions recorded</p></div> <button class="px-3 py-1.5 rounded-lg bg-accent-blue text-white text-sm hover:opacity-90 transition-opacity">${escape_html("+ New Decision")}</button></div> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <div class="flex gap-3"><div class="flex gap-1"><!--[-->`);
		const each_array_1 = ensure_array_like(categories);
		for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
			let cat = each_array_1[$$index_1];
			$$renderer.push(`<button${attr_class(`px-3 py-1 rounded-lg text-xs transition-colors ${selectedCategory === cat.value ? "bg-accent-blue text-white" : "bg-card border border-border text-muted-foreground hover:bg-muted"}`)}>${escape_html(cat.label)}</button>`);
		}
		$$renderer.push(`<!--]--></div> <input${attr("value", searchQuery)} placeholder="Search..." class="px-3 py-1 rounded-lg bg-card border border-border text-sm text-foreground flex-1 max-w-xs"/></div> `);
		$$renderer.push("<!--[0-->");
		$$renderer.push(`<div class="flex items-center justify-center h-32 text-muted-foreground">Loading...</div>`);
		$$renderer.push(`<!--]--></div>`);
	});
}
//#endregion
export { _page as default };
