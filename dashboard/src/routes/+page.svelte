<script lang="ts">
	import { onMount } from 'svelte';

	interface RepoState {
		repo: { name: string; branch: string; totalCommits: number; lastCommit: { hash: string; message: string; date: string; author: string } };
		architecture: { totalFiles: number; totalImports: number; layerCounts: Record<string, number>; hotModules: { path: string; changes: number }[] };
		ci: { latestStatus: 'passing' | 'failing' | 'pending' | 'unknown'; totalRuns: number };
	}

	let repoState: RepoState | null = $state(null);
	let loading: boolean = $state(true);
	let error: string = $state('');

	async function loadState() {
		loading = true;
		error = '';
		try {
			const res = await fetch('/api/state');
			repoState = await res.json();
		} catch (e) {
			error = String(e);
		} finally {
			loading = false;
		}
	}

	function ciStatusColor(status: string): string {
		switch (status) {
			case 'passing': return 'text-accent-green';
			case 'failing': return 'text-accent-red';
			case 'pending': return 'text-accent-blue';
			default: return 'text-muted-foreground';
		}
	}

	function ciStatusIcon(status: string): string {
		switch (status) {
			case 'passing': return '✓';
			case 'failing': return '✗';
			case 'pending': return '◉';
			default: return '?';
		}
	}

	onMount(loadState);
</script>

<div class="p-6 space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-foreground">Repository State</h1>
			<p class="text-sm text-muted-foreground mt-1">
				{repoState ? `${repoState.repo.branch} · ${repoState.repo.totalCommits} commits · last: ${repoState.repo.lastCommit.message.slice(0, 60)}` : 'Loading...'}
			</p>
		</div>
		<button onclick={loadState} class="px-3 py-1.5 rounded-lg bg-card border border-border text-sm hover:bg-muted transition-colors">
			Refresh
		</button>
	</div>

	{#if loading && !repoState}
		<div class="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>
	{:else if error}
		<div class="flex items-center justify-center h-64 text-accent-red">{error}</div>
	{:else if repoState}
		<!-- Stats Row -->
		<div class="grid grid-cols-4 gap-4">
			<div class="bg-card border border-border rounded-xl p-4">
				<div class="text-xs text-muted-foreground mb-1">CI</div>
				<div class="text-3xl font-bold {ciStatusColor(repoState.ci.latestStatus)}">{ciStatusIcon(repoState.ci.latestStatus)}</div>
				<div class="text-xs text-muted-foreground">{repoState.ci.latestStatus}</div>
			</div>
			<div class="bg-card border border-border rounded-xl p-4">
				<div class="text-xs text-muted-foreground mb-1">Commits</div>
				<div class="text-3xl font-bold text-foreground">{repoState.repo.totalCommits}</div>
				<div class="text-xs text-muted-foreground">on {repoState.repo.branch}</div>
			</div>
			<div class="bg-card border border-border rounded-xl p-4">
				<div class="text-xs text-muted-foreground mb-1">Files</div>
				<div class="text-3xl font-bold text-accent-blue">{repoState.architecture.totalFiles}</div>
				<div class="text-xs text-muted-foreground">{repoState.architecture.totalImports} imports</div>
			</div>
			<div class="bg-card border border-border rounded-xl p-4">
				<div class="text-xs text-muted-foreground mb-1">Layers</div>
				<div class="text-3xl font-bold text-accent-purple">{Object.keys(repoState.architecture.layerCounts).length}</div>
				<div class="text-xs text-muted-foreground">architecture</div>
			</div>
		</div>

		<!-- Architecture + Activity Row -->
		<div class="bg-card border border-border rounded-xl p-4">
			<h2 class="text-sm font-semibold text-foreground mb-3">Architecture Layers</h2>
			<div class="grid grid-cols-4 gap-3">
				{#each Object.entries(repoState.architecture.layerCounts) as [layer, count]}
					<div class="bg-muted/50 rounded-lg p-3 text-center">
						<div class="text-lg font-bold text-accent-purple">{count}</div>
						<div class="text-xs text-muted-foreground capitalize">{layer}</div>
					</div>
				{/each}
			</div>
			<div class="mt-3">
				<div class="text-xs text-muted-foreground mb-2">Hot Modules</div>
				<div class="flex flex-wrap gap-2">
					{#each repoState.architecture.hotModules as mod}
						<span class="px-2 py-1 rounded-md bg-accent-yellow/10 text-accent-yellow text-xs">
							{mod.path.replace('src/', '')} ({mod.changes})
						</span>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</div>
