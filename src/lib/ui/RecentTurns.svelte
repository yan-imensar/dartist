<script lang="ts">
	import type { ActiveTurn } from '$lib/game/match-controller';

	type Props = {
		turns: ActiveTurn[];
		playersById: Record<string, string>;
		limit?: number;
	};

	let { turns, playersById, limit = 5 }: Props = $props();

	const recent = $derived(turns.slice(-limit).reverse());
</script>

{#if recent.length > 0}
	<ol class="flex flex-col gap-1 text-sm">
		{#each recent as t (t.turnIndex)}
			<li
				class="flex items-center justify-between rounded-md bg-board-800/40 px-3 py-2 {t.isBust
					? 'text-danger-500'
					: t.isCheckout
						? 'text-accent-500'
						: 'text-board-100'}"
			>
				<span>{playersById[t.playerId] ?? '?'}</span>
				<span class="font-semibold tabular-nums">
					{t.isBust ? 'BUST' : t.scoreEntered}
				</span>
				<span class="text-board-100/60 tabular-nums">→ {t.scoreAfter}</span>
			</li>
		{/each}
	</ol>
{:else}
	<p class="text-sm text-board-100/50">No turns yet.</p>
{/if}
