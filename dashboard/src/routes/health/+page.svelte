<script lang="ts">
	import { onMount } from 'svelte';

	interface HealthDimension {
		name: string;
		score: number;
		status: 'pass' | 'warn' | 'fail';
		detail: string;
	}

	interface HealthResult {
		score: number;
		dimensions: HealthDimension[];
		details: {
			typecheck: { pass: boolean; errors: number; output: string };
			tests: { pass: boolean; total: number; passed: number; failed: number; output: string };
			build: { pass: boolean; output: string };
			dependencies: { total: number; devTotal: number };
			complexity: { avgLines: number; maxLines: number; filesOver300: number; totalFiles: number };
		};
	}

	let result: HealthResult | null = $state(null);
	let loading: boolean = $state(true);
	let expandedDim: string | null = $state(null);

	async function load() {
		loading = true;
		try {
			const res = await fetch('/api/health');
			result = await res.json();
		} catch (e) {
			console.error(e);
		} finally {
			loading = false;
		}
	}

	function scoreColor(score: number): string {
		if (score >= 80) return 'text-accent-green';
		if (score >= 60) return 'text-accent-yellow';
		return 'text-accent-red';
	}

	function strokeColor(score: number): string {
		if (score >= 80) return '#a6e3a1';
		if (score >= 60) return '#f9e2af';
		return '#f38ba8';
	}

	function statusDot(status: string): string {
		switch (status) {
			case 'pass': return 'bg-accent-green';
			case 'warn': return 'bg-accent-yellow';
			case 'fail': return 'bg-accent-red';
			default: return 'bg-muted-foreground';
		}
	}

	function getOutputForDim(name: string): string {
		if (!result) return '';
		switch (name) {
			case 'Type Safety': return result.details.typecheck.output;
			case 'Tests': return result.details.tests.output;
			case 'Build': return result.details.build.output;
			default: return '';
		}
	}

	const circumference = 2 * Math.PI * 54;

	onMount(load);
</script>

<div class="p-6 space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-foreground">Repository Health</h1>
			<p class="text-sm text-muted-foreground mt-1">Continuous analysis of code quality</p>
		</div>
		<button onclick={load} class="px-3 py-1.5 rounded-lg bg-card border border-border text-sm hover:bg-muted transition-colors">
			Re-analyze
		</button>
	</div>

	{#if loading && !result}
		<div class="flex items-center justify-center h-64 text-muted-foreground">Analyzing repository health...</div>
	{:else if result}
		<!-- Score Overview -->
		<div class="flex items-center gap-8">
			<div class="relative w-36 h-36 shrink-0">
				<svg class="w-full h-full -rotate-90" viewBox="0 0 120 120">
					<circle cx="60" cy="60" r="54" fill="none" stroke="var(--muted)" stroke-width="8" />
					<circle
						cx="60" cy="60" r="54" fill="none"
						stroke={strokeColor(result.score)}
						stroke-width="8"
						stroke-linecap="round"
						stroke-dasharray="{circumference}"
						stroke-dashoffset="{circumference - (result.score / 100) * circumference}"
					/>
				</svg>
				<div class="absolute inset-0 flex flex-col items-center justify-center">
					<span class="text-3xl font-bold {scoreColor(result.score)}">{result.score}</span>
					<span class="text-xs text-muted-foreground">/ 100</span>
				</div>
			</div>
			<div class="grid grid-cols-3 gap-4 flex-1">
				{#each result.dimensions.slice(0, 6) as dim}
					<div class="bg-card border border-border rounded-xl p-3">
						<div class="flex items-center gap-2 mb-1">
							<span class="w-2 h-2 rounded-full {statusDot(dim.status)}"></span>
							<span class="text-xs text-muted-foreground">{dim.name}</span>
						</div>
						<div class="text-lg font-bold {scoreColor(dim.score)}">{dim.score}</div>
						<div class="text-xs text-muted-foreground truncate">{dim.detail}</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Detailed Dimensions -->
		<div class="space-y-2">
			{#each result.dimensions as dim}
				<div class="bg-card border border-border rounded-xl overflow-hidden">
					<button
						onclick={() => (expandedDim = expandedDim === dim.name ? null : dim.name)}
						class="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
					>
						<div class="flex items-center gap-3">
							<span class="w-3 h-3 rounded-full {statusDot(dim.status)}"></span>
							<span class="text-sm font-medium text-foreground">{dim.name}</span>
							<span class="text-xs text-muted-foreground">{dim.detail}</span>
						</div>
						<div class="flex items-center gap-3">
							<div class="w-24 bg-muted rounded-full h-1.5">
								<div class="h-1.5 rounded-full {dim.score >= 80 ? 'bg-accent-green' : dim.score >= 60 ? 'bg-accent-yellow' : 'bg-accent-red'}" style="width: {dim.score}%"></div>
							</div>
							<span class="text-sm font-bold {scoreColor(dim.score)} w-8 text-right">{dim.score}</span>
							<span class="text-xs text-muted-foreground">{expandedDim === dim.name ? '▲' : '▼'}</span>
						</div>
					</button>
					{#if expandedDim === dim.name}
						<div class="px-4 pb-4 border-t border-border">
							{#if getOutputForDim(dim.name)}
								<pre class="mt-3 p-3 rounded-lg bg-muted text-xs text-muted-foreground overflow-auto max-h-64">{getOutputForDim(dim.name)}</pre>
							{:else}
								<p class="mt-3 text-xs text-muted-foreground">{dim.detail}</p>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Code Stats -->
		<div class="bg-card border border-border rounded-xl p-4">
			<h2 class="text-sm font-semibold text-foreground mb-3">Code Statistics</h2>
			<div class="grid grid-cols-4 gap-4">
				<div>
					<div class="text-xs text-muted-foreground">Total Files</div>
					<div class="text-lg font-bold text-foreground">{result.details.complexity.totalFiles}</div>
				</div>
				<div>
					<div class="text-xs text-muted-foreground">Avg Lines/File</div>
					<div class="text-lg font-bold text-foreground">{result.details.complexity.avgLines}</div>
				</div>
				<div>
					<div class="text-xs text-muted-foreground">Max Lines</div>
					<div class="text-lg font-bold text-foreground">{result.details.complexity.maxLines}</div>
				</div>
				<div>
					<div class="text-xs text-muted-foreground">Files > 300 lines</div>
					<div class="text-lg font-bold {result.details.complexity.filesOver300 > 0 ? 'text-accent-yellow' : 'text-accent-green'}">{result.details.complexity.filesOver300}</div>
				</div>
			</div>
		</div>
	{/if}
</div>
