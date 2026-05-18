<script lang="ts">
	import Button from '$lib/ui/Button.svelte';
	import CheckoutHint from '$lib/ui/CheckoutHint.svelte';
	import RecentTurns from '$lib/ui/RecentTurns.svelte';
	import ScorePanel from '$lib/ui/ScorePanel.svelte';
	import TurnEntry from '$lib/ui/TurnEntry.svelte';
	import TurnEntryPerDart from '$lib/ui/TurnEntryPerDart.svelte';
	import { getActiveMatchStore } from '$lib/stores/active-match.svelte';
	import { SettingsRepository } from '$lib/settings/repo';
	import { SETTINGS_KEYS, type TurnEntryMode } from '$lib/settings/types';
	import type { DartThrow } from '$lib/game/types';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	const store = getActiveMatchStore();
	const settingsRepo = new SettingsRepository();
	const matchId = $derived(page.params.matchId);

	let pendingDoubleConfirm = $state<number | null>(null);
	let hydrating = $state(true);
	let entryMode = $state<TurnEntryMode>('total');

	const snapshot = $derived(store.snapshot);
	const currentPlayer = $derived.by(() => {
		const s = snapshot;
		if (!s) return null;
		return s.players[s.currentPlayerIndex];
	});
	const currentScore = $derived(snapshot && currentPlayer ? snapshot.scores[currentPlayer.id] : 0);
	const playersById = $derived.by(() => {
		const map: Record<string, string> = {};
		if (snapshot) for (const p of snapshot.players) map[p.id] = p.name;
		return map;
	});

	onMount(async () => {
		const settings = await settingsRepo.loadAll();
		entryMode = settings.turnEntryMode;

		if (!matchId) {
			hydrating = false;
			return;
		}
		if (store.snapshot?.matchId === matchId) {
			hydrating = false;
			return;
		}
		try {
			await store.loadFromDb(matchId);
		} catch {
			await goto(resolve('/play'));
			return;
		} finally {
			hydrating = false;
		}
	});

	async function setEntryMode(mode: TurnEntryMode) {
		entryMode = mode;
		await settingsRepo.set(SETTINGS_KEYS.turnEntryMode, mode);
	}

	async function submit(value: number, confirmDoubleFinish = false) {
		if (!snapshot) return;
		try {
			await store.playTurn({ scoreEntered: value, confirmDoubleFinish });
			pendingDoubleConfirm = null;
		} catch {
			// store.error is exposed in UI
		}
	}

	async function onSubmit(value: number) {
		if (!snapshot || !currentPlayer) return;
		const settings = snapshot.settings;
		const projected = currentScore - value;
		if (settings.doubleOut && projected === 0) {
			pendingDoubleConfirm = value;
			return;
		}
		await submit(value);
	}

	async function onSubmitDarts(darts: DartThrow[]) {
		if (!snapshot) return;
		const value = darts.reduce((sum, d) => sum + d.score, 0);
		try {
			await store.playTurn({ scoreEntered: value, darts });
		} catch {
			// store.error is exposed in UI
		}
	}

	async function onMiss() {
		await submit(0);
	}

	async function onUndo() {
		await store.undoLast();
	}

	async function confirmFinishDouble() {
		if (pendingDoubleConfirm === null) return;
		await submit(pendingDoubleConfirm, true);
	}

	async function rejectFinishDouble() {
		if (pendingDoubleConfirm === null) return;
		await submit(pendingDoubleConfirm, false);
	}
</script>

{#if hydrating || !snapshot}
	<p class="pt-8 text-center text-board-100/70">Loading match…</p>
{:else}
	<section class="flex flex-col gap-4">
		<header class="flex items-center justify-between">
			<div>
				<h1 class="text-xl font-bold">
					{snapshot.settings.startingScore} · {snapshot.players.length} player{snapshot.players
						.length > 1
						? 's'
						: ''}
				</h1>
				<p class="text-sm text-board-100/70">
					{#if (snapshot.settings.bestOfLegs ?? 1) > 1}
						Best of {snapshot.settings.bestOfLegs} · Leg {snapshot.legIndex + 1}
					{:else}
						Single leg
					{/if}
					{#if currentPlayer}
						· Current: <span class="font-semibold text-accent-500">{currentPlayer.name}</span>
					{/if}
				</p>
			</div>
			<Button variant="ghost" size="sm" onclick={() => goto(resolve('/history'))}>Exit</Button>
		</header>

		<ScorePanel
			players={snapshot.players}
			scores={snapshot.scores}
			currentPlayerId={currentPlayer?.id ?? ''}
			legsWon={snapshot.legsWon}
			showLegs={(snapshot.settings.bestOfLegs ?? 1) > 1}
		/>

		<CheckoutHint score={currentScore} />

		{#if snapshot.status === 'active'}
			<div class="flex gap-1 self-end rounded-full bg-board-800 p-1 text-xs">
				{#each [{ id: 'total', label: 'Total' }, { id: 'per-dart', label: 'Per dart' }] as opt (opt.id)}
					<button
						type="button"
						class="rounded-full px-3 py-1 transition {entryMode === opt.id
							? 'bg-accent-500 text-board-900'
							: 'text-board-100/70 hover:text-board-50'}"
						onclick={() => setEntryMode(opt.id as TurnEntryMode)}
						aria-pressed={entryMode === opt.id}
					>
						{opt.label}
					</button>
				{/each}
			</div>
		{/if}

		{#if snapshot.status === 'finished'}
			<div
				class="flex flex-col gap-3 rounded-2xl border border-accent-500 bg-accent-500/10 p-4 text-center"
			>
				<p class="text-lg font-bold text-accent-500">
					🏆 {playersById[snapshot.winnerPlayerId ?? ''] ?? 'Winner'} wins!
				</p>
				<div class="flex gap-2">
					<Button variant="secondary" onclick={onUndo}>Undo</Button>
					<Button onclick={() => goto(resolve('/history'))}>Done</Button>
				</div>
			</div>
		{:else if pendingDoubleConfirm !== null}
			<div
				class="flex flex-col gap-3 rounded-2xl border border-accent-500 bg-board-800 p-4 text-center"
			>
				<p class="text-sm">
					Did you finish on a double for <span class="font-bold">{pendingDoubleConfirm}</span>?
				</p>
				<div class="grid grid-cols-2 gap-2">
					<Button variant="secondary" onclick={rejectFinishDouble}>No (bust)</Button>
					<Button onclick={confirmFinishDouble}>Yes (checkout)</Button>
				</div>
			</div>
		{:else if entryMode === 'per-dart'}
			<TurnEntryPerDart
				disabled={store.busy}
				maxDarts={snapshot.settings.maxDartsPerTurn ?? 3}
				onsubmit={onSubmitDarts}
				onmiss={onMiss}
				onundo={onUndo}
			/>
		{:else}
			<TurnEntry disabled={store.busy} onsubmit={onSubmit} onmiss={onMiss} onundo={onUndo} />
		{/if}

		{#if store.error}
			<p class="text-sm text-danger-500" role="alert">{store.error}</p>
		{/if}

		<section class="flex flex-col gap-2">
			<h2 class="text-sm font-semibold tracking-wider text-board-100/70 uppercase">Recent turns</h2>
			<RecentTurns turns={snapshot.turns} {playersById} />
		</section>
	</section>
{/if}
