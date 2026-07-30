<script lang="ts">
	import { onMount } from 'svelte';

	interface ArchResult {
		files: { path: string; relativePath: string; layer: string; imports: string[]; lineCount: number }[];
		layers: { name: string; files: string[]; dependsOn: string[] }[];
		hotModules: { path: string; changes: number; lastChanged: string }[];
		circularDeps: string[][];
		stats: { totalFiles: number; totalImports: number; couplingScore: number; layerViolations: number };
		mermaidGraph: string;
	}

	let result: ArchResult | null = $state(null);
	let loading: boolean = $state(true);
	let showGraph: boolean = $state(true);

	async function load() {
		loading = true;
		try {
			const res = await fetch('/api/architecture');
			result = await res.json();
		} catch (e) {
			console.error(e);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		load();
	});

	$effect(() => {
		if (result && showGraph) {
			renderMermaid(result.mermaidGraph);
		}
	});

	async function renderMermaid(graph: string) {
		await new Promise((r) => setTimeout(r, 100));
		const el = document.getElementById('mermaid-container');
		if (!el) return;
		try {
			const mermaid = await import('mermaid');
			mermaid.default.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });
			const { svg } = await mermaid.default.render('mermaid-svg', graph);
			el.innerHTML = svg;
		} catch (e) {
			el.innerHTML = `<pre class="text-xs text-muted-foreground overflow-auto">${graph}</pre>`;
		}
	}
</script>

<div class="p-6 space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-foreground">Live Architecture</h1>
			<p class="text-sm text-muted-foreground mt-1">
				{result ? `${result.stats.totalFiles} files · ${result.stats.totalImports} imports · coupling: ${(result.stats.couplingScore * 100).toFixed(0)}%` : 'Loading...'}
			</p>
		</div>
		<div class="flex gap-2">
			<button onclick={() => (showGraph = !showGraph)} class="px-3 py-1.5 rounded-lg bg-card border border-border text-sm hover:bg-muted transition-colors">
				{showGraph ? 'Hide Graph' : 'Show Graph'}
			</button>
			<button onclick={load} class="px-3 py-1.5 rounded-lg bg-card border border-border text-sm hover:bg-muted transition-colors">
				Refresh
			</button>
		</div>
	</div>

	{#if loading && !result}
		<div class="flex items-center justify-center h-64 text-muted-foreground">Analyzing imports...</div>
	{:else if result}
		{#if showGraph}
			<div class="bg-card border border-border rounded-xl p-4">
				<h2 class="text-sm font-semibold text-foreground mb-3">Dependency Graph</h2>
				<div id="mermaid-container" class="overflow-auto min-h-[300px] flex items-center justify-center"></div>
			</div>
		{/if}

		<div class="grid grid-cols-3 gap-4">
			<div class="bg-card border border-border rounded-xl p-4">
				<h2 class="text-sm font-semibold text-foreground mb-3">Layers</h2>
				<div class="space-y-2">
					{#each result.layers as layer}
						<div class="flex items-center justify-between">
							<span class="text-sm text-foreground capitalize">{layer.name}</span>
							<span class="text-xs text-accent-purple font-mono">{layer.files.length} files</span>
						</div>
						<div class="text-xs text-muted-foreground">
							depends on: {layer.dependsOn.join(', ') || 'none'}
						</div>
					{/each}
				</div>
			</div>

			<div class="bg-card border border-border rounded-xl p-4">
				<h2 class="text-sm font-semibold text-foreground mb-3">Hot Modules</h2>
				<div class="space-y-2">
					{#each result.hotModules as mod}
						<div class="flex items-center justify-between">
							<span class="text-xs text-foreground font-mono truncate">{mod.path.replace('src/', '')}</span>
							<span class="text-xs text-accent-yellow">{mod.changes} changes</span>
						</div>
					{/each}
				</div>
			</div>

			<div class="bg-card border border-border rounded-xl p-4">
				<h2 class="text-sm font-semibold text-foreground mb-3">Metrics</h2>
				<div class="space-y-3">
					<div>
						<div class="text-xs text-muted-foreground mb-1">Coupling Score</div>
						<div class="w-full bg-muted rounded-full h-2">
							<div class="h-2 rounded-full bg-accent-blue" style="width: {result.stats.couplingScore * 100}%"></div>
						</div>
						<div class="text-xs text-muted-foreground mt-1">{(result.stats.couplingScore * 100).toFixed(0)}%</div>
					</div>
					<div>
						<div class="text-xs text-muted-foreground mb-1">Layer Violations</div>
						<div class="text-lg font-bold {result.stats.layerViolations > 0 ? 'text-accent-red' : 'text-accent-green'}">
							{result.stats.layerViolations}
						</div>
					</div>
					<div>
						<div class="text-xs text-muted-foreground mb-1">Circular Dependencies</div>
						<div class="text-lg font-bold {result.circularDeps.length > 0 ? 'text-accent-red' : 'text-accent-green'}">
							{result.circularDeps.length}
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- All Files -->
		<div class="bg-card border border-border rounded-xl p-4">
			<h2 class="text-sm font-semibold text-foreground mb-3">All Source Files ({result.files.length})</h2>
			<div class="max-h-[400px] overflow-auto">
				<table class="w-full text-xs">
					<thead class="sticky top-0 bg-card">
						<tr class="text-muted-foreground">
							<th class="text-left py-1">File</th>
							<th class="text-left py-1">Layer</th>
							<th class="text-right py-1">Lines</th>
							<th class="text-right py-1">Imports</th>
						</tr>
					</thead>
					<tbody>
						{#each result.files as file}
							<tr class="border-t border-border/50">
								<td class="py-1 font-mono text-foreground">{file.relativePath}</td>
								<td class="py-1 capitalize text-accent-purple">{file.layer}</td>
								<td class="py-1 text-right text-muted-foreground">{file.lineCount}</td>
								<td class="py-1 text-right text-muted-foreground">{file.imports.length}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
