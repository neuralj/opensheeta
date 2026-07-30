import { g as escape_html, i as attr_class, n as onDestroy, s as ensure_array_like, u as stringify } from "../../../chunks/index-server.js";
//#region src/routes/services/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let services = [];
		onDestroy(() => {});
		function getStatusColor(status) {
			switch (status) {
				case "running": return "text-accent-green";
				case "stopped": return "text-accent-yellow";
				case "not_loaded": return "text-accent-red";
				default: return "text-muted-foreground";
			}
		}
		function getStatusDot(status) {
			switch (status) {
				case "running": return "bg-accent-green";
				case "stopped": return "bg-accent-yellow";
				case "not_loaded": return "bg-accent-red";
				default: return "bg-muted-foreground";
			}
		}
		$$renderer.push(`<div class="p-6 space-y-6"><div class="flex items-center justify-between"><div><h1 class="text-2xl font-bold text-foreground">Services</h1> <p class="text-sm text-muted-foreground mt-1">${escape_html(services.length)} service${escape_html(services.length !== 1 ? "s" : "")} configured</p></div> <button class="px-3 py-1.5 rounded-lg bg-card border border-border text-sm hover:bg-muted transition-colors">Refresh</button></div> `);
		if (services.length === 0) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="grid grid-cols-1 md:grid-cols-2 gap-4"><!--[-->`);
			const each_array = ensure_array_like([1, 2]);
			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				each_array[$$index];
				$$renderer.push(`<div class="bg-card border border-border rounded-xl p-4 animate-pulse"><div class="h-6 bg-muted rounded w-1/3 mb-3"></div> <div class="h-4 bg-muted rounded w-1/2 mb-2"></div> <div class="h-4 bg-muted rounded w-1/4"></div></div>`);
			}
			$$renderer.push(`<!--]--></div>`);
		} else if (services.length === 0) {
			$$renderer.push("<!--[1-->");
			$$renderer.push(`<div class="flex flex-col items-center justify-center h-64 text-muted-foreground"><span class="text-4xl mb-3">⚡</span> <p>No services configured</p> <p class="text-xs mt-1">Add plist files to scripts/ directory</p></div>`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<div class="grid grid-cols-1 md:grid-cols-2 gap-4"><!--[-->`);
			const each_array_1 = ensure_array_like(services);
			for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
				let service = each_array_1[$$index_1];
				$$renderer.push(`<div class="bg-card border border-border rounded-xl p-4"><div class="flex items-center justify-between mb-3"><div class="flex items-center gap-2"><span${attr_class(`w-2.5 h-2.5 rounded-full ${stringify(getStatusDot(service.status))}`)}></span> <h2 class="text-lg font-semibold text-foreground">${escape_html(service.name)}</h2></div> <span${attr_class(`px-2 py-0.5 rounded-full text-xs ${stringify(getStatusColor(service.status))} bg-muted`)}>${escape_html(service.status)}</span></div> <div class="grid grid-cols-2 gap-4 text-sm mb-3"><div><span class="text-muted-foreground">Port:</span> <span class="ml-2 font-mono text-foreground">${escape_html(service.port)}</span></div> <div><span class="text-muted-foreground">PID:</span> <span class="ml-2 font-mono text-foreground">${escape_html(service.pid ?? "-")}</span></div></div> `);
				if (service.logTail.length > 0) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<div class="mt-3"><div class="text-xs text-muted-foreground mb-1">Recent logs</div> <pre class="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2 max-h-32 overflow-auto font-mono">${escape_html(service.logTail.join("\n"))}</pre></div>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--></div>`);
			}
			$$renderer.push(`<!--]--></div>`);
		}
		$$renderer.push(`<!--]--> <div class="bg-card border border-border rounded-xl p-4 mt-6"><h2 class="text-sm font-semibold text-foreground mb-2">Service Management</h2> <p class="text-xs text-muted-foreground mb-3">Use the CLI to manage services:</p> <pre class="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 font-mono">scripts/services status          # View all services
scripts/services start           # Start all services
scripts/services stop            # Stop all services
scripts/services restart         # Restart all services
scripts/services logs &lt;name>    # Tail service logs
scripts/services build &lt;name>   # Build service</pre></div></div>`);
	});
}
//#endregion
export { _page as default };
