<script lang="ts">
	import { page } from '$app/state';
	import FileTree from '$lib/components/FileTree.svelte';
	import CodeViewer from '$lib/components/CodeViewer.svelte';
	import MarkdownView from '$lib/components/MarkdownView.svelte';

	let selectedFile = $state('');
	let fileContent = $state('');
	let fileLanguage = $state('text');
	let loading = $state(false);
	let error = $state('');

	function getLanguage(filename: string): string {
		const ext = filename.split('.').pop()?.toLowerCase() || '';
		const map: Record<string, string> = {
			ts: 'typescript',
			tsx: 'tsx',
			js: 'javascript',
			jsx: 'jsx',
			json: 'json',
			yml: 'yaml',
			yaml: 'yaml',
			md: 'markdown',
			sh: 'bash',
			bash: 'bash',
			py: 'python',
			go: 'go',
			rs: 'rust',
			html: 'html',
			css: 'css',
			scss: 'scss',
			svelte: 'svelte',
			toml: 'toml',
			xml: 'xml',
			sql: 'sql',
			dockerfile: 'dockerfile',
			conf: 'nginx',
			caddyfile: 'nginx',
			plist: 'xml',
		};
		if (filename.toLowerCase() === 'dockerfile') return 'dockerfile';
		if (filename.toLowerCase() === 'caddyfile') return 'nginx';
		return map[ext] || 'text';
	}

	async function selectFile(path: string) {
		selectedFile = path;
		loading = true;
		error = '';
		try {
			const res = await fetch(`/api/files?action=content&path=${encodeURIComponent(path)}`);
			if (!res.ok) {
				throw new Error(`Failed to load file: ${res.statusText}`);
			}
			const data = await res.json();
			if (data.error) {
				throw new Error(data.error);
			}
			fileContent = data.content || '';
			fileLanguage = getLanguage(path);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load file';
			fileContent = '';
		} finally {
			loading = false;
		}
	}

	const pathParam = page.url.searchParams.get('path');
	if (pathParam) {
		selectFile(pathParam);
	}
</script>

<div class="flex h-full">
	<div class="w-72 border-r border-sidebar-border overflow-auto shrink-0">
		<div class="p-3 border-b border-sidebar-border">
			<h2 class="font-semibold text-sm">Repository Files</h2>
		</div>
		<div class="p-2">
			<FileTree onSelect={selectFile} />
		</div>
	</div>
	<div class="flex-1 overflow-auto">
		{#if loading}
			<div class="p-6 space-y-4">
				<div class="h-5 w-64 bg-muted rounded animate-pulse"></div>
				<div class="h-96 w-full bg-muted rounded animate-pulse"></div>
			</div>
		{:else if error}
			<div class="flex items-center justify-center h-full text-accent-red">
				<div class="text-center">
					<p class="text-4xl mb-3">⚠️</p>
					<p>{error}</p>
				</div>
			</div>
		{:else if selectedFile}
			<div class="px-4 py-2 border-b border-sidebar-border bg-sidebar flex items-center gap-2">
				<span class="text-sm font-mono text-accent-blue">{selectedFile}</span>
			</div>
			{#if selectedFile.endsWith('.md')}
				<MarkdownView content={fileContent} />
			{:else}
				<div class="p-4">
					<CodeViewer content={fileContent} language={fileLanguage} />
				</div>
			{/if}
		{:else}
			<div class="flex items-center justify-center h-full text-muted-foreground">
				<div class="text-center">
					<p class="text-4xl mb-3">📁</p>
					<p>Select a file to view</p>
				</div>
			</div>
		{/if}
	</div>
</div>
