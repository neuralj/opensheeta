<script lang="ts">
	import { onMount } from 'svelte';

	let { content = '', language = 'text' }: { content?: string; language?: string } = $props();

	let highlighted = $state('');

	onMount(async () => {
		if (!content) return;
		try {
			const shiki = await import('shiki');
			const highlighter = await shiki.createHighlighter({
				themes: ['github-dark-default'],
				langs: ['typescript', 'javascript', 'json', 'yaml', 'bash', 'python', 'go', 'html', 'css', 'sql', 'xml', 'dockerfile', 'toml', 'rust', 'scss', 'svelte', 'tsx', 'jsx']
			});
			highlighted = highlighter.codeToHtml(content, {
				lang: language,
				theme: 'github-dark-default'
			});
		} catch {
			highlighted = '';
		}
	});

	function escapeHtml(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}
</script>

{#if highlighted}
	<div class="rounded-lg overflow-hidden">
		{@html highlighted}
	</div>
{:else}
	<pre class="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 overflow-auto font-mono leading-relaxed">{escapeHtml(content)}</pre>
{/if}
