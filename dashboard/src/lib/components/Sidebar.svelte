<script>
	import { page } from '$app/stores';

	const links = [
		{ href: '/', label: 'Overview', icon: '◉' },
		{ href: '/browse', label: 'Files', icon: '📁' },
		{ href: '/architecture', label: 'Architecture', icon: '⬡' },
		{ href: '/memory', label: 'Memory', icon: '◈' },
		{ href: '/timeline', label: 'Timeline', icon: '⟳' },
		{ href: '/health', label: 'Health', icon: '♡' },
		{ href: '/services', label: 'Services', icon: '⚡' }
	];
</script>

<aside class="w-56 bg-sidebar border-r border-sidebar-border flex flex-col shrink-0">
	<div class="p-4 border-b border-sidebar-border">
		<h1 class="text-lg font-bold text-accent-blue">opensheeta</h1>
		<p class="text-xs text-muted-foreground mt-1">Living Repository</p>
	</div>
	<nav class="flex-1 p-2 space-y-1">
		{#each links as link}
			{@const active = $page.url.pathname === link.href || (link.href !== '/' && $page.url.pathname.startsWith(link.href))}
			<a
				href={link.href}
				class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors {active
					? 'bg-sidebar-accent text-accent-blue'
					: 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'}"
			>
				<span class="text-base">{link.icon}</span>
				<span>{link.label}</span>
			</a>
		{/each}
	</nav>
	<div class="p-3 border-t border-sidebar-border">
		<div class="flex items-center justify-between text-xs text-muted-foreground">
			<span>opensheeta</span>
			<span class="text-accent-green">●</span>
		</div>
	</div>
</aside>
