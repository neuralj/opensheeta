<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	interface ServiceInfo {
		name: string;
		status: 'running' | 'stopped' | 'not_loaded';
		port: number;
		pid: number | null;
		logPath: string;
		logTail: string[];
	}

	let services: ServiceInfo[] = $state([]);
	let loading = $state(true);
	let refreshInterval: ReturnType<typeof setInterval> | null = null;

	async function fetchServices() {
		try {
			const res = await fetch('/api/services');
			const data = await res.json();
			services = data.services;
		} catch (e) {
			console.error('Failed to fetch services:', e);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		fetchServices();
		refreshInterval = setInterval(fetchServices, 5000);
	});

	onDestroy(() => {
		if (refreshInterval) clearInterval(refreshInterval);
	});

	function getStatusColor(status: string): string {
		switch (status) {
			case 'running': return 'text-accent-green';
			case 'stopped': return 'text-accent-yellow';
			case 'not_loaded': return 'text-accent-red';
			default: return 'text-muted-foreground';
		}
	}

	function getStatusDot(status: string): string {
		switch (status) {
			case 'running': return 'bg-accent-green';
			case 'stopped': return 'bg-accent-yellow';
			case 'not_loaded': return 'bg-accent-red';
			default: return 'bg-muted-foreground';
		}
	}
</script>

<div class="p-6 space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-foreground">Services</h1>
			<p class="text-sm text-muted-foreground mt-1">
				{services.length} service{services.length !== 1 ? 's' : ''} configured
			</p>
		</div>
		<button onclick={fetchServices} class="px-3 py-1.5 rounded-lg bg-card border border-border text-sm hover:bg-muted transition-colors">
			Refresh
		</button>
	</div>

	{#if loading && services.length === 0}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			{#each [1, 2] as _}
				<div class="bg-card border border-border rounded-xl p-4 animate-pulse">
					<div class="h-6 bg-muted rounded w-1/3 mb-3"></div>
					<div class="h-4 bg-muted rounded w-1/2 mb-2"></div>
					<div class="h-4 bg-muted rounded w-1/4"></div>
				</div>
			{/each}
		</div>
	{:else if services.length === 0}
		<div class="flex flex-col items-center justify-center h-64 text-muted-foreground">
			<span class="text-4xl mb-3">⚡</span>
			<p>No services configured</p>
			<p class="text-xs mt-1">Add plist files to scripts/ directory</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			{#each services as service}
				<div class="bg-card border border-border rounded-xl p-4">
					<div class="flex items-center justify-between mb-3">
						<div class="flex items-center gap-2">
							<span class="w-2.5 h-2.5 rounded-full {getStatusDot(service.status)}"></span>
							<h2 class="text-lg font-semibold text-foreground">{service.name}</h2>
						</div>
						<span class="px-2 py-0.5 rounded-full text-xs {getStatusColor(service.status)} bg-muted">
							{service.status}
						</span>
					</div>

					<div class="grid grid-cols-2 gap-4 text-sm mb-3">
						<div>
							<span class="text-muted-foreground">Port:</span>
							<span class="ml-2 font-mono text-foreground">{service.port}</span>
						</div>
						<div>
							<span class="text-muted-foreground">PID:</span>
							<span class="ml-2 font-mono text-foreground">{service.pid ?? '-'}</span>
						</div>
					</div>

					{#if service.logTail.length > 0}
						<div class="mt-3">
							<div class="text-xs text-muted-foreground mb-1">Recent logs</div>
							<pre class="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2 max-h-32 overflow-auto font-mono">{service.logTail.join('\n')}</pre>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	<div class="bg-card border border-border rounded-xl p-4 mt-6">
		<h2 class="text-sm font-semibold text-foreground mb-2">Service Management</h2>
		<p class="text-xs text-muted-foreground mb-3">
			Use the CLI to manage services:
		</p>
		<pre class="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 font-mono">scripts/services status          # View all services
scripts/services start           # Start all services
scripts/services stop            # Stop all services
scripts/services restart         # Restart all services
scripts/services logs &lt;name&gt;    # Tail service logs
scripts/services build &lt;name&gt;   # Build service</pre>
	</div>
</div>
