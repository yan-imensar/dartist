<script lang="ts">
	import Button from '$lib/ui/Button.svelte';
	import CheckoutHint from '$lib/ui/CheckoutHint.svelte';
	import RecentTurns from '$lib/ui/RecentTurns.svelte';
	import ScorePanel from '$lib/ui/ScorePanel.svelte';
	import TurnEntry from '$lib/ui/TurnEntry.svelte';
	import { getActiveMatchStore } from '$lib/stores/active-match.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	const store = getActiveMatchStore();
	const matchId = $derived(page.params.matchId);

	let pendingDoubleConfirm = $state<number | null>(null);

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

	$effect(() => {
		if (!matchId) return;
		if (!snapshot || snapshot.matchId !== matchId) {
			goto(resolve('/play'));
		}
	});

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

{#if !snapshot}
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
				{#if currentPlayer}
					<p class="text-sm text-board-100/70">
						Current: <span class="font-semibold text-accent-500">{currentPlayer.name}</span>
					</p>
				{/if}
			</div>
			<Button variant="ghost" size="sm" onclick={() => goto(resolve('/history'))}>Exit</Button>
		</header>

		<ScorePanel
			players={snapshot.players}
			scores={snapshot.scores}
			currentPlayerId={currentPlayer?.id ?? ''}
		/>

		<CheckoutHint score={currentScore} />

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
