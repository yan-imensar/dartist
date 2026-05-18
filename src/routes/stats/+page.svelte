<script lang="ts">
	import { createRepositories } from '$lib/db/repositories';
	import { computeAllStats } from '$lib/stats/compute';
	import { loadStatsInput } from '$lib/stats/loader';
	import type { Player } from '$lib/db/schema';
	import type { StatsSummary } from '$lib/stats/types';
	import { onMount } from 'svelte';

	const repos = createRepositories();

	let summary = $state<StatsSummary | null>(null);
	let playersById = $state<Record<string, Player>>({});
	let loading = $state(true);

	onMount(async () => {
		const [input, allPlayers] = await Promise.all([
			loadStatsInput(repos),
			repos.players.listActive()
		]);
		summary = computeAllStats(input);
		const map: Record<string, Player> = {};
		for (const p of allPlayers) map[p.id] = p;
		playersById = map;
		loading = false;
	});

	function fmt(value: number, digits = 1): string {
		return value.toFixed(digits);
	}
</script>

<section class="flex flex-col gap-4">
	<header>
		<h1 class="text-2xl font-bold">Stats</h1>
		<p class="text-sm text-board-100/70">Computed from local match history.</p>
	</header>

	{#if loading}
		<p class="text-sm text-board-100/60">Loading…</p>
	{:else if !summary || summary.matchesPlayed === 0}
		<p class="text-sm text-board-100/60">No finished matches yet.</p>
	{:else}
		<dl class="grid grid-cols-2 gap-2">
			<div class="rounded-lg border border-board-700 bg-board-800 px-4 py-3">
				<dt class="text-xs tracking-wider text-board-100/60 uppercase">Matches played</dt>
				<dd class="text-2xl font-bold tabular-nums">{summary.matchesPlayed}</dd>
			</div>
			<div class="rounded-lg border border-board-700 bg-board-800 px-4 py-3">
				<dt class="text-xs tracking-wider text-board-100/60 uppercase">Total turns</dt>
				<dd class="text-2xl font-bold tabular-nums">{summary.totalTurns}</dd>
			</div>
		</dl>

		<h2 class="mt-2 text-sm font-semibold tracking-wider text-board-100/70 uppercase">
			Per player
		</h2>
		<ul class="flex flex-col gap-2">
			{#each summary.perPlayer as ps (ps.playerId)}
				<li class="flex flex-col gap-2 rounded-lg border border-board-700 bg-board-800 p-4">
					<div class="flex items-center justify-between">
						<span class="font-medium">{playersById[ps.playerId]?.name ?? 'Unknown'}</span>
						<span class="text-xs text-board-100/60"
							>{ps.matchesPlayed} match{ps.matchesPlayed === 1 ? '' : 'es'}</span
						>
					</div>
					<dl class="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
						<div class="flex justify-between gap-2">
							<dt class="text-board-100/60">Matches won</dt>
							<dd class="font-semibold tabular-nums">{ps.matchesWon}</dd>
						</div>
						<div class="flex justify-between gap-2">
							<dt class="text-board-100/60">Legs won</dt>
							<dd class="font-semibold tabular-nums">{ps.legsWon}</dd>
						</div>
						<div class="flex justify-between gap-2">
							<dt class="text-board-100/60">Avg / turn</dt>
							<dd class="font-semibold tabular-nums">
								{ps.turnsPlayed === 0 ? '—' : fmt(ps.averageTurnScore)}
							</dd>
						</div>
						<div class="flex justify-between gap-2">
							<dt class="text-board-100/60">Highest turn</dt>
							<dd class="font-semibold tabular-nums">{ps.highestTurn}</dd>
						</div>
						<div class="flex justify-between gap-2">
							<dt class="text-board-100/60">Checkouts</dt>
							<dd class="font-semibold tabular-nums">{ps.checkoutCount}</dd>
						</div>
						<div class="flex justify-between gap-2">
							<dt class="text-board-100/60">Checkout %</dt>
							<dd class="font-semibold tabular-nums">
								{ps.checkoutPercentage === null ? '—' : `${fmt(ps.checkoutPercentage)}%`}
							</dd>
						</div>
					</dl>
				</li>
			{/each}
		</ul>
	{/if}
</section>
