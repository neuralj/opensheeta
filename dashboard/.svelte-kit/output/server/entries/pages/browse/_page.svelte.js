import { g as escape_html, s as ensure_array_like } from "../../../chunks/index-server.js";
//#region src/lib/components/FileTree.svelte
function FileTree_1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { path = "", onSelect = () => {} } = $$props;
		let items = [];
		let expanded = {};
		let childItems = {};
		function formatSize(bytes) {
			if (bytes === 0) return "—";
			if (bytes < 1024) return `${bytes} B`;
			if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
			return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
		}
		function getIcon(name, isDir) {
			if (isDir) return "📁";
			if (name.endsWith(".md")) return "📝";
			if (name.endsWith(".yml") || name.endsWith(".yaml")) return "📋";
			if (name === "Dockerfile") return "🐳";
			if (name.endsWith(".ts") || name.endsWith(".js")) return "📜";
			if (name.endsWith(".sh")) return "⚡";
			if (name.endsWith(".conf")) return "🔧";
			return "📄";
		}
		$$renderer.push(`<div class="text-sm"><!--[-->`);
		const each_array = ensure_array_like(items);
		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let item = each_array[$$index];
			$$renderer.push(`<div><button class="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-sidebar-accent rounded transition-colors text-left">`);
			if (item.isDirectory) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<span class="text-xs text-muted-foreground w-4">${escape_html(expanded[item.path] ? "▾" : "▸")}</span>`);
			} else {
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`<span class="w-4"></span>`);
			}
			$$renderer.push(`<!--]--> <span>${escape_html(getIcon(item.name, item.isDirectory))}</span> <span class="flex-1 truncate">${escape_html(item.name)}</span> `);
			if (!item.isDirectory) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<span class="text-xs text-muted-foreground">${escape_html(formatSize(item.size))}</span>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></button> `);
			if (item.isDirectory && expanded[item.path] && childItems[item.path]) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div class="ml-4 border-l border-sidebar-border/50">`);
				FileTree_1($$renderer, {
					path: item.path,
					onSelect
				});
				$$renderer.push(`<!----></div>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></div>`);
		}
		$$renderer.push(`<!--]--></div>`);
	});
}
//#endregion
//#region src/lib/components/CodeViewer.svelte
function CodeViewer($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { content = "", language = "text" } = $$props;
		function escapeHtml(text) {
			return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
		}
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<pre class="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 overflow-auto font-mono leading-relaxed">${escape_html(escapeHtml(content))}</pre>`);
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
//#region src/lib/components/MarkdownView.svelte
function MarkdownView($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { content = "" } = $$props;
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<pre class="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 overflow-auto font-mono">${escape_html(content)}</pre>`);
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
//#region src/routes/browse/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let selectedFile = "";
		let fileContent = "";
		let fileLanguage = "text";
		let loading = false;
		function getLanguage(filename) {
			const ext = filename.split(".").pop()?.toLowerCase() || "";
			const map = {
				ts: "typescript",
				js: "javascript",
				json: "json",
				yml: "yaml",
				yaml: "yaml",
				md: "markdown",
				sh: "bash",
				bash: "bash",
				dockerfile: "dockerfile",
				conf: "nginx",
				Caddyfile: "nginx",
				py: "python",
				go: "go",
				html: "html",
				css: "css",
				toml: "toml",
				xml: "xml",
				sql: "sql"
			};
			if (filename.toLowerCase() === "dockerfile") return "dockerfile";
			return map[ext] || "text";
		}
		async function selectFile(path) {
			selectedFile = path;
			loading = true;
			fileContent = (await (await fetch(`/api/files?action=content&path=${encodeURIComponent(path)}`)).json()).content || "";
			fileLanguage = getLanguage(path);
			loading = false;
		}
		$$renderer.push(`<div class="flex h-full"><div class="w-72 border-r border-sidebar-border overflow-auto shrink-0"><div class="p-3 border-b border-sidebar-border"><h2 class="font-semibold text-sm">Repository Files</h2></div> <div class="p-2">`);
		FileTree_1($$renderer, { onSelect: selectFile });
		$$renderer.push(`<!----></div></div> <div class="flex-1 overflow-auto">`);
		if (loading) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="p-6 space-y-4"><div class="h-5 w-64 bg-muted rounded animate-pulse"></div> <div class="h-96 w-full bg-muted rounded animate-pulse"></div></div>`);
		} else if (selectedFile) {
			$$renderer.push("<!--[1-->");
			$$renderer.push(`<div class="px-4 py-2 border-b border-sidebar-border bg-sidebar flex items-center gap-2"><span class="text-sm font-mono text-accent-blue">${escape_html(selectedFile)}</span></div> `);
			if (selectedFile.endsWith(".md")) {
				$$renderer.push("<!--[0-->");
				MarkdownView($$renderer, { content: fileContent });
			} else {
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`<div class="p-4">`);
				CodeViewer($$renderer, {
					content: fileContent,
					language: fileLanguage
				});
				$$renderer.push(`<!----></div>`);
			}
			$$renderer.push(`<!--]-->`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<div class="flex items-center justify-center h-full text-muted-foreground"><div class="text-center"><p class="text-4xl mb-3">📁</p> <p>Select a file to view</p></div></div>`);
		}
		$$renderer.push(`<!--]--></div></div>`);
	});
}
//#endregion
export { _page as default };
