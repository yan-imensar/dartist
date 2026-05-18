<script lang="ts">
	import Button from '$lib/ui/Button.svelte';
	import { createRepositories } from '$lib/db/repositories';
	import { defaultX01Settings } from '$lib/game/x01';
	import type { Match, Player } from '$lib/db/schema';
	import { getActiveMatchStore } from '$lib/stores/active-match.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';

	const repos = createRepositories();
	const store = getActiveMatchStore();

	let players = $state<Player[]>([]);
	let selectedIds = $state<string[]>([]);
	let startingScore = $state<301 | 501>(501);
	let doubleOut = $state(true);
	let loading = $state(true);
	let activeMatch = $state<Match | null>(null);

	onMount(async () => {
		const [list, current] = await Promise.all([
			repos.players.listActive(),
			repos.matches.findActive()
		]);
		players = list;
		activeMatch = current ?? null;
		loading = false;
	});

	function toggle(id: string) {
		selectedIds = selectedIds.includes(id)
			? selectedIds.filter((x) => x !== id)
			: [...selectedIds, id];
	}

	async function startMatch() {
		if (selectedIds.length === 0) return;
		const settings = { ...defaultX01Settings(startingScore), doubleOut };
		await store.start({ mode: 'x01', playerIds: selectedIds, settings });
		const matchId = store.snapshot?.matchId;
		if (matchId) await goto(resolve('/play/[matchId]', { matchId }));
	}

	async function continueActive() {
		if (!activeMatch) return;
		await goto(resolve('/play/[matchId]', { matchId: activeMatch.id }));
	}

	async function discardActive() {
		if (!activeMatch) return;
		await repos.matches.abandon(activeMatch.id);
		if (store.snapshot?.matchId === activeMatch.id) store.clear();
		activeMatch = null;
	}
</script>

<section class="flex flex-col gap-6">
	<header>
		<h1 class="text-2xl font-bold">New match</h1>
	</header>

	{#if activeMatch}
		<aside
			class="flex flex-col gap-3 rounded-2xl border border-accent-500 bg-accent-500/10 p-4"
			aria-label="Active match"
		>
			<div>
				<p class="text-sm font-semibold tracking-wider text-accent-500 uppercase">
					Match in progress
				</p>
				<p class="text-sm text-board-100/70">
					Started {new Date(activeMatch.startedAt ?? activeMatch.createdAt).toLocaleString()}.
				</p>
			</div>
			<div class="flex gap-2">
				<Button onclick={continueActive}>Continue</Button>
				<Button variant="secondary" onclick={discardActive}>Discard</Button>
			</div>
		</aside>
	{/if}

	<fieldset class="flex flex-col gap-2">
		<legend class="text-sm font-semibold tracking-wider text-board-100/70 uppercase">
			Starting score
		</legend>
		<div class="flex gap-2">
			{#each [301, 501] as value (value)}
				<button
					type="button"
					class="flex-1 rounded-lg border px-4 py-3 font-semibold transition {startingScore ===
					value
						? 'border-accent-500 bg-accent-500/10 text-accent-500'
						: 'border-board-700 bg-board-800 text-board-50'}"
					onclick={() => (startingScore = value as 301 | 501)}
				>
					{value}
				</button>
			{/each}
		</div>
	</fieldset>

	<label
		class="flex items-center justify-between rounded-lg border border-board-700 bg-board-800 px-4 py-3"
	>
		<span>
			<span class="font-medium">Double-out</span>
			<span class="block text-xs text-board-100/60">Finish on a double</span>
		</span>
		<input type="checkbox" class="size-5" bind:checked={doubleOut} />
	</label>

	<fieldset class="flex flex-col gap-2">
		<legend class="text-sm font-semibold tracking-wider text-board-100/70 uppercase">
			Players ({selectedIds.length})
		</legend>
		{#if loading}
			<p class="text-sm text-board-100/60">Loading…</p>
		{:else if players.length === 0}
			<p class="text-sm text-board-100/60">
				No players yet.
				<a href={resolve('/players')} class="text-accent-500 underline">Add one</a>.
			</p>
		{:else}
			<ul class="flex flex-col gap-2">
				{#each players as p (p.id)}
					{@const selected = selectedIds.includes(p.id)}
					<li>
						<button
							type="button"
							onclick={() => toggle(p.id)}
							class="flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition {selected
								? 'border-accent-500 bg-accent-500/10'
								: 'border-board-700 bg-board-800'}"
						>
							<span class="font-medium">{p.name}</span>
							{#if selected}
								<span class="text-sm text-accent-500">#{selectedIds.indexOf(p.id) + 1}</span>
							{/if}
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</fieldset>

	<Button size="lg" disabled={selectedIds.length === 0} onclick={startMatch}>Start match</Button>
</section>
