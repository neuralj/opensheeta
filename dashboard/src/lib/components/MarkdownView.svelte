<script lang="ts">
	import { onMount } from 'svelte';

	let { content = '' }: { content?: string } = $props();

	let rendered = $state('');

	onMount(async () => {
		if (!content) return;
		try {
			const marked = await import('marked');
			rendered = await marked.marked.parse(content);
		} catch {
			rendered = '';
		}
	});
</script>

{#if rendered}
	<div class="markdown-body px-6 py-4">{@html rendered}</div>
{:else}
	<pre class="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 overflow-auto font-mono">{content}</pre>
{/if}

<style>
	.markdown-body :global(h1) { font-size: 1.75rem; font-weight: 700; margin: 1.5rem 0 1rem; color: var(--color-foreground); }
	.markdown-body :global(h2) { font-size: 1.5rem; font-weight: 600; margin: 1.25rem 0 0.75rem; color: var(--color-foreground); border-bottom: 1px solid var(--color-border); padding-bottom: 0.3rem; }
	.markdown-body :global(h3) { font-size: 1.25rem; font-weight: 600; margin: 1rem 0 0.5rem; color: var(--color-foreground); }
	.markdown-body :global(p) { margin: 0.75rem 0; line-height: 1.7; color: var(--color-muted-foreground); }
	.markdown-body :global(code) { background: var(--color-muted); padding: 0.15rem 0.4rem; border-radius: 0.25rem; font-size: 0.875em; font-family: var(--font-mono); }
	.markdown-body :global(pre) { background: var(--color-muted); padding: 1rem; border-radius: 0.5rem; overflow-x: auto; margin: 1rem 0; }
	.markdown-body :global(pre code) { background: none; padding: 0; border-radius: 0; }
	.markdown-body :global(blockquote) { border-left: 3px solid var(--color-accent-blue); padding-left: 1rem; margin: 1rem 0; color: var(--color-muted-foreground); }
	.markdown-body :global(ul), .markdown-body :global(ol) { padding-left: 1.5rem; margin: 0.75rem 0; color: var(--color-muted-foreground); }
	.markdown-body :global(li) { margin: 0.3rem 0; }
	.markdown-body :global(table) { width: 100%; border-collapse: collapse; margin: 1rem 0; }
	.markdown-body :global(th), .markdown-body :global(td) { border: 1px solid var(--color-border); padding: 0.5rem 0.75rem; text-align: left; }
	.markdown-body :global(th) { background: var(--color-muted); font-weight: 600; }
	.markdown-body :global(a) { color: var(--color-accent-blue); text-decoration: underline; }
	.markdown-body :global(hr) { border: none; border-top: 1px solid var(--color-border); margin: 1.5rem 0; }
	.markdown-body :global(img) { max-width: 100%; border-radius: 0.5rem; }
</style>
