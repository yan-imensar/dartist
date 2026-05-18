<script lang="ts">
	import Button from '$lib/ui/Button.svelte';
	import { createRepositories } from '$lib/db/repositories';
	import type { Player } from '$lib/db/schema';
	import { onMount } from 'svelte';

	const repos = createRepositories();

	let players = $state<Player[]>([]);
	let name = $state('');
	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(refresh);

	async function refresh() {
		loading = true;
		try {
			players = await repos.players.listActive();
		} finally {
			loading = false;
		}
	}

	async function addPlayer(event: SubmitEvent) {
		event.preventDefault();
		const trimmed = name.trim();
		if (!trimmed) return;
		try {
			await repos.players.create({ name: trimmed });
			name = '';
			error = null;
			await refresh();
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		}
	}

	async function remove(id: string) {
		await repos.players.softDelete(id);
		await refresh();
	}
</script>

<section class="flex flex-col gap-6">
	<header>
		<h1 class="text-2xl font-bold">Players</h1>
		<p class="text-sm text-board-100/70">Local players are saved on this device.</p>
	</header>

	<form class="flex gap-2" onsubmit={addPlayer}>
		<input
			type="text"
			bind:value={name}
			placeholder="Player name"
			class="flex-1 rounded-lg border border-board-700 bg-board-800 px-3 py-2 text-board-50 placeholder:text-board-100/40 focus:border-accent-500 focus:outline-none"
			maxlength="32"
			required
		/>
		<Button type="submit">Add</Button>
	</form>
	{#if error}
		<p class="text-sm text-danger-500">{error}</p>
	{/if}

	{#if loading}
		<p class="text-sm text-board-100/60">Loading…</p>
	{:else if players.length === 0}
		<p class="text-sm text-board-100/60">No players yet. Add one to start a match.</p>
	{:else}
		<ul class="flex flex-col gap-2">
			{#each players as p (p.id)}
				<li
					class="flex items-center justify-between rounded-lg border border-board-700 bg-board-800 px-4 py-3"
				>
					<span class="font-medium">{p.name}</span>
					<Button variant="ghost" size="sm" onclick={() => remove(p.id)}>Remove</Button>
				</li>
			{/each}
		</ul>
	{/if}
</section>
