<script lang="ts">
	import { createRepositories } from '$lib/db/repositories';
	import type { Match, Player } from '$lib/db/schema';
	import { onMount } from 'svelte';

	const repos = createRepositories();

	let matches = $state<Match[]>([]);
	let playersById = $state<Record<string, Player>>({});
	let loading = $state(true);

	onMount(async () => {
		matches = await repos.matches.listFinished();
		const ids: string[] = [];
		for (const m of matches) {
			if (m.winnerPlayerId && !ids.includes(m.winnerPlayerId)) ids.push(m.winnerPlayerId);
		}
		const found = await Promise.all(ids.map((id) => repos.players.get(id)));
		const map: Record<string, Player> = {};
		for (const p of found) if (p) map[p.id] = p;
		playersById = map;
		loading = false;
	});

	function formatDate(iso: string | null): string {
		if (!iso) return '';
		return new Date(iso).toLocaleString();
	}
</script>

<section class="flex flex-col gap-4">
	<header>
		<h1 class="text-2xl font-bold">History</h1>
	</header>

	{#if loading}
		<p class="text-sm text-board-100/60">Loading…</p>
	{:else if matches.length === 0}
		<p class="text-sm text-board-100/60">No finished matches yet.</p>
	{:else}
		<ul class="flex flex-col gap-2">
			{#each matches as m (m.id)}
				<li class="flex flex-col gap-1 rounded-lg border border-board-700 bg-board-800 px-4 py-3">
					<div class="flex items-center justify-between">
						<span class="font-medium">
							{('startingScore' in m.settings ? m.settings.startingScore : '') || 'X01'}
						</span>
						<span class="text-xs text-board-100/60">{formatDate(m.finishedAt)}</span>
					</div>
					{#if m.winnerPlayerId}
						<span class="text-sm text-accent-500">
							Winner: {playersById[m.winnerPlayerId]?.name ?? 'Unknown'}
						</span>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</section>
