<script lang="ts">
	import FileTree from './FileTree.svelte';

	let { path = '', onSelect = () => {} }: { path?: string; onSelect?: (path: string) => void } = $props();

	interface FileItem {
		name: string;
		path: string;
		isDirectory: boolean;
		size: number;
	}

	let items = $state<FileItem[]>([]);
	let expanded = $state<Record<string, boolean>>({});
	let childItems = $state<Record<string, FileItem[]>>({});

	async function loadDir(dirPath: string) {
		const res = await fetch(`/api/files?path=${encodeURIComponent(dirPath)}`);
		const data = await res.json();
		return data.items || [];
	}

	async function toggleDir(item: FileItem) {
		if (expanded[item.path]) {
			expanded[item.path] = false;
			return;
		}
		expanded[item.path] = true;
		if (!childItems[item.path]) {
			childItems[item.path] = await loadDir(item.path);
		}
	}

	$effect(() => {
		loadDir(path).then((i) => (items = i));
	});

	function formatSize(bytes: number): string {
		if (bytes === 0) return '—';
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function getIcon(name: string, isDir: boolean): string {
		if (isDir) return '📁';
		if (name.endsWith('.md')) return '📝';
		if (name.endsWith('.yml') || name.endsWith('.yaml')) return '📋';
		if (name === 'Dockerfile') return '🐳';
		if (name.endsWith('.ts') || name.endsWith('.js')) return '📜';
		if (name.endsWith('.sh')) return '⚡';
		if (name.endsWith('.conf')) return '🔧';
		return '📄';
	}
</script>

<div class="text-sm">
	{#each items as item}
		<div>
			<button
				class="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-sidebar-accent rounded transition-colors text-left"
				onclick={() => (item.isDirectory ? toggleDir(item) : onSelect(item.path))}
			>
				{#if item.isDirectory}
					<span class="text-xs text-muted-foreground w-4">{expanded[item.path] ? '▾' : '▸'}</span>
				{:else}
					<span class="w-4"></span>
				{/if}
				<span>{getIcon(item.name, item.isDirectory)}</span>
				<span class="flex-1 truncate">{item.name}</span>
				{#if !item.isDirectory}
					<span class="text-xs text-muted-foreground">{formatSize(item.size)}</span>
				{/if}
			</button>
			{#if item.isDirectory && expanded[item.path] && childItems[item.path]}
				<div class="ml-4 border-l border-sidebar-border/50">
					<FileTree path={item.path} {onSelect} />
				</div>
			{/if}
		</div>
	{/each}
</div>
