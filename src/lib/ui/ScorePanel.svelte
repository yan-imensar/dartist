<script lang="ts">
	import type { ActiveMatchPlayer } from '$lib/game/match-controller';

	type Props = {
		players: ActiveMatchPlayer[];
		scores: Record<string, number>;
		currentPlayerId: string;
	};

	let { players, scores, currentPlayerId }: Props = $props();
</script>

<ul class="grid gap-2" style="grid-template-columns: repeat({Math.min(players.length, 2)}, 1fr);">
	{#each players as p (p.id)}
		{@const active = p.id === currentPlayerId}
		<li
			class="flex flex-col items-center gap-1 rounded-2xl border p-4 transition {active
				? 'border-accent-500 bg-board-800 shadow-lg shadow-accent-500/10'
				: 'border-board-700 bg-board-800/40'}"
			aria-current={active ? 'true' : undefined}
		>
			<span class="text-sm tracking-wider text-board-100/70 uppercase">{p.name}</span>
			<span class="text-5xl font-bold tabular-nums">{scores[p.id]}</span>
		</li>
	{/each}
</ul>
