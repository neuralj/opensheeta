<script lang="ts">
	import { onMount } from 'svelte';

	interface MemoryEntry {
		id: string;
		category: string;
		title: string;
		context: string;
		decision: string;
		rationale: string;
		alternatives: string;
		created_at: number;
		author: string;
		tags: string;
		superseded_by: string | null;
	}

	let entries: MemoryEntry[] = $state([]);
	let loading: boolean = $state(true);
	let selectedCategory: string = $state('');
	let searchQuery: string = $state('');
	let showCreate: boolean = $state(false);

	const categories = [
		{ value: '', label: 'All' },
		{ value: 'business', label: 'Business' },
		{ value: 'technical', label: 'Technical' },
		{ value: 'architecture', label: 'Architecture' },
		{ value: 'security', label: 'Security' },
		{ value: 'performance', label: 'Performance' },
		{ value: 'incident', label: 'Incident' },
		{ value: 'lesson', label: 'Lesson' },
	];

	let newEntry = $state({
		category: 'technical',
		title: '',
		context: '',
		decision: '',
		rationale: '',
		alternatives: '',
		author: 'human',
		tags: '',
	});

	async function load() {
		loading = true;
		try {
			const params = new URLSearchParams();
			if (selectedCategory) params.set('category', selectedCategory);
			if (searchQuery) params.set('q', searchQuery);
			const res = await fetch(`/api/memory?${params}`);
			const data = await res.json();
			entries = data.entries;
		} catch (e) {
			console.error(e);
		} finally {
			loading = false;
		}
	}

	async function create() {
		try {
			await fetch('/api/memory', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(newEntry),
			});
			showCreate = false;
			newEntry = { category: 'technical', title: '', context: '', decision: '', rationale: '', alternatives: '', author: 'human', tags: '' };
			load();
		} catch (e) {
			console.error(e);
		}
	}

	function categoryColor(cat: string): string {
		switch (cat) {
			case 'business': return 'bg-accent-blue/20 text-accent-blue';
			case 'technical': return 'bg-accent-purple/20 text-accent-purple';
			case 'architecture': return 'bg-accent-teal/20 text-accent-teal';
			case 'security': return 'bg-accent-red/20 text-accent-red';
			case 'performance': return 'bg-accent-yellow/20 text-accent-yellow';
			case 'incident': return 'bg-accent-red/20 text-accent-red';
			case 'lesson': return 'bg-accent-green/20 text-accent-green';
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

	onMount(load);
</script>

<div class="p-6 space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-foreground">Repo Memory</h1>
			<p class="text-sm text-muted-foreground mt-1">{entries.length} decisions recorded</p>
		</div>
		<button onclick={() => (showCreate = !showCreate)} class="px-3 py-1.5 rounded-lg bg-accent-blue text-white text-sm hover:opacity-90 transition-opacity">
			{showCreate ? 'Cancel' : '+ New Decision'}
		</button>
	</div>

	{#if showCreate}
		<div class="bg-card border border-border rounded-xl p-4 space-y-3">
			<h2 class="text-sm font-semibold text-foreground">Record New Decision</h2>
			<div class="grid grid-cols-2 gap-3">
				<div>
					<label for="mem-category" class="text-xs text-muted-foreground">Category</label>
					<select id="mem-category" bind:value={newEntry.category} class="w-full mt-1 px-3 py-1.5 rounded-lg bg-muted border border-border text-sm text-foreground">
						{#each categories.filter((c) => c.value) as cat}
							<option value={cat.value}>{cat.label}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="mem-author" class="text-xs text-muted-foreground">Author</label>
					<input id="mem-author" bind:value={newEntry.author} class="w-full mt-1 px-3 py-1.5 rounded-lg bg-muted border border-border text-sm text-foreground" />
				</div>
			</div>
			<div>
				<label for="mem-title" class="text-xs text-muted-foreground">Title</label>
				<input id="mem-title" bind:value={newEntry.title} class="w-full mt-1 px-3 py-1.5 rounded-lg bg-muted border border-border text-sm text-foreground" placeholder="What was decided?" />
			</div>
			<div>
				<label for="mem-context" class="text-xs text-muted-foreground">Context</label>
				<textarea id="mem-context" bind:value={newEntry.context} rows="2" class="w-full mt-1 px-3 py-1.5 rounded-lg bg-muted border border-border text-sm text-foreground" placeholder="What was the situation?"></textarea>
			</div>
			<div>
				<label for="mem-decision" class="text-xs text-muted-foreground">Decision</label>
				<textarea id="mem-decision" bind:value={newEntry.decision} rows="2" class="w-full mt-1 px-3 py-1.5 rounded-lg bg-muted border border-border text-sm text-foreground" placeholder="What was decided?"></textarea>
			</div>
			<div>
				<label for="mem-rationale" class="text-xs text-muted-foreground">Rationale</label>
				<textarea id="mem-rationale" bind:value={newEntry.rationale} rows="2" class="w-full mt-1 px-3 py-1.5 rounded-lg bg-muted border border-border text-sm text-foreground" placeholder="Why?"></textarea>
			</div>
			<div>
				<label for="mem-alternatives" class="text-xs text-muted-foreground">Alternatives Considered</label>
				<textarea id="mem-alternatives" bind:value={newEntry.alternatives} rows="2" class="w-full mt-1 px-3 py-1.5 rounded-lg bg-muted border border-border text-sm text-foreground" placeholder="What else was considered?"></textarea>
			</div>
			<div>
				<label for="mem-tags" class="text-xs text-muted-foreground">Tags (comma-separated)</label>
				<input id="mem-tags" bind:value={newEntry.tags} class="w-full mt-1 px-3 py-1.5 rounded-lg bg-muted border border-border text-sm text-foreground" placeholder="database, performance, ..." />
			</div>
			<button onclick={create} class="px-4 py-2 rounded-lg bg-accent-blue text-white text-sm hover:opacity-90">Save Decision</button>
		</div>
	{/if}

	<!-- Filters -->
	<div class="flex gap-3">
		<div class="flex gap-1">
			{#each categories as cat}
				<button
					onclick={() => { selectedCategory = cat.value; load(); }}
					class="px-3 py-1 rounded-lg text-xs transition-colors {selectedCategory === cat.value ? 'bg-accent-blue text-white' : 'bg-card border border-border text-muted-foreground hover:bg-muted'}"
				>
					{cat.label}
				</button>
			{/each}
		</div>
		<input
			bind:value={searchQuery}
			onkeydown={(e) => e.key === 'Enter' && load()}
			placeholder="Search..."
			class="px-3 py-1 rounded-lg bg-card border border-border text-sm text-foreground flex-1 max-w-xs"
		/>
	</div>

	{#if loading}
		<div class="flex items-center justify-center h-32 text-muted-foreground">Loading...</div>
	{:else if entries.length === 0}
		<div class="flex flex-col items-center justify-center h-64 text-muted-foreground">
			<span class="text-4xl mb-3">◈</span>
			<p>No decisions recorded yet</p>
			<p class="text-xs mt-1">Click "+ New Decision" to start building repo memory</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each entries as entry}
				<div class="bg-card border border-border rounded-xl p-4">
					<div class="flex items-start justify-between mb-2">
						<div class="flex items-center gap-2">
							<span class="px-2 py-0.5 rounded-full text-xs {categoryColor(entry.category)}">{entry.category}</span>
							<h3 class="text-sm font-semibold text-foreground">{entry.title}</h3>
						</div>
						<span class="text-xs text-muted-foreground">{timeAgo(entry.created_at)}</span>
					</div>
					{#if entry.context}
						<div class="text-xs text-muted-foreground mb-1"><span class="font-semibold">Context:</span> {entry.context}</div>
					{/if}
					{#if entry.decision}
						<div class="text-xs text-foreground mb-1"><span class="font-semibold text-accent-blue">Decision:</span> {entry.decision}</div>
					{/if}
					{#if entry.rationale}
						<div class="text-xs text-muted-foreground mb-1"><span class="font-semibold">Rationale:</span> {entry.rationale}</div>
					{/if}
					{#if entry.alternatives}
						<div class="text-xs text-muted-foreground"><span class="font-semibold">Alternatives:</span> {entry.alternatives}</div>
					{/if}
					{#if entry.tags}
						<div class="flex gap-1 mt-2">
							{#each entry.tags.split(',').filter((t) => t.trim()) as tag}
								<span class="px-1.5 py-0.5 rounded bg-muted text-xs text-muted-foreground">{tag.trim()}</span>
							{/each}
						</div>
					{/if}
					<div class="text-xs text-muted-foreground mt-2">by {entry.author}</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
