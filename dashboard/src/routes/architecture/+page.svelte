<script lang="ts">
	import { onMount } from 'svelte';
	import { zoom, zoomIdentity } from 'd3-zoom';
	import { select } from 'd3-selection';
	import { ALLOWED_DEPS, LAYER_COLORS, LAYER_ORDER } from '$lib/architecture-constants.js';
	import type { ArchitectureResult } from '$lib/types.js';

	let result: ArchitectureResult | null = $state(null);
	let loading: boolean = $state(true);
	let showLegend: boolean = $state(true);
	let zoomLevel: number = $state(1);
	let svgElement: SVGSVGElement | null = $state(null);
	let zoomBehavior: any = null;

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
		if (result) {
			renderMermaid(result.overviewGraph);
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

			const svgEl = el.querySelector('svg');
			if (svgEl) {
				svgElement = svgEl as SVGSVGElement;
				setupZoom(svgEl as SVGSVGElement);
			}
		} catch (e) {
			el.innerHTML = `<pre class="text-xs text-muted-foreground overflow-auto">${graph}</pre>`;
		}
	}

	function setupZoom(svgEl: SVGSVGElement) {
		const g = svgEl.querySelector('g');
		if (!g) return;

		const bbox = (g as SVGGElement).getBBox();
		const svgWidth = svgEl.clientWidth || 800;
		const svgHeight = svgEl.clientHeight || 600;

		svgEl.removeAttribute('viewBox');
		svgEl.setAttribute('width', '100%');
		svgEl.setAttribute('height', '100%');

		zoomBehavior = zoom()
			.scaleExtent([0.1, 3])
			.on('zoom', (event: any) => {
				g.setAttribute('transform', event.transform.toString());
				zoomLevel = event.transform.k;
			});

		select(svgEl).call(zoomBehavior);

		const scale = Math.min(svgWidth / bbox.width, svgHeight / bbox.height, 1) * 0.9;
		const tx = (svgWidth - bbox.width * scale) / 2 - bbox.x * scale;
		const ty = (svgHeight - bbox.height * scale) / 2 - bbox.y * scale;
		
		select(svgEl).call(zoomBehavior.transform, zoomIdentity.translate(tx, ty).scale(scale));
	}

	function zoomIn() {
		if (!svgElement || !zoomBehavior) return;
		const svg = select(svgElement);
		svg.transition().duration(300).call(zoomBehavior.scaleBy, 1.3);
	}

	function zoomOut() {
		if (!svgElement || !zoomBehavior) return;
		const svg = select(svgElement);
		svg.transition().duration(300).call(zoomBehavior.scaleBy, 0.7);
	}

	function zoomReset() {
		if (!svgElement || !zoomBehavior) return;
		const svg = select(svgElement);
		const g = svgElement.querySelector('g');
		if (!g) return;

		const bbox = (g as SVGGElement).getBBox();
		const svgWidth = svgElement.clientWidth || 800;
		const svgHeight = svgElement.clientHeight || 600;

		const scale = Math.min(svgWidth / bbox.width, svgHeight / bbox.height, 1) * 0.9;
		const tx = (svgWidth - bbox.width * scale) / 2 - bbox.x * scale;
		const ty = (svgHeight - bbox.height * scale) / 2 - bbox.y * scale;
		
		svg.transition().duration(500).call(zoomBehavior.transform, zoomIdentity.translate(tx, ty).scale(scale));
	}

	function getLayerColor(layer: string): string {
		return LAYER_COLORS[layer as keyof typeof LAYER_COLORS] || LAYER_COLORS.other;
	}

	function isDependencyViolation(fromLayer: string, toLayer: string): boolean {
		const allowed = ALLOWED_DEPS[fromLayer as keyof typeof ALLOWED_DEPS] || [];
		return !allowed.includes(toLayer as keyof typeof ALLOWED_DEPS);
	}

	function getBrowseLink(relativePath: string): string {
		return `/browse?path=${encodeURIComponent(relativePath)}`;
	}
</script>

<div class="p-6 space-y-4">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-foreground">Architecture Visualization</h1>
			<p class="text-sm text-muted-foreground mt-1">
				{result ? `${result.stats.totalFiles} files · ${result.stats.totalImports} imports` : 'Loading...'}
			</p>
		</div>
		<div class="flex gap-2 items-center">
			<div class="flex gap-1 bg-card border border-border rounded-lg p-1">
				<button onclick={zoomOut} class="px-2 py-1 rounded text-sm hover:bg-muted transition-colors" title="Zoom out">−</button>
				<span class="px-2 py-1 text-xs text-muted-foreground min-w-[3rem] text-center">{(zoomLevel * 100).toFixed(0)}%</span>
				<button onclick={zoomIn} class="px-2 py-1 rounded text-sm hover:bg-muted transition-colors" title="Zoom in">+</button>
				<button onclick={zoomReset} class="px-2 py-1 rounded text-sm hover:bg-muted transition-colors" title="Reset">⟲</button>
			</div>
			<button onclick={() => showLegend = !showLegend} class="px-3 py-1.5 rounded-lg bg-card border border-border text-sm hover:bg-muted transition-colors">
				{showLegend ? 'Hide legend' : 'Show legend'}
			</button>
			<button onclick={load} class="px-3 py-1.5 rounded-lg bg-card border border-border text-sm hover:bg-muted transition-colors">
				Refresh
			</button>
		</div>
	</div>

	{#if loading && !result}
		<div class="flex items-center justify-center h-64 text-muted-foreground">Analyzing imports...</div>
	{:else if result}
		<!-- Module overview graph -->
		<div class="bg-card border border-border rounded-xl overflow-hidden">
			<div id="mermaid-container" class="w-full h-[500px] cursor-grab active:cursor-grabbing"></div>
		</div>

		{#if showLegend}
			<div class="bg-card border border-border rounded-xl p-4">
				<h2 class="text-sm font-semibold text-foreground mb-3">Legend — Architecture Layers</h2>
				<div class="flex flex-wrap gap-4">
					{#each Object.entries(LAYER_COLORS) as [layer, color]}
						{#if layer !== 'other'}
							<div class="flex items-center gap-2">
								<div class="w-4 h-4 rounded" style="background: {color}33; border: 2px solid {color}"></div>
								<span class="text-xs text-foreground capitalize">{layer}</span>
							</div>
						{/if}
					{/each}
				</div>
				<p class="text-xs text-muted-foreground mt-2">Tip: Scroll to zoom, drag to pan</p>
			</div>
		{/if}

		<!-- Layer dependency matrix + Circular dependencies -->
		<div class="grid grid-cols-2 gap-4">
			<!-- Layer dependency matrix -->
			<div class="bg-card border border-border rounded-xl p-4">
				<h2 class="text-sm font-semibold text-foreground mb-3">Layer Dependency Matrix</h2>
				<p class="text-xs text-muted-foreground mb-3">Rows can depend on columns (✓ allowed, ✗ violation)</p>
				<div class="overflow-x-auto">
					<table class="text-xs">
						<thead>
							<tr>
								<th class="p-1 text-left text-muted-foreground"></th>
								{#each LAYER_ORDER as layer}
									<th class="p-1 text-center capitalize" style="color: {getLayerColor(layer)}">{layer.slice(0, 4)}</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each LAYER_ORDER as fromLayer}
								<tr>
									<td class="p-1 font-medium capitalize" style="color: {getLayerColor(fromLayer)}">{fromLayer.slice(0, 4)}</td>
									{#each LAYER_ORDER as toLayer}
										{#if fromLayer === toLayer}
											<td class="p-1 text-center text-muted-foreground">—</td>
										{:else if isDependencyViolation(fromLayer, toLayer)}
											<td class="p-1 text-center text-accent-red">✗</td>
										{:else}
											<td class="p-1 text-center text-accent-green">✓</td>
										{/if}
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>

			<!-- Circular dependencies -->
			<div class="bg-card border border-border rounded-xl p-4">
				<h2 class="text-sm font-semibold text-foreground mb-3">
					Circular Dependencies
					{#if result.circularDeps.length > 0}
						<span class="text-accent-red ml-2">({result.circularDeps.length})</span>
					{:else}
						<span class="text-accent-green ml-2">✓ None</span>
					{/if}
				</h2>
				{#if result.circularDeps.length > 0}
					<div class="space-y-3 max-h-60 overflow-auto">
						{#each result.circularDeps as cycle, i}
							<div class="border border-accent-red/30 rounded-lg p-2">
								<div class="text-xs text-accent-red font-medium mb-1">Cycle #{i + 1}</div>
								<div class="flex flex-wrap gap-1">
									{#each cycle as file, j}
										<a href={getBrowseLink(file)} class="text-xs font-mono text-foreground hover:text-accent-blue underline">
											{file.replace('src/', '').replace('.ts', '')}
										</a>
										{#if j < cycle.length - 1}
											<span class="text-xs text-muted-foreground">→</span>
										{/if}
									{/each}
									<span class="text-xs text-muted-foreground">→ {cycle[0].replace('src/', '').replace('.ts', '')}</span>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">No circular dependencies detected. Architecture is clean.</p>
				{/if}
			</div>
		</div>

		<!-- Layers + Hot Modules -->
		<div class="grid grid-cols-2 gap-4">
			<div class="bg-card border border-border rounded-xl p-4">
				<h2 class="text-sm font-semibold text-foreground mb-3">Layers</h2>
				<div class="space-y-2">
					{#each result.layers as layer}
						<div class="flex items-center justify-between">
							<span class="text-sm text-foreground capitalize">{layer.name}</span>
							<span class="text-xs font-mono" style="color: {getLayerColor(layer.name)}">{layer.files.length} files</span>
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
						<a href={getBrowseLink(mod.path)} class="flex items-center justify-between hover:bg-muted/50 rounded px-1 py-0.5 transition-colors">
							<span class="text-xs text-foreground font-mono truncate">{mod.path.replace('src/', '')}</span>
							<span class="text-xs text-accent-yellow shrink-0 ml-2">{mod.changes} changes</span>
						</a>
					{/each}
				</div>
			</div>
		</div>

		<!-- All Source Files -->
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
							<th class="text-right py-1">Reverse Deps</th>
						</tr>
					</thead>
					<tbody>
						{#each result.files as file}
							<tr class="border-t border-border/50 hover:bg-muted/50">
								<td class="py-1">
									<a href={getBrowseLink(file.relativePath)} class="font-mono text-foreground hover:text-accent-blue underline">
										{file.relativePath}
									</a>
								</td>
								<td class="py-1 capitalize" style="color: {getLayerColor(file.layer)}">{file.layer}</td>
								<td class="py-1 text-right text-muted-foreground">{file.lineCount}</td>
								<td class="py-1 text-right text-muted-foreground">{file.imports.length}</td>
								<td class="py-1 text-right">
									{#if result.reverseDeps[file.relativePath] > 0}
										<span class="text-accent-blue">{result.reverseDeps[file.relativePath]}</span>
									{:else}
										<span class="text-muted-foreground">0</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>

<style>
	#mermaid-container :global(svg) {
		width: 100%;
		height: 100%;
	}
</style>
