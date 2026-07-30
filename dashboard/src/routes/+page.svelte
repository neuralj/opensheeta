<script lang="ts">
	import { onMount } from 'svelte';

	interface RepoState {
		repo: { name: string; branch: string; totalCommits: number; lastCommit: { hash: string; message: string; date: string; author: string } };
		architecture: { totalFiles: number; totalImports: number; layerCounts: Record<string, number>; hotModules: { path: string; changes: number }[] };
		tasks: { pending: number; running: number; completed: number; failed: number };
		health: { score: number; typecheck: string; tests: string; build: string };
		recentDecisions: { id: string; title: string; category: string; created_at: number }[];
		timeline: { id: string; title: string; type: string; status: string; startedAt: number }[];
		conventions: Record<string, string>;
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

	function scoreColor(score: number): string {
		if (score >= 80) return 'text-accent-green';
		if (score >= 60) return 'text-accent-yellow';
		return 'text-accent-red';
	}

	function statusBadge(status: string): string {
		switch (status) {
			case 'pass': case 'completed': case 'merged': return 'bg-accent-green/20 text-accent-green';
			case 'warn': case 'running': return 'bg-accent-yellow/20 text-accent-yellow';
			case 'fail': case 'failed': return 'bg-accent-red/20 text-accent-red';
			default: return 'bg-muted text-muted-foreground';
		}
	}

	function timeAgo(ts: number): string {
		const diff = Date.now() - ts;
		if (diff < 60000) return 'just now';
		if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
		if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
		return `${Math.floor(diff / 86400000)}d ago`;
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
		<div class="grid grid-cols-5 gap-4">
			<div class="bg-card border border-border rounded-xl p-4">
				<div class="text-xs text-muted-foreground mb-1">Health</div>
				<div class="text-3xl font-bold {scoreColor(repoState.health.score)}">{repoState.health.score}</div>
			</div>
			<div class="bg-card border border-border rounded-xl p-4">
				<div class="text-xs text-muted-foreground mb-1">Tasks</div>
				<div class="text-3xl font-bold text-foreground">{repoState.tasks.pending + repoState.tasks.running}</div>
				<div class="text-xs text-muted-foreground">{repoState.tasks.pending} pending · {repoState.tasks.running} running</div>
			</div>
			<div class="bg-card border border-border rounded-xl p-4">
				<div class="text-xs text-muted-foreground mb-1">Tests</div>
				<div class="text-lg font-bold text-foreground">{repoState.health.tests}</div>
			</div>
			<div class="bg-card border border-border rounded-xl p-4">
				<div class="text-xs text-muted-foreground mb-1">Build</div>
				<div class="text-lg font-bold">
					<span class="px-2 py-0.5 rounded-full text-xs {repoState.health.build === 'pass' ? 'bg-accent-green/20 text-accent-green' : 'bg-accent-red/20 text-accent-red'}">
						{repoState.health.build}
					</span>
				</div>
			</div>
			<div class="bg-card border border-border rounded-xl p-4">
				<div class="text-xs text-muted-foreground mb-1">Files</div>
				<div class="text-3xl font-bold text-accent-blue">{repoState.architecture.totalFiles}</div>
				<div class="text-xs text-muted-foreground">{repoState.architecture.totalImports} imports</div>
			</div>
		</div>

		<!-- Architecture + Activity Row -->
		<div class="grid grid-cols-3 gap-4">
			<div class="col-span-2 bg-card border border-border rounded-xl p-4">
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

			<div class="bg-card border border-border rounded-xl p-4">
				<h2 class="text-sm font-semibold text-foreground mb-3">Recent Decisions</h2>
				{#if repoState.recentDecisions.length === 0}
					<p class="text-sm text-muted-foreground">No decisions recorded yet</p>
				{:else}
					<div class="space-y-2">
						{#each repoState.recentDecisions as decision}
							<div class="border-l-2 border-accent-blue/30 pl-3">
								<div class="text-sm text-foreground">{decision.title}</div>
								<div class="text-xs text-muted-foreground">{decision.category} · {timeAgo(decision.created_at)}</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- Timeline + Conventions Row -->
		<div class="grid grid-cols-3 gap-4">
			<div class="col-span-2 bg-card border border-border rounded-xl p-4">
				<h2 class="text-sm font-semibold text-foreground mb-3">Recent Activity</h2>
				<div class="space-y-2">
					{#each repoState.timeline as entry}
						<div class="flex items-center gap-3 text-sm">
							<span class="px-1.5 py-0.5 rounded text-xs {statusBadge(entry.status)}">{entry.type}</span>
							<span class="text-foreground truncate flex-1">{entry.title}</span>
							<span class="text-xs text-muted-foreground shrink-0">{timeAgo(entry.startedAt)}</span>
						</div>
					{/each}
				</div>
			</div>

			<div class="bg-card border border-border rounded-xl p-4">
				<h2 class="text-sm font-semibold text-foreground mb-3">Conventions</h2>
				<div class="space-y-2">
					{#each Object.entries(repoState.conventions) as [key, value]}
						<div class="flex justify-between text-xs">
							<span class="text-muted-foreground">{key.replace(/_/g, ' ')}</span>
							<span class="text-foreground font-mono">{value}</span>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Context Snapshot Preview -->
		<div class="bg-card border border-border rounded-xl p-4">
			<div class="flex items-center justify-between mb-3">
				<h2 class="text-sm font-semibold text-foreground">Context Snapshot</h2>
				<a href="/api/context" target="_blank" class="px-3 py-1 rounded-lg bg-muted text-xs hover:bg-accent transition-colors">
					GET /api/context
				</a>
			</div>
			<p class="text-xs text-muted-foreground">
				Agent entry point. One GET request returns the complete repository context: architecture, health, decisions, conventions, and current repoState.
			</p>
		</div>
	{/if}
</div>
