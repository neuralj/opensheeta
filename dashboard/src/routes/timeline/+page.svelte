<script lang="ts">
	import { onMount } from 'svelte';

	interface TimelineEntry {
		id: string;
		type: 'task' | 'commit';
		title: string;
		status: string;
		startedAt: number;
		finishedAt: number | null;
		durationMs: number;
		author: string;
		detail: string;
		filesChanged?: string[];
	}

	let entries: TimelineEntry[] = $state([]);
	let loading: boolean = $state(true);
	let filter: 'all' | 'task' | 'commit' = $state('all');

	async function load() {
		loading = true;
		try {
			const res = await fetch('/api/timeline?limit=100');
			const data = await res.json();
			entries = data.entries;
		} catch (e) {
			console.error(e);
		} finally {
			loading = false;
		}
	}

	function statusColor(status: string): string {
		switch (status) {
			case 'completed': case 'merged': return 'text-accent-green';
			case 'running': return 'text-accent-blue';
			case 'failed': return 'text-accent-red';
			default: return 'text-muted-foreground';
		}
	}

	function statusBg(status: string): string {
		switch (status) {
			case 'completed': case 'merged': return 'bg-accent-green/20';
			case 'running': return 'bg-accent-blue/20';
			case 'failed': return 'bg-accent-red/20';
			default: return 'bg-muted';
		}
	}

	function typeIcon(type: string): string {
		return type === 'task' ? '◆' : '●';
	}

	function typeColor(type: string): string {
		return type === 'task' ? 'text-accent-purple' : 'text-accent-blue';
	}

	function formatDuration(ms: number): string {
		if (ms < 1000) return '<1s';
		if (ms < 60000) return `${Math.round(ms / 1000)}s`;
		return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
	}

	function timeAgo(ts: number): string {
		const diff = Date.now() - ts;
		if (diff < 60000) return 'just now';
		if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
		if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
		return `${Math.floor(diff / 86400000)}d ago`;
	}

	let filtered = $derived(
		filter === 'all' ? entries : entries.filter((e) => e.type === filter)
	);

	onMount(load);
</script>

<div class="p-6 space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-foreground">Execution Timeline</h1>
			<p class="text-sm text-muted-foreground mt-1">{entries.length} events recorded</p>
		</div>
		<button onclick={load} class="px-3 py-1.5 rounded-lg bg-card border border-border text-sm hover:bg-muted transition-colors">
			Refresh
		</button>
	</div>

	<div class="flex gap-1">
		<button onclick={() => (filter = 'all')} class="px-3 py-1 rounded-lg text-xs transition-colors {filter === 'all' ? 'bg-accent-blue text-white' : 'bg-card border border-border text-muted-foreground hover:bg-muted'}">All</button>
		<button onclick={() => (filter = 'task')} class="px-3 py-1 rounded-lg text-xs transition-colors {filter === 'task' ? 'bg-accent-purple text-white' : 'bg-card border border-border text-muted-foreground hover:bg-muted'}">Tasks</button>
		<button onclick={() => (filter = 'commit')} class="px-3 py-1 rounded-lg text-xs transition-colors {filter === 'commit' ? 'bg-accent-blue text-white' : 'bg-card border border-border text-muted-foreground hover:bg-muted'}">Commits</button>
	</div>

	{#if loading}
		<div class="flex items-center justify-center h-64 text-muted-foreground">Loading timeline...</div>
	{:else if filtered.length === 0}
		<div class="flex flex-col items-center justify-center h-64 text-muted-foreground">
			<span class="text-4xl mb-3">⟳</span>
			<p>No timeline entries yet</p>
		</div>
	{:else}
		<div class="relative">
			<div class="absolute left-6 top-0 bottom-0 w-px bg-border"></div>
			<div class="space-y-4">
				{#each filtered as entry}
					<div class="relative flex gap-4 pl-2">
						<div class="relative z-10 flex items-center justify-center w-8 h-8 rounded-full {statusBg(entry.status)} shrink-0">
							<span class="text-xs {typeColor(entry.type)}">{typeIcon(entry.type)}</span>
						</div>
						<div class="flex-1 bg-card border border-border rounded-xl p-3">
							<div class="flex items-center justify-between mb-1">
								<div class="flex items-center gap-2">
									<span class="px-1.5 py-0.5 rounded text-xs {statusBg(entry.status)} {statusColor(entry.status)}">{entry.status}</span>
									<span class="text-sm text-foreground font-medium">{entry.title}</span>
								</div>
								<span class="text-xs text-muted-foreground">{timeAgo(entry.startedAt)}</span>
							</div>
							{#if entry.detail && entry.detail !== entry.title}
								<p class="text-xs text-muted-foreground mt-1">{entry.detail}</p>
							{/if}
							<div class="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
								<span>{entry.author}</span>
								{#if entry.durationMs > 0}
									<span>{formatDuration(entry.durationMs)}</span>
								{/if}
								{#if entry.filesChanged && entry.filesChanged.length > 0}
									<span>{entry.filesChanged.length} files changed</span>
								{/if}
							</div>
							{#if entry.filesChanged && entry.filesChanged.length > 0}
								<div class="flex flex-wrap gap-1 mt-2">
									{#each entry.filesChanged.slice(0, 5) as file}
										<span class="px-1.5 py-0.5 rounded bg-muted text-xs text-muted-foreground font-mono">{file}</span>
									{/each}
									{#if entry.filesChanged.length > 5}
										<span class="px-1.5 py-0.5 text-xs text-muted-foreground">+{entry.filesChanged.length - 5} more</span>
									{/if}
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
